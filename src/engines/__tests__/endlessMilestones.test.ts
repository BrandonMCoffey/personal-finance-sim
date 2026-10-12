import { describe, it, expect } from "vitest";
import MILESTONES from "../../data/endless/milestones.json";
import type { LifeEvent } from "../lifeEventEngine";
import { useFinanceStore } from "../../store/financeStore";

describe("endless mode milestones data & engine", () => {
	it("verifies all milestones have valid IDs, ascending ages, and choices", () => {
		expect(MILESTONES.length).toBeGreaterThanOrEqual(10);

		let prevAge = 16;
		const grantedPrereqs = new Set<string>();

		for (const milestone of MILESTONES) {
			expect(milestone.id).toBeDefined();
			expect(milestone.age).toBeGreaterThan(prevAge);
			expect(milestone.gapYears).toBeGreaterThan(0);
			expect(milestone.title).toBeTruthy();
			expect(milestone.narrative).toBeTruthy();
			expect(milestone.choices.length).toBeGreaterThanOrEqual(1);

			for (const choice of milestone.choices) {
				const c = choice as any;
				expect(c.id).toBeTruthy();
				expect(c.title).toBeTruthy();
				expect(c.description).toBeTruthy();
				expect(c.effects).toBeDefined();

				if (c.prerequisiteOptionId) {
					// Must have been granted by an earlier milestone
					expect(grantedPrereqs.has(c.prerequisiteOptionId)).toBe(true);
				}
				if (c.grantsPrerequisiteId) {
					grantedPrereqs.add(c.grantsPrerequisiteId);
				}
			}

			prevAge = milestone.age;
		}

		// Concludes at age 65
		expect(MILESTONES[MILESTONES.length - 1].age).toBe(65);
	});

	it("applies milestone effects in store and triggers node flashing", () => {
		const store = useFinanceStore.getState();
		store.loadLevel({
			category: "endless",
			startingState: {
				accounts: [{ id: "acc_checking", name: "Teen Checking", type: "checking", balance: 200, apy: 0.01 }],
				income: [{ id: "inc_1", name: "High School Job", amount: 650, taxRate: 10, routings: [] }],
				expenses: [{ id: "exp_phone", name: "Phone", amount: 120, isFixed: true }],
				goals: []
			}
		});

		const choiceCollege = MILESTONES[0].choices.find((c) => c.id === "choice_college");
		expect(choiceCollege).toBeDefined();

		useFinanceStore.getState().applyMilestoneEffects(choiceCollege!.effects);

		const updatedState = useFinanceStore.getState();
		// Incomes updated
		const mainIncome = updatedState.incomes.find((i) => i.id === "inc_1");
		expect(mainIncome?.amount).toBe(950);

		// Loans added
		const studentLoan = updatedState.loans.find((l) => l.name === "Federal Student Loans");
		expect(studentLoan).toBeDefined();
		expect(studentLoan?.balance).toBe(24000);

		// Node flashing set
		expect(updatedState.flashingNodeId).toBeDefined();
	});

	it("life event engine actions add nodes to store and return IDs", () => {
		const store = useFinanceStore.getState();
		const initialLoanCount = store.loans.length;

		// Mock a life event directly
		const event: LifeEvent = {
			id: "test_event",
			title: "Emergency Vet",
			description: "Vet emergency bill",
			type: "debt",
			action: (s) => s.addLoan("Emergency Vet Loan", 1500, 8.0, 50)
		};

		const nodeId = event.action(useFinanceStore.getState());
		expect(typeof nodeId).toBe("string");
		expect(useFinanceStore.getState().loans.length).toBe(initialLoanCount + 1);
		expect(useFinanceStore.getState().flashingNodeId).toBe(nodeId);
	});
});
