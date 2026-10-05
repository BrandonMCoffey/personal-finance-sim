import type { Account, Income, TransferRule, Goal, Expense, Card, Loan, Retirement } from "../store/financeStore";

export interface MonthlySnapshot {
	month: number;
	accountBalances: Record<string, number>;
	accountFlows: Record<string, { in: number; out: number }>;
	accountGoalAllocations: Record<string, number>;
	cardBalances: Record<string, number>;
	loanBalances: Record<string, number>;
	retirementBalances: Record<string, number>;
	goalProgress: Record<string, number>;
	expenseProgress: Record<string, number>;
	activeExpenses: Record<string, boolean>;
	goalHitMonths: Record<string, number>;
	accountInterestEarned: Record<string, number>;
	cardInterestPaid: Record<string, number>;
	loanInterestPaid: Record<string, number>;
	retirementEmployerMatch: Record<string, number>;
	incomeTaxesPaid: Record<string, number>;
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
	monthsToProject: number = 6
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

	goals.forEach((g) => {
		goalProgress[g.id] = 0;
	});
	accounts.forEach((acc) => {
		currentBalances[acc.id] = acc.balance;
		currentGoalEarmarks[acc.id] = 0;
		cumAccInterest[acc.id] = 0;
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
		if (accounts.some((a) => a.id === rule.sourceId) && accounts.some((a) => a.id === rule.destinationId)) {
			const depositAmount = currentBalances[rule.sourceId];
			currentBalances[rule.destinationId] += depositAmount;
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

		const monthlyAccInterest = { ...cumAccInterest };
		const monthlyCardInterest = { ...cumCardInterest };
		const monthlyLoanInterest = { ...cumLoanInterest };
		const monthlyRetMatch = { ...cumRetMatch };
		const monthlyTaxesPaid = { ...cumTaxesPaid };

		expenses.forEach((e) => {
			let isActive = true;
			if (e.occurrenceMonth && m !== e.occurrenceMonth) isActive = false;
			if (e.frequency && (m - 1) % e.frequency !== 0) isActive = false;

			activeExpenses[e.id] = isActive;
			monthlyExpenseProgress[e.id] = 0;
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
				nextLoanBalances[destId] -= amount;
				return amount;
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
				const expense = expenses.find((e) => e.id === destId)!;
				const isActive = activeExpenses[destId];
				const needed = isActive ? Math.max(0, expense.amount - monthlyExpenseProgress[destId]) : 0;
				const accepted = Math.min(amount, needed);
				monthlyExpenseProgress[destId] += accepted;
				return accepted;
			}
			return 0;
		};

		// 1. Process Income
		incomes.forEach((income) => {
			let taxAmount = income.taxRate ? income.amount * (income.taxRate / 100) : 0;
			monthlyTaxesPaid[income.id] += taxAmount;
			let available = income.amount - taxAmount;

			if (income.routings && income.routings.length > 0) {
				income.routings.forEach((route, idx) => {
					const isLast = idx === income.routings!.length - 1;
					let intended = isLast ? Math.max(0, available) : route.type === "fixed" ? route.amount : income.amount * (route.amount / 100);
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

				let transferAmount = rule.type === "fixed" ? rule.amount : Math.max(0, sourceBal) * (rule.amount / 100);
				if (transferAmount > 0) {
					nextBalances[rule.sourceId] -= transferAmount;
					monthlyFlows[rule.sourceId].out += transferAmount;
					if (destCard && destCard.type === "credit") nextCardBalances[destCard.id] -= transferAmount;
					else applyTransfer(rule.destinationId, transferAmount);
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

		snapshots.push({
			month: m,
			accountBalances: nextBalances,
			accountFlows: monthlyFlows,
			accountGoalAllocations: { ...monthlyGoalEarmarks },
			cardBalances: nextCardBalances,
			loanBalances: nextLoanBalances,
			retirementBalances: nextRetirementBalances,
			goalProgress: { ...goalProgress },
			expenseProgress: { ...monthlyExpenseProgress },
			activeExpenses: { ...activeExpenses },
			goalHitMonths: { ...goalHitMonths },
			accountInterestEarned: { ...monthlyAccInterest },
			cardInterestPaid: { ...monthlyCardInterest },
			loanInterestPaid: { ...monthlyLoanInterest },
			retirementEmployerMatch: { ...monthlyRetMatch },
			incomeTaxesPaid: { ...monthlyTaxesPaid }
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
	}

	return snapshots;
}
