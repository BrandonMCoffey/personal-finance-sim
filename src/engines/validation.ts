import type { Account, AccountType, Income, TransferRule, Goal, WinConditions, Expense, Card, Loan, Retirement, Insurance } from "../store/financeStore";
import { calculateIncomeTaxes } from "../store/financeStore";
import { generateForecast } from "./forecast";

export interface ValidationReport {
	passed: boolean;
	score: number;
	feedback: string[];
	contextualHint?: string;
}

export function evaluatePlan(
	accounts: Account[],
	incomes: Income[],
	transferRules: TransferRule[],
	goals: Goal[],
	expenses: Expense[],
	cards: Card[],
	loans: Loan[],
	retirements: Retirement[],
	winConditions: WinConditions | null,
	insurances: Insurance[] = [],
	inflationRate: number = 0,
	forecastMonths: number = 6,
	initialAccountTypes?: AccountType[]
): ValidationReport {
	const feedback: string[] = [];
	let score = 100;
	let contextualHint: string | undefined = undefined;

	if (!winConditions) return { passed: false, score: 0, feedback: ["No win conditions found for this level."] };

	// 1. Check Required Accounts
	if (winConditions.requiredAccounts) {
		const existingTypes = accounts.map((a) => a.type);
		winConditions.requiredAccounts.forEach((reqType) => {
			const wasPreOpened = initialAccountTypes ? initialAccountTypes.includes(reqType) : false;
			if (!existingTypes.includes(reqType)) {
				score -= 20;
				feedback.push(`Missing account type: You need to open a ${reqType} account.`);
				if (!contextualHint) contextualHint = `Open a ${reqType} account from the Actions menu.`;
			} else if (!wasPreOpened) {
				feedback.push(`Great job opening a ${reqType} account.`);
			}
		});
	}

	// 2. Check Tax Allocations (Ensure player is not budgeting gross income)
	incomes.forEach((income) => {
		const { totalTax, netAmount } = calculateIncomeTaxes(income.amount, income.taxRate, income.taxDeductions);
		let totalAllocated = 0;
		if (income.routings) {
			income.routings.forEach((route, idx) => {
				if (idx === income.routings!.length - 1) return;
				const intended = route.type === "fixed" ? route.amount : netAmount * (route.amount / 100);
				totalAllocated += intended;
			});
		}

		if (totalAllocated > netAmount + 0.01) {
			score -= 20;
			feedback.push(
				`Over-Allocation Warning: "${income.name}" has gross pay of $${income.amount.toFixed(0)}, but taxes and deductions withhold $${totalTax.toFixed(2)}, leaving $${netAmount.toFixed(2)} net take-home pay. You cannot budget gross pay.`
			);
			if (!contextualHint)
				contextualHint = `Adjust your routings from "${income.name}" so total outflows do not exceed your net pay ($${netAmount.toFixed(2)}).`;
		}
	});

	// 3. Check Goals & Inflation Drag
	goals.forEach((goal) => {
		const isConnected = transferRules.some((r) => r.destinationId === goal.id);
		const isMandatoryGoal = winConditions.goalsFundedWithinMonths?.goalId === goal.id;

		if (!isConnected && !isMandatoryGoal) {
			feedback.push(`Goal Deprioritized: "${goal.name}" was disconnected to prioritize core financial stability.`);
			return;
		}

		const configuredGoalDeadline =
			isMandatoryGoal ? winConditions.goalsFundedWithinMonths!.months : goal.targetMonths;

		if (configuredGoalDeadline) {
			const forecast = generateForecast(
				accounts,
				incomes,
				transferRules,
				goals,
				expenses,
				cards,
				loans,
				retirements,
				configuredGoalDeadline,
				insurances,
				inflationRate
			);
			const finalSnapshot = forecast[forecast.length - 1];
			const finalAmount = finalSnapshot?.goalProgress[goal.id] || 0;

			// Check if goal was funded using an account beating inflation
			let lowYieldSources: (Account | undefined)[] = [];
			if (inflationRate > 0) {
				const attachedRules = transferRules.filter((r) => r.destinationId === goal.id);
				lowYieldSources = attachedRules
					.map((r) => accounts.find((a) => a.id === r.sourceId))
					.filter((a) => a && a.apy < inflationRate);

				if (lowYieldSources.length > 0) {
					score = Math.min(score - 45, 50);
					const sourceNames = lowYieldSources.map((a) => a!.name).join(", ");
					feedback.push(
						`Inflation Drag: Goal "${goal.name}" is funded from ${sourceNames} which yields less than the ${inflationRate}% inflation rate. Real purchasing power is decaying.`
					);
					if (!contextualHint)
						contextualHint = `To beat ${inflationRate}% inflation, route your savings for "${goal.name}" into an investment or high-yield account with APY >= ${inflationRate}%.`;
				} else if (attachedRules.length > 0) {
					feedback.push(`Inflation Protected: "${goal.name}" is funded via an account that outpaces ${inflationRate}% inflation!`);
				}
			}

			const hasInflationLoss = inflationRate > 0 && lowYieldSources.length > 0;
			if (finalAmount >= goal.targetAmount && !hasInflationLoss) {
				const hitMonth = finalSnapshot?.goalHitMonths[goal.id];
				if (hitMonth && hitMonth < configuredGoalDeadline) {
					score += 10;
					feedback.push(`Excellent: You reached $${goal.targetAmount} for "${goal.name}" early in Month ${hitMonth}! (+10 pts)`);
				} else {
					feedback.push(`Success: You reached $${goal.targetAmount} for "${goal.name}" within ${configuredGoalDeadline} months!`);
				}
			} else if (!hasInflationLoss) {
				score -= 30;
				feedback.push(`Missed Timeline: "${goal.name}" only reached $${finalAmount.toFixed(2)} out of $${goal.targetAmount}.`);
				if (!contextualHint)
					contextualHint = `You missed the target for ${goal.name}. Ensure you are routing funds directly into the goal node, and check if upstream expenses are eating the balance before it reaches the goal.`;
			}
		}
	});

	// 4. Check Card Expenses (Checking accounts imply debit cards; cash cannot pay card expenses)
	expenses.forEach((exp) => {
		if (exp.requiresCard) {
			const fundingRule = transferRules.find((r) => r.destinationId === exp.id);
			if (fundingRule) {
				const sourceAcc = accounts.find((a) => a.id === fundingRule.sourceId);
				if (sourceAcc && sourceAcc.type === "cash") {
					score -= 15;
					feedback.push(`Payment Error: "${exp.name}" requires a Debit or Credit Card, and cannot be paid with cash.`);
					if (!contextualHint)
						contextualHint = `Link "${exp.name}" to a checking account (which uses a debit card) or a credit card.`;
				}
			}
		}
	});

	// 5. Check Expense Funding (Both Fixed & Variable)
	const expenseForecast = generateForecast(accounts, incomes, transferRules, goals, expenses, cards, loans, retirements, forecastMonths, insurances, inflationRate);
	let allExpensesFunded = true;

	expenses.forEach((expense) => {
		const baseAmount = expense.defaultAmount !== undefined ? expense.defaultAmount : expense.amount;
		const isConnected =
			transferRules.some((r) => r.destinationId === expense.id) ||
			incomes.some((inc) => inc.routings?.some((r) => r.destinationId === expense.id));

		if (!isConnected && (!expense.isFixed || expense.isCancelable)) {
			feedback.push(`Expense Reduction: "${expense.name}" ($${baseAmount.toFixed(0)}/mo) was disconnected / canceled.`);
			return;
		}

		if (expense.isFixed) {
			const violation = expenseForecast.find(
				(snapshot) => snapshot.activeExpenses[expense.id] && (snapshot.expenseProgress[expense.id] ?? 0) < baseAmount - 0.01
			);
			if (violation) {
				allExpensesFunded = false;
				score = Math.min(score - 45, 50);
				const actual = violation.expenseProgress[expense.id] ?? 0;
				feedback.push(
					`Unpaid Fixed Expense: "${expense.name}" ($${baseAmount.toFixed(0)}) was not fully paid in Month ${violation.month} (received only $${actual.toFixed(2)}). Mandatory living expenses must be 100% funded.`
				);
				if (!contextualHint) {
					contextualHint = `Route funds from your checking account or card to cover "${expense.name}" ($${baseAmount.toFixed(0)}/mo) in full.`;
				}
			}
		} else {
			const targetMin = expense.minValue !== undefined ? expense.minValue : baseAmount;
			const violation = expenseForecast.find(
				(snapshot) => snapshot.activeExpenses[expense.id] && (snapshot.expenseProgress[expense.id] ?? 0) < targetMin - 0.01
			);
			if (violation) {
				allExpensesFunded = false;
				score -= 15;
				const actual = violation.expenseProgress[expense.id] ?? 0;
				feedback.push(
					`Minimum Funding Warning: "${expense.name}" falls below its $${targetMin.toFixed(2)} minimum in Month ${violation.month}, receiving only $${actual.toFixed(2)}.`
				);
				if (!contextualHint) {
					contextualHint = `You aren't allocating enough to ${expense.name}. Adjust the percentages in your Output Editor to ensure the minimum threshold is met.`;
				}
			}
		}
	});

	if (allExpensesFunded && expenses.length > 0) {
		feedback.push("Good habit: All living expenses and bills were successfully funded without default.");
	}

	// 6. Optimal Debt Routing Validation (Snowball vs. Avalanche)
	const month1 = expenseForecast[0];
	if (winConditions.optimalDebtRouting) {
		const strategy = winConditions.optimalDebtRouting;
		const allDebts = [
			...cards.filter((c) => c.type === "credit").map((c) => ({
				id: c.id,
				name: c.name,
				balance: c.balance,
				apr: c.apr || 0,
				minimumPayment: c.minimumPayment !== undefined ? c.minimumPayment : (c.balance > 0 ? Math.min(c.balance, Math.max(25, c.balance * 0.025)) : 0)
			})),
			...loans.map((l) => ({
				id: l.id,
				name: l.name,
				balance: l.balance,
				apr: l.apr,
				minimumPayment: l.minimumPayment
			}))
		].filter((d) => d.balance > 0);

		if (allDebts.length > 0) {
			const getPaymentToDebt = (debtId: string) => month1?.debtPayments?.[debtId] || 0;

			// Check 1: Mandatory Minimum Payment Enforcement
			let missedMinimum = false;
			allDebts.forEach((debt) => {
				const payment = getPaymentToDebt(debt.id);
				if (payment < debt.minimumPayment - 0.01) {
					missedMinimum = true;
					score = Math.min(score - 45, 50);
					feedback.push(
						`Missing Minimum Payment: "${debt.name}" received only $${payment.toFixed(2)}, which is below its mandatory minimum of $${debt.minimumPayment.toFixed(2)}.`
					);
					if (!contextualHint)
						contextualHint = `You must always satisfy mandatory minimum payments ($${debt.minimumPayment.toFixed(0)}) across all debts to prevent default penalties.`;
				}
			});

			if (!missedMinimum && allDebts.length > 1) {
				feedback.push("Good habit: Satisfied mandatory minimums across all active debt liabilities.");
			}

			// Check 2: Optimal Target Prioritization
			if (allDebts.length > 1) {
				const sortedDebts = [...allDebts].sort((a, b) => (strategy === "avalanche" ? b.apr - a.apr : a.balance - b.balance));
				const optimalTarget = sortedDebts[0];

				const surplusPaymentsToNonTargets = allDebts.filter((d) => {
					if (d.id === optimalTarget.id) return false;
					const p = getPaymentToDebt(d.id);
					return p > d.minimumPayment + 0.01;
				});

				const optimalTargetSurplus = Math.max(0, getPaymentToDebt(optimalTarget.id) - optimalTarget.minimumPayment);

				if (surplusPaymentsToNonTargets.length > 0) {
					score = Math.min(score - 45, 50);
					const formattedStrategy = strategy === "avalanche" ? "Debt Avalanche (Highest APR first)" : "Debt Snowball (Lowest Balance first)";
					const targetCriteria = strategy === "avalanche" ? `highest APR (${optimalTarget.apr}%)` : `lowest balance ($${optimalTarget.balance})`;

					feedback.push(
						`Suboptimal Debt Strategy: Under the ${formattedStrategy} method, 100% of extra surplus must be funneled into "${optimalTarget.name}" (${targetCriteria}).`
					);
					if (!contextualHint)
						contextualHint = `Pay only the mandatory minimums on secondary debts and route 100% of your remaining surplus payment to "${optimalTarget.name}".`;
				} else if (!missedMinimum && optimalTargetSurplus > 0) {
					score = Math.min(100, score + 10);
					feedback.push(`Excellent: You correctly prioritized "${optimalTarget.name}" using the ${strategy} method! (+10 pts)`);
				}
			}
		}
	}

	// 6b. Debt Reduction Targets (maxDebtBalance & debtPaidOff)
	if (winConditions.maxDebtBalance !== undefined) {
		const finalSnapshot = expenseForecast[expenseForecast.length - 1];
		let totalEndingDebt = 0;
		cards.filter((c) => c.type === "credit").forEach((c) => {
			totalEndingDebt += finalSnapshot?.cardBalances[c.id] || 0;
		});
		loans.forEach((l) => {
			totalEndingDebt += finalSnapshot?.loanBalances[l.id] || 0;
		});

		if (totalEndingDebt > winConditions.maxDebtBalance + 0.01) {
			score = Math.min(score - 45, 50);
			feedback.push(
				`Debt Reduction Target Missed: Ending total debt of $${totalEndingDebt.toFixed(2)} exceeds the target ceiling of $${winConditions.maxDebtBalance.toFixed(2)}.`
			);
			if (!contextualHint)
				contextualHint = `Allocate more monthly surplus toward paying down your debt principal to reach the target balance.`;
		} else {
			feedback.push(`Debt Goal Achieved: Total remaining debt reduced to $${totalEndingDebt.toFixed(2)} (target: <= $${winConditions.maxDebtBalance.toFixed(2)}).`);
		}
	}

	if (winConditions.debtPaidOff && winConditions.debtPaidOff.length > 0) {
		const finalSnapshot = expenseForecast[expenseForecast.length - 1];
		winConditions.debtPaidOff.forEach((debtId) => {
			const card = cards.find((c) => c.id === debtId);
			const loan = loans.find((l) => l.id === debtId);
			const endingBal = card ? (finalSnapshot?.cardBalances[debtId] || 0) : (finalSnapshot?.loanBalances[debtId] || 0);
			const debtName = card?.name || loan?.name || debtId;

			if (endingBal > 0.01) {
				score = Math.min(score - 45, 50);
				feedback.push(`Debt Unresolved: "${debtName}" was not completely paid off (remaining balance: $${endingBal.toFixed(2)}).`);
				if (!contextualHint)
					contextualHint = `Increase your monthly payment to "${debtName}" so it reaches a $0 balance within the simulation timeframe.`;
			} else {
				feedback.push(`Congratulations: "${debtName}" is completely paid off! ($0 balance)`);
			}
		});
	}

	// 6c. Retirement Employer Match
	if (winConditions.requireRetirementMatch) {
		const finalSnapshot = expenseForecast[expenseForecast.length - 1];
		retirements.forEach((ret) => {
			if (ret.employerMatchPercent > 0) {
				const matchEarned = finalSnapshot?.retirementEmployerMatch[ret.id] || 0;
				if (matchEarned <= 0.01) {
					score = Math.min(score - 45, 50);
					feedback.push(`Missed Free Money: You did not contribute to "${ret.name}" to capture the ${ret.employerMatchPercent}% employer match.`);
					if (!contextualHint)
						contextualHint = `Route at least ${ret.employerMatchPercent}% of your income into "${ret.name}" to receive the full company match.`;
				} else {
					feedback.push(`Maximized Benefits: Captured +$${matchEarned.toFixed(2)} in employer 401(k) match ("free money")!`);
				}
			}
		});
	}

	// 6d. Minimum Retirement Balance
	if (winConditions.minRetirementBalance !== undefined) {
		const finalSnapshot = expenseForecast[expenseForecast.length - 1];
		let totalRetirement = 0;
		retirements.forEach((r) => {
			totalRetirement += finalSnapshot?.retirementBalances[r.id] || 0;
		});
		if (totalRetirement < winConditions.minRetirementBalance - 0.01) {
			score = Math.min(score - 45, 50);
			feedback.push(
				`Retirement Savings Target Missed: Ending balance of $${totalRetirement.toFixed(2)} is below the target threshold of $${winConditions.minRetirementBalance.toFixed(2)}.`
			);
			if (!contextualHint)
				contextualHint = `Increase your monthly allocation to retirement accounts to hit the target balance.`;
		} else {
			feedback.push(`Retirement Target Met: Accumulated $${totalRetirement.toFixed(2)} (target: >= $${winConditions.minRetirementBalance.toFixed(2)}).`);
		}
	}

	// 7. Insurance Coverage & Sudden Expense Risk Mitigation
	if (insurances.length > 0 || winConditions.requireInsuranceCoverage) {
		const month1 = expenseForecast[0];
		insurances.forEach((ins) => {
			const isCovered = month1?.insuranceCoverage[ins.id] ?? false;
			if (isCovered) {
				feedback.push(`Risk Protected: "${ins.name}" policy is active ($${ins.premium}/mo premium met).`);
			} else {
				score = Math.min(score - 45, 50);
				feedback.push(`Uninsured Risk: "${ins.name}" is inactive because the $${ins.premium} monthly premium was not paid.`);
				if (!contextualHint)
					contextualHint = `Route funds to cover the $${ins.premium} premium for "${ins.name}" to protect against catastrophic sudden expenses.`;
			}
		});

		// Check sudden expenses
		expenses
			.filter((e) => e.occurrenceMonth)
			.forEach((exp) => {
				const snap = expenseForecast.find((s) => s.month === exp.occurrenceMonth);
				const coveredAmount = snap?.insuranceCoveredAmounts[exp.id] || 0;
				if (coveredAmount > 0) {
					feedback.push(
						`Insurance Saved You Money: In Month ${exp.occurrenceMonth}, your active policy absorbed $${coveredAmount.toFixed(0)} of "${exp.name}", capping your expense at the deductible!`
					);
				} else if (snap && insurances.length > 0 && !snap.insuranceCoverage[insurances[0].id]) {
					score = Math.min(score - 45, 50);
					feedback.push(
						`Costly Exposure: When "${exp.name}" struck in Month ${exp.occurrenceMonth}, having no active insurance forced you to absorb the entire $${exp.amount.toFixed(0)} cost.`
					);
				}
			});
	}

	// 8. Physical Cash Accumulation Validation
	if (winConditions.maxCashBalance !== undefined) {
		const cashAccounts = accounts.filter((a) => a.type === "cash");
		const incomeToCash = incomes.some((inc) => inc.routings?.some((route) => cashAccounts.some((c) => c.id === route.destinationId)));
		const transferToCash = transferRules.some((rule) => cashAccounts.some((c) => c.id === rule.destinationId));
		if (incomeToCash || transferToCash) {
			score -= 20;
			feedback.push(
				`Risk Warning: You are routing incoming money into physical cash. In the modern world, incoming funds should be secured directly into a bank account.`
			);
		}
		const sweepForecast = generateForecast(accounts, incomes, transferRules, goals, expenses, cards, loans, retirements, 1, insurances, inflationRate);
		const finalCash = cashAccounts.reduce((sum, acc) => sum + (sweepForecast[0]?.accountBalances[acc.id] || 0), 0);
		if (finalCash > winConditions.maxCashBalance) {
			score -= 20;
			feedback.push(`Unsecured Funds: You have $${finalCash.toFixed(2)} left as physical cash. Connect it to a bank account to deposit it securely.`);
		} else if (cashAccounts.length > 0 && finalCash <= winConditions.maxCashBalance) {
			feedback.push(`Good habit: You successfully deposited physical cash into a secure account.`);
		}
	}

	// 9. Overdraft Protection
	let overdraftFound = false;
	expenseForecast.forEach((snap) => {
		Object.entries(snap.accountBalances).forEach(([accId, balance]) => {
			if (balance < -0.01 && !overdraftFound) {
				const accName = accounts.find((a) => a.id === accId)?.name || "An account";
				score = Math.min(score - 45, 50);
				feedback.push(`Overdraft Error: Your plan causes "${accName}" to drop into the negative.`);
				if (!contextualHint)
					contextualHint = `Your ${accName} is overdrafting. Convert fixed dollar ($) outputs into percentages (%) so you never spend more than the account actually holds.`;
				overdraftFound = true;
			}
		});
	});

	const finalScore = Math.max(0, score);
	return { passed: finalScore >= 60, score: finalScore, feedback, contextualHint };
}

