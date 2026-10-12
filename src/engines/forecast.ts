import type { Account, Income, TransferRule, Goal, Expense, Card, Loan, Retirement, Insurance } from "../store/financeStore";
import { calculateIncomeTaxes } from "../store/financeStore";

export interface MonthlySnapshot {
	month: number;
	accountBalances: Record<string, number>;
	realAccountBalances: Record<string, number>;
	accountFlows: Record<string, { in: number; out: number }>;
	accountGoalAllocations: Record<string, number>;
	cardBalances: Record<string, number>;
	loanBalances: Record<string, number>;
	retirementBalances: Record<string, number>;
	goalProgress: Record<string, number>;
	realGoalProgress: Record<string, number>;
	expenseProgress: Record<string, number>;
	activeExpenses: Record<string, boolean>;
	insuranceCoverage: Record<string, boolean>;
	insuranceCoveredAmounts: Record<string, number>;
	goalHitMonths: Record<string, number>;
	accountInterestEarned: Record<string, number>;
	cardInterestPaid: Record<string, number>;
	loanInterestPaid: Record<string, number>;
	retirementEmployerMatch: Record<string, number>;
	incomeTaxesPaid: Record<string, number>;
	inflationDrag: Record<string, number>;
	debtPayments: Record<string, number>;
}

