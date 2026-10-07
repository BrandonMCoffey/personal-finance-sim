import { create } from "zustand";

// --- Type Definitions ---
export type AccountType = "cash" | "checking" | "savings" | "credit" | "bank" | "brokerage";

export interface AllowedActions {
	canCreateAccounts: boolean;
	canDeleteAccounts: boolean;
	allowedAccountTypes: AccountType[];
	maxNewAccounts?: number;
	allowedCardTypes?: ("debit" | "credit")[];
}

export interface Account {
	id: string;
	name: string;
	type: AccountType;
	balance: number;
	apy: number;
}

export interface Card {
	id: string;
	name: string;
	type: "debit" | "credit";
	linkedAccountId: string;
	balance: number;
	limit?: number;
	apr?: number;
}

export interface Loan {
	id: string;
	name: string;
	balance: number;
	apr: number;
	minimumPayment: number;
}

export interface Retirement {
	id: string;
	name: string;
	type?: "401k" | "roth_ira" | "traditional_ira";
	balance: number;
	expectedApy: number;
	employerMatchPercent: number;
}

export interface IncomeRoute {
	destinationId: string;
	amount: number;
	type: "fixed" | "percentage";
	isAuto?: boolean;
}

export interface Income {
	id: string;
	name: string;
	amount: number;
	taxRate?: number;
	frequency: string;
	routings: IncomeRoute[];
}

export interface Goal {
	id: string;
	name: string;
	targetAmount: number;
	targetMonths?: number;
}

export interface TransferRule {
	id: string;
	sourceId: string;
	destinationId: string;
	amount: number;
	type: "fixed" | "percentage";
	isAuto?: boolean;
}

export interface Client {
	name: string;
	description: string;
	prompt: string;
	portraitId: string;
}

export interface Expense {
	id: string;
	name: string;
	amount: number;
	isFixed: boolean;
	minValue?: number;
	requiresCard?: boolean;
	frequency?: number;
	occurrenceMonth?: number;
}

export interface WinConditions {
	requiredAccounts?: AccountType[];
	maxCashBalance?: number;
	goalsFundedWithinMonths?: {
		goalId: string;
		months: number;
	};
	routingRules?: {
		type: string;
		description: string;
	}[];
	optimalDebtRouting?: "avalanche" | "snowball";
}

// --- Store Interface ---
interface FinanceState {
	currentScreen: "main_menu" | "levels" | "story" | "endless" | "game";
	levelScores: Record<number, number>;
	isAllUnlocked: boolean;
	levelId: number | null;
	category: string;
	hints: string[];
	client: Client | null;
	expenses: Expense[];
	accounts: Account[];
	cards: Card[];
	loans: Loan[];
	retirements: Retirement[];
	incomes: Income[];
	goals: Goal[];
	transferRules: TransferRule[];
	winConditions: WinConditions | null;
	forecastMonths: number;
	allowedActions: AllowedActions | null;
	initialAccountCount: number;

	setCurrentScreen: (screen: "main_menu" | "levels" | "story" | "endless" | "game") => void;
	saveLevelScore: (levelId: number, score: number) => void;
	unlockAllLevels: () => void;
	clearProgress: () => void;
	loadLevel: (levelData: any) => void;

	addAccount: (name: string, type: AccountType) => void;
	renameAccount: (accountId: string, newName: string) => void;
	removeAccount: (accountId: string) => void;
	addCard: (name: string, type: "debit" | "credit", linkedAccountId: string) => void;
	removeCard: (cardId: string) => void;
	updateCardLink: (cardId: string, accountId: string) => void;
	addLoan: (name: string, balance: number, apr: number, minimumPayment: number) => void;
	addRetirement: (name: string, balance: number, expectedApy: number, employerMatchPercent: number) => void;

