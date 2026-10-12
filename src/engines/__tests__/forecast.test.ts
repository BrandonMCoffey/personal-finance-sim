import { describe, it, expect } from "vitest";
import { generateForecast } from "../forecast";
import type { Account, Income, TransferRule, Expense, Card, Loan, Insurance } from "../../store/financeStore";

describe("forecast engine", () => {
	it("does not prematurely wipe non-cash accounts on account-to-account transfer rules", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 1000, apy: 0 },
			{ id: "savings", name: "Savings", type: "savings", balance: 500, apy: 2.0 }
		];
		const rules: TransferRule[] = [
			{ id: "r1", sourceId: "checking", destinationId: "savings", amount: 100, type: "fixed" }
		];

		const snapshots = generateForecast(accounts, [], rules, [], [], [], [], [], 1);
		const month1 = snapshots[0];

		// Checking started at 1000, transferred 100 -> should be 900, not 0!
		expect(month1.accountBalances["checking"]).toBe(900);
		// Savings started at 500, received 100 + interest
		expect(month1.accountBalances["savings"]).toBeGreaterThanOrEqual(600);
	});

	it("sweeps physical cash into non-cash accounts at start", () => {
		const accounts: Account[] = [
			{ id: "cash_wallet", name: "Wallet Cash", type: "cash", balance: 300, apy: 0 },
			{ id: "checking", name: "Checking", type: "checking", balance: 500, apy: 0 }
		];
		const rules: TransferRule[] = [
			{ id: "r_dep", sourceId: "cash_wallet", destinationId: "checking", amount: 100, type: "percentage" }
		];

		const snapshots = generateForecast(accounts, [], rules, [], [], [], [], [], 1);
		const month1 = snapshots[0];

		expect(month1.accountBalances["cash_wallet"]).toBe(0);
		expect(month1.accountBalances["checking"]).toBe(800);
	});

	it("caps debt balance at zero and stops draining source accounts once debt is paid off", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 1000, apy: 0 }
		];
		const loans: Loan[] = [
			{ id: "small_loan", name: "Small Loan", balance: 150, apr: 0, minimumPayment: 50 }
		];
		const rules: TransferRule[] = [
			// User sends $100/mo to a $150 loan over 3 months ($300 total)
			{ id: "r_pay", sourceId: "checking", destinationId: "small_loan", amount: 100, type: "fixed" }
		];

		const snapshots = generateForecast(accounts, [], rules, [], [], [], loans, [], 3);
		const m1 = snapshots[0];
		const m2 = snapshots[1];
		const m3 = snapshots[2];

		// Month 1: owes 150, pays 100 -> remaining 50. Checking: 1000 - 100 = 900
		expect(m1.loanBalances["small_loan"]).toBe(50);
		expect(m1.accountBalances["checking"]).toBe(900);

		// Month 2: owes 50, rule asks for 100 -> only accepts 50! Remaining loan = 0. Checking: 900 - 50 = 850
		expect(m2.loanBalances["small_loan"]).toBe(0);
		expect(m2.accountBalances["checking"]).toBe(850);

		// Month 3: loan is 0 -> accepts 0. Checking remains 850, loan remains 0 (not negative!)
		expect(m3.loanBalances["small_loan"]).toBe(0);
		expect(m3.accountBalances["checking"]).toBe(850);
	});

	it("calculates insurance percentage funding based on net take-home pay", () => {
		const incomes: Income[] = [
			{
				id: "inc1",
				name: "Salary",
				amount: 4000,
				taxRate: 20, // Net pay: 3200
				frequency: "monthly",
				routings: [
					// 5% of net pay = $160
					{ destinationId: "health_ins", amount: 5, type: "percentage" },
					{ destinationId: "checking", amount: 95, type: "percentage" }
				]
			}
		];
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 0, apy: 0 }
		];
		const insurances: Insurance[] = [
			{ id: "health_ins", name: "Health Insurance", premium: 150, deductible: 500 }
		];

		const snapshots = generateForecast(accounts, incomes, [], [], [], [], [], [], 1, insurances);
		const m1 = snapshots[0];

		// Premium is $150, 5% of $3200 net pay is $160 -> policy must be active!
		expect(m1.insuranceCoverage["health_ins"]).toBe(true);
	});

	it("records exact debtPayments in snapshot", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 500, apy: 0 }
		];
		const cards: Card[] = [
			{ id: "card1", name: "Credit Card", type: "credit", linkedAccountId: "checking", balance: 400, apr: 15, minimumPayment: 25 }
		];
		const rules: TransferRule[] = [
			{ id: "r1", sourceId: "checking", destinationId: "card1", amount: 100, type: "fixed" }
		];

		const snapshots = generateForecast(accounts, [], rules, [], [], cards, [], [], 1);
		expect(snapshots[0].debtPayments["card1"]).toBe(100);
	});

	it("allows variable expenses to accept funding greater than base amount up to maxAmount", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 1000, apy: 0 }
		];
		const expenses: Expense[] = [
			// Base amount: 400, maxAmount: 600 (1.5x)
			{ id: "groceries", name: "Groceries", amount: 400, isFixed: false, minValue: 200 }
		];
		// Rule transfers $550 (more than $400 base amount)
		const rules: TransferRule[] = [
			{ id: "r_groceries", sourceId: "checking", destinationId: "groceries", amount: 550, type: "fixed" }
		];

		const snapshots = generateForecast(accounts, [], rules, [], expenses, [], [], [], 1);
		const m1 = snapshots[0];

		// Should accept the full $550 because it is below the 1.5x maxAmount ($600)
		expect(m1.expenseProgress["groceries"]).toBe(550);
		// Checking account should be deducted by the full $550
		expect(m1.accountBalances["checking"]).toBe(450);
	});

	it("allows adding more or less money to an expense, capping at maxAmount (1.5 * defaultAmount)", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 2500, apy: 0 }
		];
		const expenses: Expense[] = [
			// defaultAmount of $1200 -> maxAmount defaults to $1800
			{ id: "rent", name: "Rent", amount: 1200, defaultAmount: 1200, isFixed: true }
		];
		// 1. Can add more money ($1500, between default $1200 and max $1800)
		const rules1: TransferRule[] = [
			{ id: "r_rent", sourceId: "checking", destinationId: "rent", amount: 1500, type: "fixed" }
		];
		const snapshots1 = generateForecast(accounts, [], rules1, [], expenses, [], [], [], 1);
		expect(snapshots1[0].expenseProgress["rent"]).toBe(1500);
		expect(snapshots1[0].accountBalances["checking"]).toBe(1000);

		// 2. Beyond maxAmount ($2000 > $1800) -> capped at maxAmount ($1800)
		const rules2: TransferRule[] = [
			{ id: "r_rent", sourceId: "checking", destinationId: "rent", amount: 2000, type: "fixed" }
		];
		const snapshots2 = generateForecast(accounts, [], rules2, [], expenses, [], [], [], 1);
		expect(snapshots2[0].expenseProgress["rent"]).toBe(1800);
		expect(snapshots2[0].accountBalances["checking"]).toBe(700);
	});

	it("routes 100% when route.isAuto is true and income has a single output", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 0, apy: 0 }
		];
		const incomes: Income[] = [
			{
				id: "salary",
				name: "Salary",
				amount: 3000,
				taxRate: 0,
				frequency: "monthly",
				routings: [
					{ destinationId: "checking", amount: 100, type: "percentage", isAuto: true }
				]
			}
		];
		const expenses: Expense[] = [
			{ id: "groceries", name: "Groceries", amount: 400, isFixed: false }
		];
		const rules: TransferRule[] = [
			{ id: "r_groceries", sourceId: "checking", destinationId: "groceries", amount: 550, type: "fixed" }
		];

		const snapshots = generateForecast(accounts, incomes, rules, [], expenses, [], [], [], 1);
		const m1 = snapshots[0];

		// Checking received 100% ($3000) from auto income routing, paid $550 for groceries -> ending at $2450
		expect(m1.expenseProgress["groceries"]).toBe(550);
		expect(m1.accountBalances["checking"]).toBe(2450);
	});

	it("routes exact calculated required amount when route.isAuto is true with multiple outputs", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 0, apy: 0 },
			{ id: "savings", name: "Savings", type: "savings", balance: 0, apy: 0 }
		];
		const incomes: Income[] = [
			{
				id: "salary",
				name: "Salary",
				amount: 3000,
				taxRate: 0,
				frequency: "monthly",
				routings: [
					// Auto route to checking with required sum of $550
					{ destinationId: "checking", amount: 550, type: "fixed", isAuto: true },
					// Remaining routes to savings
					{ destinationId: "savings", amount: 100, type: "percentage" }
				]
			}
		];
		const expenses: Expense[] = [
			{ id: "groceries", name: "Groceries", amount: 400, isFixed: false }
		];
		const rules: TransferRule[] = [
			{ id: "r_groceries", sourceId: "checking", destinationId: "groceries", amount: 550, type: "fixed" }
		];

		const snapshots = generateForecast(accounts, incomes, rules, [], expenses, [], [], [], 1);
		const m1 = snapshots[0];

		// Checking received exactly $550 from auto income routing, paid $550 for groceries, ending at $0
		expect(m1.expenseProgress["groceries"]).toBe(550);
		expect(m1.accountBalances["checking"]).toBe(0);
		// Savings received the remaining $2450 ($3000 - $550)
		expect(m1.accountBalances["savings"]).toBe(2450);
	});

	it("transfers 100% when balance node has a single auto transfer rule", () => {
		const accounts: Account[] = [
			{ id: "source_acc", name: "Source Account", type: "checking", balance: 1000, apy: 0 },
			{ id: "dest_acc", name: "Dest Checking", type: "checking", balance: 0, apy: 0 }
		];
		const rules: TransferRule[] = [
			{ id: "r_auto", sourceId: "source_acc", destinationId: "dest_acc", amount: 100, type: "percentage", isAuto: true }
		];

		const snapshots = generateForecast(accounts, [], rules, [], [], [], [], [], 1);
		const m1 = snapshots[0];

		// Source account transfers 100% ($1000) to dest checking
		expect(m1.accountBalances["source_acc"]).toBe(0);
		expect(m1.accountBalances["dest_acc"]).toBe(1000);
	});

	it("executes credit card payment methods: statement, minimum, and custom", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 2000, apy: 0 }
		];
		const cards: Card[] = [
			{ id: "c_stmt", name: "Card 1", type: "credit", linkedAccountId: "checking", balance: 500, apr: 0, minimumPayment: 50 },
			{ id: "c_min", name: "Card 2", type: "credit", linkedAccountId: "checking", balance: 800, apr: 0, minimumPayment: 40 },
			{ id: "c_cust", name: "Card 3", type: "credit", linkedAccountId: "checking", balance: 600, apr: 0, minimumPayment: 30 }
		];
		const rules: TransferRule[] = [
			{ id: "r1", sourceId: "checking", destinationId: "c_stmt", amount: 0, type: "fixed", paymentMethod: "statement" },
			{ id: "r2", sourceId: "checking", destinationId: "c_min", amount: 0, type: "fixed", paymentMethod: "minimum" },
			{ id: "r3", sourceId: "checking", destinationId: "c_cust", amount: 150, type: "fixed", paymentMethod: "custom" }
		];

		const snapshots = generateForecast(accounts, [], rules, [], [], cards, [], [], 1);
		const m1 = snapshots[0];

		// Card 1 paid full statement ($500)
		expect(m1.cardBalances["c_stmt"]).toBe(0);
		expect(m1.debtPayments["c_stmt"]).toBe(500);

		// Card 2 paid minimum ($40)
		expect(m1.cardBalances["c_min"]).toBe(760);
		expect(m1.debtPayments["c_min"]).toBe(40);

		// Card 3 paid custom ($150)
		expect(m1.cardBalances["c_cust"]).toBe(450);
		expect(m1.debtPayments["c_cust"]).toBe(150);

		// Checking account decreased by 500 + 40 + 150 = 690 -> 2000 - 690 = 1310
		expect(m1.accountBalances["checking"]).toBe(1310);
	});

	it("waterfalls auto balance from account to credit card then to savings account", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 1000, apy: 0 },
			{ id: "savings", name: "Savings", type: "savings", balance: 200, apy: 0 }
		];
		const cards: Card[] = [
			{ id: "card1", name: "Credit Card", type: "credit", linkedAccountId: "checking", balance: 350, apr: 0, minimumPayment: 25 }
		];
		const rules: TransferRule[] = [
			// Rule 1: Pay credit card statement balance
			{ id: "r1", sourceId: "checking", destinationId: "card1", amount: 0, type: "fixed", paymentMethod: "statement" },
			// Rule 2: Auto waterfall remaining surplus into savings
			{ id: "r2", sourceId: "checking", destinationId: "savings", amount: 0, type: "percentage", isAuto: true }
		];

		const snapshots = generateForecast(accounts, [], rules, [], [], cards, [], [], 1);
		const m1 = snapshots[0];

		// Card is paid off ($350)
		expect(m1.cardBalances["card1"]).toBe(0);
		expect(m1.debtPayments["card1"]).toBe(350);

		// Remaining surplus in checking ($1000 - $350 = $650) waterfalls into savings
		expect(m1.accountBalances["checking"]).toBe(0);
		expect(m1.accountBalances["savings"]).toBe(850); // 200 starting + 650 surplus
	});

	it("supports transfers from accounts to loans and retirements", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 1500, apy: 0 }
		];
		const loans: Loan[] = [
			{ id: "loan1", name: "Car Loan", balance: 1000, apr: 0, minimumPayment: 150 }
		];
		const retirements = [
			{ id: "ret1", name: "Roth IRA", balance: 500, expectedApy: 0, employerMatchPercent: 0 }
		];
		const rules: TransferRule[] = [
			{ id: "r_loan", sourceId: "checking", destinationId: "loan1", amount: 200, type: "fixed" },
			{ id: "r_ret", sourceId: "checking", destinationId: "ret1", amount: 300, type: "fixed" }
		];

		const snapshots = generateForecast(accounts, [], rules, [], [], [], loans, retirements, 1);
		const m1 = snapshots[0];

		expect(m1.loanBalances["loan1"]).toBe(800);
		expect(m1.retirementBalances["ret1"]).toBe(800);
		expect(m1.accountBalances["checking"]).toBe(1000);
	});

	it("reserves other minimum payments when credit card uses surplus payment method", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 1300, apy: 0 }
		];
		const cards: Card[] = [
			{ id: "card_furn", name: "Furniture Card", type: "credit", linkedAccountId: "checking", balance: 1500, apr: 18, minimumPayment: 37.5 },
			{ id: "card_trav", name: "Travel Card", type: "credit", linkedAccountId: "checking", balance: 1800, apr: 24, minimumPayment: 45 }
		];
		const rules: TransferRule[] = [
			// Rule 1: Travel card targets surplus (runs first)
			{ id: "r_surplus", sourceId: "checking", destinationId: "card_trav", amount: 0, type: "fixed", paymentMethod: "surplus" },
			// Rule 2: Furniture card pays minimum
			{ id: "r_min", sourceId: "checking", destinationId: "card_furn", amount: 0, type: "fixed", paymentMethod: "minimum" }
		];

		const snapshots = generateForecast(accounts, [], rules, [], [], cards, [], [], 1);
		const m1 = snapshots[0];

		// Furniture card minimum ($37.50) is reserved and paid
		expect(m1.debtPayments["card_furn"]).toBe(37.5);
		// Travel card takes the remaining $1300 - $37.50 = $1262.50
		expect(m1.debtPayments["card_trav"]).toBe(1262.5);
		expect(m1.accountBalances["checking"]).toBe(0);
	});

	it("tracks cardOut separately from other expenses in accountFlows", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 1000, apy: 0 }
		];
		const expenses: Expense[] = [
			{ id: "rent", name: "Rent", amount: 500, isFixed: true }
		];
		const cards: Card[] = [
			{ id: "card1", name: "Card 1", type: "credit", linkedAccountId: "checking", balance: 200, apr: 0, minimumPayment: 25 }
		];
		const rules: TransferRule[] = [
			{ id: "r_rent", sourceId: "checking", destinationId: "rent", amount: 500, type: "fixed" },
			{ id: "r_card", sourceId: "checking", destinationId: "card1", amount: 200, type: "fixed", paymentMethod: "statement" }
		];

		const snapshots = generateForecast(accounts, [], rules, [], expenses, cards, [], [], 1);
		const m1 = snapshots[0];

		expect(m1.accountFlows["checking"].out).toBe(700);
		expect(m1.accountFlows["checking"].cardOut).toBe(200);
	});
});