export function generateForecast(
	accounts: Account[],
	incomes: Income[],
	transferRules: TransferRule[],
	goals: Goal[],
	expenses: Expense[],
	cards: Card[],
	loans: Loan[] = [],
	retirements: Retirement[] = [],
	monthsToProject: number = 6,
	insurances: Insurance[] = [],
	inflationRate: number = 0
): MonthlySnapshot[] {
	const snapshots: MonthlySnapshot[] = [];

	let currentBalances: Record<string, number> = {};
	let currentCardBalances: Record<string, number> = {};
	let currentLoanBalances: Record<string, number> = {};
	let currentRetirementBalances: Record<string, number> = {};
	let currentGoalEarmarks: Record<string, number> = {};
	let goalHitMonths: Record<string, number> = {};
	let goalProgress: Record<string, number> = {};

	// Cumulative Trackers
	let cumAccInterest: Record<string, number> = {};
	let cumCardInterest: Record<string, number> = {};
	let cumLoanInterest: Record<string, number> = {};
	let cumRetMatch: Record<string, number> = {};
	let cumTaxesPaid: Record<string, number> = {};
	let cumInflationDrag: Record<string, number> = {};

	goals.forEach((g) => {
		goalProgress[g.id] = 0;
	});
	accounts.forEach((acc) => {
		currentBalances[acc.id] = acc.balance;
		currentGoalEarmarks[acc.id] = 0;
		cumAccInterest[acc.id] = 0;
		cumInflationDrag[acc.id] = 0;
	});
	cards.forEach((card) => {
		currentCardBalances[card.id] = card.balance || 0;
		cumCardInterest[card.id] = 0;
	});
	loans.forEach((loan) => {
		currentLoanBalances[loan.id] = loan.balance;
		cumLoanInterest[loan.id] = 0;
	});
	retirements.forEach((ret) => {
		currentRetirementBalances[ret.id] = ret.balance;
		cumRetMatch[ret.id] = 0;
	});
	incomes.forEach((inc) => {
		cumTaxesPaid[inc.id] = 0;
	});

	transferRules.forEach((rule) => {
		const sourceAcc = accounts.find((a) => a.id === rule.sourceId);
		const destAcc = accounts.find((a) => a.id === rule.destinationId);
		if (sourceAcc?.type === "cash" && destAcc && destAcc.type !== "cash") {
			const depositAmount = currentBalances[rule.sourceId] || 0;
			currentBalances[rule.destinationId] = (currentBalances[rule.destinationId] || 0) + depositAmount;
			currentBalances[rule.sourceId] = 0;
		}
	});

	for (let m = 1; m <= monthsToProject; m++) {
		const nextBalances = { ...currentBalances };
		const nextCardBalances = { ...currentCardBalances };
		const nextLoanBalances = { ...currentLoanBalances };
		const nextRetirementBalances = { ...currentRetirementBalances };
		const monthlyGoalEarmarks = { ...currentGoalEarmarks };
		const monthlyExpenseProgress: Record<string, number> = {};
		const activeExpenses: Record<string, boolean> = {};
		const monthlyFlows: Record<string, { in: number; out: number }> = {};
		const monthlyInsuranceCoverage: Record<string, boolean> = {};
		const monthlyInsuranceCoveredAmounts: Record<string, number> = {};
		const monthlyInsuranceContributions: Record<string, number> = {};
		const monthlyDebtPayments: Record<string, number> = {};

		cards.forEach((c) => (monthlyDebtPayments[c.id] = 0));
		loans.forEach((l) => (monthlyDebtPayments[l.id] = 0));

		const monthlyAccInterest = { ...cumAccInterest };
		const monthlyCardInterest = { ...cumCardInterest };
		const monthlyLoanInterest = { ...cumLoanInterest };
		const monthlyRetMatch = { ...cumRetMatch };
		const monthlyTaxesPaid = { ...cumTaxesPaid };
		const monthlyInflationDrag = { ...cumInflationDrag };

		// Track insurance premium funding
		insurances.forEach((ins) => {
			monthlyInsuranceContributions[ins.id] = 0;
			// Calculate incoming transfer rules to insurance
			const directTransfer = transferRules
				.filter((r) => r.destinationId === ins.id)
				.reduce((sum, r) => {
					if (r.type === "fixed") return sum + r.amount;
					const src = accounts.find((a) => a.id === r.sourceId);
					return sum + (src ? Math.max(0, src.balance) * (r.amount / 100) : 0);
				}, 0);
			const incomeTransfer = incomes
				.flatMap((inc) => {
					const { netAmount } = calculateIncomeTaxes(inc.amount, inc.taxRate, inc.taxDeductions);
					return (inc.routings || []).map((r) => ({ netAmount, r }));
				})
				.filter(({ r }) => r.destinationId === ins.id)
				.reduce((sum, { netAmount, r }) => sum + (r.type === "fixed" ? r.amount : netAmount * (r.amount / 100)), 0);

			const totalPremiumFunding = directTransfer + incomeTransfer;
			monthlyInsuranceCoverage[ins.id] = totalPremiumFunding >= ins.premium - 0.01;
		});

		// Determine effective expense requirements (accounting for insurance deductible capping on occurrence months)
		const effectiveExpenseTargets: Record<string, number> = {};
		const effectiveExpenseMaxes: Record<string, number> = {};
		expenses.forEach((e) => {
			let isActive = true;
			if (e.occurrenceMonth && m !== e.occurrenceMonth) isActive = false;
			if (e.frequency && (m - 1) % e.frequency !== 0) isActive = false;

			activeExpenses[e.id] = isActive;
			monthlyExpenseProgress[e.id] = 0;
			monthlyInsuranceCoveredAmounts[e.id] = 0;

			const baseAmt = e.defaultAmount !== undefined ? e.defaultAmount : e.amount;
			let targetAmount = baseAmt;
			const maxAmount = e.maxAmount !== undefined ? e.maxAmount : baseAmt * 1.5;
			let effectiveMax = maxAmount;

			if (isActive && e.occurrenceMonth && m === e.occurrenceMonth) {
				const coveringPolicy = insurances.find(
					(ins) =>
						monthlyInsuranceCoverage[ins.id] &&
						(!ins.coveredExpenseIds || ins.coveredExpenseIds.length === 0 || ins.coveredExpenseIds.includes(e.id))
				);
				if (coveringPolicy) {
					targetAmount = Math.min(e.amount, coveringPolicy.deductible);
					effectiveMax = Math.min(maxAmount, coveringPolicy.deductible);
					monthlyInsuranceCoveredAmounts[e.id] = Math.max(0, e.amount - coveringPolicy.deductible);
				}
			}
			effectiveExpenseTargets[e.id] = targetAmount;
			effectiveExpenseMaxes[e.id] = effectiveMax;
		});

		accounts.forEach((a) => {
			monthlyFlows[a.id] = { in: 0, out: 0 };
		});

		const applyTransfer = (destId: string, amount: number, sourceIsIncome = false): number => {
			if (nextBalances[destId] !== undefined) {
				nextBalances[destId] += amount;
				monthlyFlows[destId].in += amount;
				return amount;
			} else if (nextLoanBalances[destId] !== undefined) {
				const currentOwed = Math.max(0, nextLoanBalances[destId]);
				const accepted = Math.min(amount, currentOwed);
				nextLoanBalances[destId] = currentOwed - accepted;
				monthlyDebtPayments[destId] = (monthlyDebtPayments[destId] || 0) + accepted;
				return accepted;
			} else if (nextCardBalances[destId] !== undefined) {
				const currentOwed = Math.max(0, nextCardBalances[destId]);
				const accepted = Math.min(amount, currentOwed);
				nextCardBalances[destId] = currentOwed - accepted;
				monthlyDebtPayments[destId] = (monthlyDebtPayments[destId] || 0) + accepted;
				return accepted;
			} else if (nextRetirementBalances[destId] !== undefined) {
				const retirement = retirements.find((r) => r.id === destId);
				let matchAmount = 0;
				if (sourceIsIncome && retirement?.employerMatchPercent && (!retirement.type || retirement.type === "401k")) {
					matchAmount = amount * (retirement.employerMatchPercent / 100);
				}
				nextRetirementBalances[destId] += amount + matchAmount;
				monthlyRetMatch[destId] += matchAmount;
				return amount;
			} else if (monthlyExpenseProgress[destId] !== undefined) {
				const isActive = activeExpenses[destId];
				const maxAllowed = effectiveExpenseMaxes[destId] ?? effectiveExpenseTargets[destId] ?? 0;
				const needed = isActive ? Math.max(0, maxAllowed - monthlyExpenseProgress[destId]) : 0;
				const accepted = Math.min(amount, needed);
				monthlyExpenseProgress[destId] += accepted;
				return accepted;
			} else if (insurances.some((i) => i.id === destId)) {
				monthlyInsuranceContributions[destId] = (monthlyInsuranceContributions[destId] || 0) + amount;
				return amount;
			}
			return 0;
		};

		// 1. Process Income with Granular Tax Deductions
		incomes.forEach((income) => {
			const { totalTax, netAmount } = calculateIncomeTaxes(income.amount, income.taxRate, income.taxDeductions);
			monthlyTaxesPaid[income.id] += totalTax;
			let available = netAmount;

			if (income.routings && income.routings.length > 0) {
				income.routings.forEach((route, idx) => {
					const isLast = idx === income.routings!.length - 1;
					const isSingle = income.routings!.length === 1;
					let intended =
						isSingle && route.isAuto
							? (route.type === "percentage" ? netAmount * (route.amount / 100) : Math.max(0, available))
							: isLast && !route.isAuto
							? Math.max(0, available)
							: route.type === "fixed"
							? route.amount
							: netAmount * (route.amount / 100);
					const acceptedAmount = Math.max(0, Math.min(intended, available));
					const accepted = applyTransfer(route.destinationId, acceptedAmount, true);
					available -= accepted;
				});
			}
		});

		// 2. Process Transfers & Card Spending
		transferRules.forEach((rule) => {
			const isGoal = goals.some((g) => g.id === rule.destinationId);
			if (isGoal) return;

			const sourceCard = cards.find((c) => c.id === rule.sourceId);
			const destCard = cards.find((c) => c.id === rule.destinationId);

			if (sourceCard) {
				const transferAmount = rule.amount;
				if (sourceCard.type === "debit" && nextBalances[sourceCard.linkedAccountId] !== undefined) {
					nextBalances[sourceCard.linkedAccountId] -= transferAmount;
					monthlyFlows[sourceCard.linkedAccountId].out += transferAmount;
					applyTransfer(rule.destinationId, transferAmount);
				} else if (sourceCard.type === "credit") {
					nextCardBalances[sourceCard.id] += transferAmount;
					applyTransfer(rule.destinationId, transferAmount);
				}
			} else {
				const sourceBal = nextBalances[rule.sourceId];
				if (sourceBal === undefined) return;

				const outgoingRules = transferRules.filter(
					(r) => r.sourceId === rule.sourceId && !goals.some((g) => g.id === r.destinationId)
				);
				const isSingleRule = outgoingRules.length === 1;
				const isLastRule = outgoingRules[outgoingRules.length - 1]?.id === rule.id;
				const available = Math.max(0, sourceBal);

				let transferAmount = 0;

				if (destCard && destCard.type === "credit") {
					const currentOwed = Math.max(0, nextCardBalances[destCard.id]);
					const method = rule.paymentMethod;

					if (rule.isAuto || method === "statement") {
						transferAmount = Math.min(available, currentOwed);
					} else if (method === "minimum") {
						const minPay = destCard.minimumPayment || Math.min(currentOwed, Math.max(25, currentOwed * 0.025));
						transferAmount = Math.min(available, Math.min(currentOwed, minPay));
					} else if (method === "custom") {
						const intended =
							rule.type === "fixed" ? rule.amount : available * (rule.amount / 100);
						transferAmount = Math.min(available, Math.min(currentOwed, intended));
					} else {
						// Fallback if paymentMethod is undefined: respect explicit rule.amount if non-zero, otherwise statement
						if (rule.amount !== undefined && rule.amount > 0) {
							const intended =
								rule.type === "fixed" ? rule.amount : available * (rule.amount / 100);
							transferAmount = Math.min(available, Math.min(currentOwed, intended));
						} else {
							transferAmount = Math.min(available, currentOwed);
						}
					}
				} else if (rule.isAuto) {
					const destAcc = accounts.find((a) => a.id === rule.destinationId);
					const destLoan = loans.find((l) => l.id === rule.destinationId);
					const destExp = expenses.find((e) => e.id === rule.destinationId);

					if (destLoan) {
						const currentOwed = Math.max(0, nextLoanBalances[destLoan.id]);
						transferAmount = Math.min(available, currentOwed);
					} else if (destExp) {
						const maxAllowed = effectiveExpenseMaxes[destExp.id] ?? effectiveExpenseTargets[destExp.id] ?? 0;
						const needed = activeExpenses[destExp.id] ? Math.max(0, maxAllowed - (monthlyExpenseProgress[destExp.id] || 0)) : 0;
						transferAmount = Math.min(available, needed);
					} else if (destAcc) {
						if (isSingleRule || isLastRule || destAcc.type === "savings" || destAcc.type === "brokerage") {
							transferAmount = available;
						} else {
							const childSum = expenses
								.filter((e) => transferRules.some((r) => r.sourceId === destAcc.id && r.destinationId === e.id))
								.reduce((sum, e) => sum + (e.defaultAmount ?? e.amount), 0);
							transferAmount = childSum > 0 ? Math.min(available, childSum) : available;
						}
					} else {
						transferAmount = available;
					}
				} else {
					transferAmount =
						rule.type === "fixed"
							? rule.amount
							: available * (rule.amount / 100);
				}

				if (transferAmount > 0) {
					if (destCard && destCard.type === "credit") {
						const currentOwed = Math.max(0, nextCardBalances[destCard.id]);
						const accepted = Math.min(transferAmount, currentOwed);
						nextCardBalances[destCard.id] -= accepted;
						monthlyDebtPayments[destCard.id] = (monthlyDebtPayments[destCard.id] || 0) + accepted;
						nextBalances[rule.sourceId] -= accepted;
						monthlyFlows[rule.sourceId].out += accepted;
					} else {
						const accepted = applyTransfer(rule.destinationId, transferAmount);
						nextBalances[rule.sourceId] -= accepted;
						monthlyFlows[rule.sourceId].out += accepted;
					}
				}
			}
		});

		// Continuous sweep for cash accounts deposited into checking/bank accounts
		transferRules.forEach((rule) => {
			const sourceAcc = accounts.find((a) => a.id === rule.sourceId);
			const destAcc = accounts.find((a) => a.id === rule.destinationId);
			if (sourceAcc?.type === "cash" && destAcc && destAcc.type !== "cash") {
				const remCash = nextBalances[rule.sourceId] || 0;
				if (remCash > 0) {
					nextBalances[rule.destinationId] = (nextBalances[rule.destinationId] || 0) + remCash;
					monthlyFlows[rule.destinationId].in += remCash;
					nextBalances[rule.sourceId] = 0;
					monthlyFlows[rule.sourceId].out += remCash;
				}
			}
		});

		// 3. Process Interest
		accounts.forEach((acc) => {
			if (acc.apy > 0 && nextBalances[acc.id] > 0) {
				const interest = nextBalances[acc.id] * (acc.apy / 100 / 12);
				nextBalances[acc.id] += interest;
				monthlyFlows[acc.id].in += interest;
				monthlyAccInterest[acc.id] += interest;
			}
		});

		cards.forEach((card) => {
			if (card.type === "credit" && card.apr && card.apr > 0 && nextCardBalances[card.id] > 0) {
				const interest = nextCardBalances[card.id] * (card.apr / 100 / 12);
				nextCardBalances[card.id] += interest;
				monthlyCardInterest[card.id] += interest;
			}
		});

		loans.forEach((loan) => {
			if (nextLoanBalances[loan.id] > 0) {
				const interest = nextLoanBalances[loan.id] * (loan.apr / 100 / 12);
				nextLoanBalances[loan.id] += interest;
				monthlyLoanInterest[loan.id] += interest;
			}
		});

		retirements.forEach((ret) => {
			if (nextRetirementBalances[ret.id] > 0 && ret.expectedApy > 0) {
				nextRetirementBalances[ret.id] += nextRetirementBalances[ret.id] * (ret.expectedApy / 100 / 12);
			}
		});

		// 4. Process Goals
		accounts.forEach((acc) => {
			const attachedRules = transferRules.filter((r) => r.sourceId === acc.id && goals.some((g) => g.id === r.destinationId));
			let availableBalance = Math.max(0, nextBalances[acc.id] - monthlyGoalEarmarks[acc.id]);

			attachedRules.forEach((rule) => {
				const goal = goals.find((g) => g.id === rule.destinationId)!;
				const remainingGoal = Math.max(0, goal.targetAmount - goalProgress[goal.id]);
				const intended = rule.type === "fixed" ? rule.amount : availableBalance * (rule.amount / 100);
				const allocated = Math.min(availableBalance, remainingGoal, intended);

				goalProgress[goal.id] += allocated;
				availableBalance -= allocated;
				monthlyGoalEarmarks[acc.id] += allocated;
			});

			monthlyGoalEarmarks[acc.id] = Math.min(monthlyGoalEarmarks[acc.id], Math.max(0, nextBalances[acc.id]));
		});

		goals.forEach((goal) => {
			if (goalProgress[goal.id] >= goal.targetAmount && !goalHitMonths[goal.id]) {
				goalHitMonths[goal.id] = m;
			}
		});

		// 5. Process Inflation Mechanics (Purchasing Power Drag)
		const realBalances: Record<string, number> = {};
		const realGoalProgress: Record<string, number> = {};

		if (inflationRate > 0) {
			const monthlyInflationDragRate = (inflationRate / 100) / 12;
			accounts.forEach((acc) => {
				if (acc.type === "cash" || (acc.type === "checking" && (acc.apy || 0) <= 0.01)) {
					const drag = Math.max(0, nextBalances[acc.id]) * monthlyInflationDragRate;
					monthlyInflationDrag[acc.id] = (monthlyInflationDrag[acc.id] || 0) + drag;
				}
				realBalances[acc.id] = Math.max(0, nextBalances[acc.id] - (monthlyInflationDrag[acc.id] || 0));
			});

			goals.forEach((goal) => {
				const attachedRules = transferRules.filter((r) => goals.some((g) => g.id === r.destinationId));
				const isFundedFromBeatingInflation = attachedRules.every((r) => {
					const src = accounts.find((a) => a.id === r.sourceId);
					return src && src.apy >= inflationRate;
				});

				if (isFundedFromBeatingInflation && attachedRules.length > 0) {
					realGoalProgress[goal.id] = goalProgress[goal.id];
				} else {
					const cumulativeDiscount = Math.pow(1 - monthlyInflationDragRate, m);
					realGoalProgress[goal.id] = goalProgress[goal.id] * cumulativeDiscount;
				}
			});
		} else {
			accounts.forEach((acc) => {
				realBalances[acc.id] = nextBalances[acc.id];
			});
			goals.forEach((goal) => {
				realGoalProgress[goal.id] = goalProgress[goal.id];
			});
		}

		snapshots.push({
			month: m,
			accountBalances: nextBalances,
			realAccountBalances: realBalances,
			accountFlows: monthlyFlows,
			accountGoalAllocations: { ...monthlyGoalEarmarks },
			cardBalances: nextCardBalances,
			loanBalances: nextLoanBalances,
			retirementBalances: nextRetirementBalances,
			goalProgress: { ...goalProgress },
			realGoalProgress: { ...realGoalProgress },
			expenseProgress: { ...monthlyExpenseProgress },
			activeExpenses: { ...activeExpenses },
			insuranceCoverage: { ...monthlyInsuranceCoverage },
			insuranceCoveredAmounts: { ...monthlyInsuranceCoveredAmounts },
			goalHitMonths: { ...goalHitMonths },
			accountInterestEarned: { ...monthlyAccInterest },
			cardInterestPaid: { ...monthlyCardInterest },
			loanInterestPaid: { ...monthlyLoanInterest },
			retirementEmployerMatch: { ...monthlyRetMatch },
			incomeTaxesPaid: { ...monthlyTaxesPaid },
			inflationDrag: { ...monthlyInflationDrag },
			debtPayments: { ...monthlyDebtPayments }
		});

		currentBalances = nextBalances;
		currentCardBalances = nextCardBalances;
		currentLoanBalances = nextLoanBalances;
		currentRetirementBalances = nextRetirementBalances;
		currentGoalEarmarks = monthlyGoalEarmarks;

		cumAccInterest = monthlyAccInterest;
		cumCardInterest = monthlyCardInterest;
		cumLoanInterest = monthlyLoanInterest;
		cumRetMatch = monthlyRetMatch;
		cumTaxesPaid = monthlyTaxesPaid;
		cumInflationDrag = monthlyInflationDrag;
	}

	return snapshots;
}