	addIncomeRoute: (incomeId: string, destinationId: string, defaultAmount?: number, defaultType?: "fixed" | "percentage", isAuto?: boolean) => void;
	updateIncomeRoute: (incomeId: string, destinationId: string, amount: number, type: "fixed" | "percentage", isAuto?: boolean) => void;

	removeIncomeRoute: (incomeId: string, destinationId: string) => void;
	reorderIncomeRoutes: (incomeId: string, startIndex: number, endIndex: number) => void;

	addTransferRule: (sourceId: string, destinationId: string, amount?: number, type?: "fixed" | "percentage", isAuto?: boolean) => void;
	updateTransferRule: (ruleId: string, amount: number, type: "fixed" | "percentage", isAuto?: boolean) => void;
	removeTransferRule: (ruleId: string) => void;
	reorderTransferRules: (sourceId: string, startIndex: number, endIndex: number) => void;

	addExpense: (
		name: string,
		amount: number,
		isFixed: boolean,
		options?: { minValue?: number; requiresCard?: boolean; frequency?: number; occurrenceMonth?: number }
	) => void;
	addIncome: (name: string, amount: number, taxRate: number, frequency: string) => void;
	applyTimeSkip: (newState: any) => void;
}

// --- Zustand Implementation ---
export const useFinanceStore = create<FinanceState>()((set) => ({
	currentScreen: "main_menu",
	levelScores: JSON.parse(localStorage.getItem("finance_scores") || "{}"),
	isAllUnlocked: localStorage.getItem("finance_unlocked") === "true",

	levelId: null,
	category: "budgeting",
	hints: [],
	client: null,
	expenses: [],
	accounts: [],
	cards: [],
	loans: [],
	retirements: [],
	incomes: [],
	goals: [],
	transferRules: [],
	winConditions: null,
	forecastMonths: 6,
	allowedActions: null,
	initialAccountCount: 0,

	setCurrentScreen: (screen) => set({ currentScreen: screen }),

	saveLevelScore: (levelId, score) =>
		set((state) => {
			const currentHigh = state.levelScores[levelId] || 0;
			const newScores = { ...state.levelScores, [levelId]: Math.max(currentHigh, score) };
			localStorage.setItem("finance_scores", JSON.stringify(newScores));
			return { levelScores: newScores };
		}),

	unlockAllLevels: () =>
		set(() => {
			localStorage.setItem("finance_unlocked", "true");
			return { isAllUnlocked: true };
		}),

	clearProgress: () =>
		set(() => {
			localStorage.removeItem("finance_scores");
			localStorage.removeItem("finance_unlocked");
			return { levelScores: {}, isAllUnlocked: false };
		}),

	loadLevel: (levelData: any) =>
		set((_) => {
			const rawAccounts = levelData.startingState?.accounts || [];
			const isChecking = (destId: string) => rawAccounts.some((a: any) => a.id === destId && a.type === "checking");

			return {
				levelId: levelData.levelId,
				category: levelData.category || "budgeting",
				hints: levelData.hints || [],
				client: levelData.client || null,
				expenses: (levelData.startingState?.expenses || []).map((exp: any) => ({
					...exp,
					requiresCard: exp.requiresCard || false,
					frequency: exp.frequency || 1,
					occurrenceMonth: exp.occurrenceMonth
				})),
				accounts: rawAccounts,
				cards: levelData.startingState?.cards || [],
				loans: levelData.startingState?.loans || [],
				retirements: (levelData.startingState?.retirements || []).map((ret: any) => ({
					...ret,
					type: ret.type || "401k"
				})),
				incomes: (levelData.startingState?.income || []).map((inc: any) => ({
					...inc,
					taxRate: inc.taxRate || 0,
					routings: inc.routings
						? inc.routings.map((r: any) => ({
								destinationId: r.destinationId,
								amount: r.percentage || r.amount || 10,
								type: r.type || "percentage",
								isAuto: r.isAuto !== undefined ? r.isAuto : isChecking(r.destinationId)
							}))
						: []
				})),
				goals: levelData.startingState?.goals || [],
				transferRules: (levelData.startingState?.transferRules || []).map((rule: any) => ({
					...rule,
					isAuto: rule.isAuto !== undefined ? rule.isAuto : isChecking(rule.destinationId)
				})),
				winConditions: levelData.winConditions || null,
				forecastMonths: levelData.forecastMonths || 6,
				allowedActions: levelData.allowedActions || null,
				initialAccountCount: rawAccounts.length || 0
			};
		}),

	addAccount: (name, type) =>
		set((state) => ({
			accounts: [
				...state.accounts,
				{
					id: `acc_${Date.now()}`,
					name,
					type,
					balance: 0,
					apy: type === "savings" ? 2.5 : 0
				}
			]
		})),

	renameAccount: (accountId, newName) =>
		set((state) => ({
			accounts: state.accounts.map((a) => (a.id === accountId ? { ...a, name: newName } : a))
		})),

	removeAccount: (accountId) =>
		set((state) => {
			if (!state.allowedActions?.canDeleteAccounts) {
				const initialAccountIds = state.accounts.slice(0, state.initialAccountCount).map((a) => a.id);
				if (initialAccountIds.includes(accountId)) return state;
			}

			return {
				accounts: state.accounts.filter((a) => a.id !== accountId),
				transferRules: state.transferRules.filter((r) => r.sourceId !== accountId && r.destinationId !== accountId),
				incomes: state.incomes.map((inc) => ({
					...inc,
					routings: inc.routings?.filter((r) => r.destinationId !== accountId)
				}))
			};
		}),

	addCard: (name, type, linkedAccountId) =>
		set((state) => ({
			cards: [
				...state.cards,
				{
					id: `card_${Date.now()}`,
					name,
					type,
					linkedAccountId,
					balance: 0,
					limit: type === "credit" ? 5000 : undefined,
					apr: type === "credit" ? 19.99 : 0
				}
			]
		})),

	removeCard: (cardId) =>
		set((state) => ({
			cards: state.cards.filter((c) => c.id !== cardId),
			transferRules: state.transferRules.filter((r) => r.destinationId !== cardId && r.sourceId !== cardId)
		})),

	updateCardLink: (cardId, accountId) =>
		set((state) => ({
			cards: state.cards.map((c) => (c.id === cardId ? { ...c, linkedAccountId: accountId } : c))
		})),

	addLoan: (name, balance, apr, minimumPayment) =>
		set((state) => ({
			loans: [...state.loans, { id: `loan_${Date.now()}`, name, balance, apr, minimumPayment }]
		})),

	addRetirement: (name, balance, expectedApy, employerMatchPercent) =>
		set((state) => ({
			retirements: [...state.retirements, { id: `ret_${Date.now()}`, name, balance, expectedApy, employerMatchPercent }]
		})),

	// --- INCOME ACTIONS ---
	addIncomeRoute: (incomeId, destinationId, defaultAmount = 10, defaultType = "percentage", isAuto = false) =>
		set((state) => ({
			incomes: state.incomes.map((income) => {
				if (income.id !== incomeId) return income;

				const existing = income.routings || [];
				if (existing.find((r) => r.destinationId === destinationId)) return income;

				if (defaultType === "fixed") {
					return {
						...income,
						routings: [{ destinationId, amount: defaultAmount, type: "fixed", isAuto }, ...existing]
					};
				}

				const newCount = existing.length + 1;
				const split = Math.floor(100 / newCount);
				const updatedPrior = existing.map((r) => (r.type === "percentage" && !r.isAuto ? { ...r, amount: split } : r));
				return {
					...income,
					routings: [...updatedPrior, { destinationId, amount: split, type: "percentage", isAuto }]
				};
			})
		})),

	updateIncomeRoute: (incomeId, destinationId, amount, type, isAuto) =>
		set((state) => ({
			incomes: state.incomes.map((income) => {
				if (income.id !== incomeId || !income.routings) return income;
				return {
					...income,
					routings: income.routings.map((r) =>
						r.destinationId === destinationId ? { ...r, amount, type, isAuto: isAuto !== undefined ? isAuto : r.isAuto } : r
					)
				};
			})
		})),

	removeIncomeRoute: (incomeId, destinationId) =>
		set((state) => ({
			incomes: state.incomes.map((income) => {
				if (income.id !== incomeId) return income;
				return {
					...income,
					routings: (income.routings || []).filter((r) => r.destinationId !== destinationId)
				};
			})
		})),

	reorderIncomeRoutes: (incomeId, startIndex, endIndex) =>
		set((state) => ({
			incomes: state.incomes.map((income) => {
				if (income.id !== incomeId || !income.routings) return income;
				const newRoutings = Array.from(income.routings);
				const [moved] = newRoutings.splice(startIndex, 1);
				newRoutings.splice(endIndex, 0, moved);
				return { ...income, routings: newRoutings };
			})
		})),

	// --- TRANSFER ACTIONS ---
	addTransferRule: (sourceId, destinationId, amount = 10, type = "percentage", isAuto = false) =>
		set((state) => {
			if (state.transferRules.find((r) => r.sourceId === sourceId && r.destinationId === destinationId)) {
				return { transferRules: state.transferRules };
			}
			return {
				transferRules: [...state.transferRules, { id: `rule_${Date.now()}`, sourceId, destinationId, amount, type, isAuto }]
			};
		}),

	updateTransferRule: (ruleId, amount, type, isAuto) =>
		set((state) => ({
			transferRules: state.transferRules.map((rule) =>
				rule.id === ruleId ? { ...rule, amount, type, isAuto: isAuto !== undefined ? isAuto : rule.isAuto } : rule
			)
		})),

	removeTransferRule: (ruleId) =>
		set((state) => ({
			transferRules: state.transferRules.filter((rule) => rule.id !== ruleId)
		})),

	reorderTransferRules: (sourceId, startIndex, endIndex) =>
		set((state) => {
			const sourceRules = state.transferRules.filter((r) => r.sourceId === sourceId);
			const otherRules = state.transferRules.filter((r) => r.sourceId !== sourceId);

			const newSourceRules = Array.from(sourceRules);
			const [moved] = newSourceRules.splice(startIndex, 1);
			newSourceRules.splice(endIndex, 0, moved);

			return { transferRules: [...otherRules, ...newSourceRules] };
		}),

	addExpense: (name, amount, isFixed, options) =>
		set((state) => ({
			expenses: [...state.expenses, { id: `exp_${Date.now()}`, name, amount, isFixed, ...options }]
		})),

	addIncome: (name, amount, taxRate, frequency) =>
		set((state) => ({
			incomes: [...state.incomes, { id: `inc_${Date.now()}`, name, amount, taxRate, frequency, routings: [] }]
		})),

	applyTimeSkip: (snapshot: any) =>
		set((state) => {
			return {
				accounts: state.accounts.map((a) => ({ ...a, balance: snapshot.accountBalances[a.id] || 0 })),
				cards: state.cards.map((c) => ({ ...c, balance: snapshot.cardBalances[c.id] || 0 })),
				loans: state.loans.map((l) => ({ ...l, balance: snapshot.loanBalances[l.id] || 0 })),
				retirements: state.retirements.map((r) => ({ ...r, balance: snapshot.retirementBalances[r.id] || 0 })),
				goals: state.goals.filter((g) => (snapshot.goalProgress[g.id] || 0) < g.targetAmount),
				transferRules: state.transferRules.filter(
					(rule) => !state.goals.some((g) => g.id === rule.destinationId && (snapshot.goalProgress[g.id] || 0) >= g.targetAmount)
				)
			};
		})
}));
