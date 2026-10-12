import { describe, it, expect } from "vitest";
import { evaluatePlan } from "../validation";
import type { Account, Income, TransferRule, Expense, Card, Loan, Retirement, WinConditions } from "../../store/financeStore";

describe("validation engine", () => {
	it("penalizes unfunded fixed expenses", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 500, apy: 0 }
		];
		const incomes: Income[] = [
			{
				id: "inc1",
				name: "Salary",
				amount: 3000,
				taxRate: 0,
				frequency: "monthly",
				routings: [{ destinationId: "checking", amount: 100, type: "percentage" }]
			}
		];
		const expenses: Expense[] = [
			// Fixed rent of $1200 with NO transfer rule connecting to it!
			{ id: "rent", name: "Rent", amount: 1200, isFixed: true }
		];
		const winConditions: WinConditions = { requiredAccounts: ["checking"] };

		const report = evaluatePlan(accounts, incomes, [], [], expenses, [], [], [], winConditions);

		// Must fail because mandatory fixed rent was not paid!
		expect(report.passed).toBe(false);
		expect(report.feedback.some((f) => f.includes("Unpaid Fixed Expense") && f.includes("Rent"))).toBe(true);
	});

	it("passes when all fixed and variable expenses are funded within solvency", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 500, apy: 0 }
		];
		const incomes: Income[] = [
			{
				id: "inc1",
				name: "Salary",
				amount: 3000,
				taxRate: 0,
				frequency: "monthly",
				routings: [{ destinationId: "checking", amount: 100, type: "percentage" }]
			}
		];
		const expenses: Expense[] = [
			{ id: "rent", name: "Rent", amount: 1200, isFixed: true },
			{ id: "groceries", name: "Groceries", amount: 500, isFixed: false, minValue: 300 }
		];
		const rules: TransferRule[] = [
			{ id: "r1", sourceId: "checking", destinationId: "rent", amount: 1200, type: "fixed" },
			{ id: "r2", sourceId: "checking", destinationId: "groceries", amount: 400, type: "fixed" }
		];
		const winConditions: WinConditions = { requiredAccounts: ["checking"] };

		const report = evaluatePlan(accounts, incomes, rules, [], expenses, [], [], [], winConditions);

		expect(report.passed).toBe(true);
		expect(report.score).toBeGreaterThanOrEqual(80);
	});

	it("validates Debt Avalanche correctly (targets highest APR first)", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 2000, apy: 0 }
		];
		const cards: Card[] = [
			{ id: "card_high", name: "High APR Card", type: "credit", linkedAccountId: "checking", balance: 1000, apr: 24.99, minimumPayment: 30 }
		];
		const loans: Loan[] = [
			{ id: "loan_low", name: "Car Loan", balance: 5000, apr: 5.5, minimumPayment: 150 }
		];
		const winConditions: WinConditions = { optimalDebtRouting: "avalanche" };

		// Flawed plan: player sends extra money to the low APR car loan instead of 25% card
		const flawedRules: TransferRule[] = [
			{ id: "r_c", sourceId: "checking", destinationId: "card_high", amount: 30, type: "fixed" }, // Only minimum
			{ id: "r_l", sourceId: "checking", destinationId: "loan_low", amount: 400, type: "fixed" } // Surplus sent to 5.5% loan!
		];

		const flawedReport = evaluatePlan(accounts, [], flawedRules, [], [], cards, loans, [], winConditions);
		expect(flawedReport.feedback.some((f) => f.includes("Suboptimal Debt Strategy"))).toBe(true);

		// Correct avalanche plan: surplus goes to 25% APR card!
		const correctRules: TransferRule[] = [
			{ id: "r_c", sourceId: "checking", destinationId: "card_high", amount: 350, type: "fixed" },
			{ id: "r_l", sourceId: "checking", destinationId: "loan_low", amount: 150, type: "fixed" } // Exact minimum
		];

		const correctReport = evaluatePlan(accounts, [], correctRules, [], [], cards, loans, [], winConditions);
		expect(correctReport.feedback.some((f) => f.includes("correctly prioritized"))).toBe(true);
	});

	it("validates maxDebtBalance and debtPaidOff conditions", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 2000, apy: 0 }
		];
		const cards: Card[] = [
			{ id: "card1", name: "Card", type: "credit", linkedAccountId: "checking", balance: 600, apr: 0, minimumPayment: 50 }
		];
		const winConditions: WinConditions = {
			debtPaidOff: ["card1"],
			maxDebtBalance: 0
		};

		// Plan 1: Underpays -> fails
		const underpayRules: TransferRule[] = [
			{ id: "r1", sourceId: "checking", destinationId: "card1", amount: 50, type: "fixed" }
		];
		const failReport = evaluatePlan(accounts, [], underpayRules, [], [], cards, [], [], winConditions);
		expect(failReport.passed).toBe(false);

		// Plan 2: Pays full $600 -> succeeds
		const fullPayRules: TransferRule[] = [
			{ id: "r1", sourceId: "checking", destinationId: "card1", amount: 600, type: "fixed" }
		];
		const passReport = evaluatePlan(accounts, [], fullPayRules, [], [], cards, [], [], winConditions);
		expect(passReport.passed).toBe(true);
		expect(passReport.feedback.some((f) => f.includes("completely paid off"))).toBe(true);
	});

	it("validates requireRetirementMatch condition", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 0, apy: 0 }
		];
		const incomes: Income[] = [
			{
				id: "inc1",
				name: "Salary",
				amount: 5000,
				taxRate: 0,
				frequency: "monthly",
				routings: [
					// 5% to 401k
					{ destinationId: "ret1", amount: 5, type: "percentage" },
					{ destinationId: "checking", amount: 95, type: "percentage" }
				]
			}
		];
		const retirements: Retirement[] = [
			{ id: "ret1", name: "401k", type: "401k", balance: 0, expectedApy: 7, employerMatchPercent: 5 }
		];
		const winConditions: WinConditions = { requireRetirementMatch: true };

		const report = evaluatePlan(accounts, incomes, [], [], [], [], [], retirements, winConditions);
		expect(report.passed).toBe(true);
		expect(report.feedback.some((f) => f.includes("Captured") && f.includes("employer 401(k) match"))).toBe(true);
	});

	it("detects and penalizes overdrafts in checking account", () => {
		const accounts: Account[] = [
			{ id: "checking", name: "Checking", type: "checking", balance: 100, apy: 0 }
		];
		const expenses: Expense[] = [
			{ id: "rent", name: "Rent", amount: 1500, isFixed: true }
		];
		const rules: TransferRule[] = [
			{ id: "r1", sourceId: "checking", destinationId: "rent", amount: 1500, type: "fixed" }
		];
		const winConditions: WinConditions = { requiredAccounts: ["checking"] };

		// No income, starting balance $100, paying $1500 rent causes overdraft
		const report = evaluatePlan(accounts, [], rules, [], expenses, [], [], [], winConditions, [], 0, 3);
		expect(report.feedback.some((f) => f.includes("Overdraft Error"))).toBe(true);
		expect(report.passed).toBe(false);
	});

	it("validates physical cash sweep and penalizes unsecured cash", () => {
		const accounts: Account[] = [
			{ id: "cash1", name: "Physical Cash", type: "cash", balance: 1000, apy: 0 },
			{ id: "checking1", name: "Checking", type: "checking", balance: 0, apy: 0 }
		];
		const winConditions: WinConditions = { maxCashBalance: 0 };

		// Without rule depositing cash: fails maxCashBalance
		const failReport = evaluatePlan(accounts, [], [], [], [], [], [], [], winConditions);
		expect(failReport.feedback.some((f) => f.includes("Unsecured Funds"))).toBe(true);

		// With rule sweeping cash to checking: succeeds
		const sweepRules: TransferRule[] = [
			{ id: "r_sweep", sourceId: "cash1", destinationId: "checking1", amount: 1000, type: "fixed" }
		];
		const passReport = evaluatePlan(accounts, [], sweepRules, [], [], [], [], [], winConditions);
		expect(passReport.feedback.some((f) => f.includes("successfully deposited physical cash"))).toBe(true);
	});
});
