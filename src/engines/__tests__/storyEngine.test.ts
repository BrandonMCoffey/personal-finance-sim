import { describe, it, expect } from "vitest";
import {
	initializeStoryClientStates,
	pickRoundCandidates,
	handleCandidateSelectionUpdate,
	handleSessionCompletion,
	advanceCooldowns,
	buildStoryLevel
} from "../storyEngine";
import { CHARACTER_DEFINITIONS } from "../../data/characters";

describe("story engine", () => {
	it("initializes states for all character definitions", () => {
		const states = initializeStoryClientStates();
		expect(Object.keys(states).length).toBe(CHARACTER_DEFINITIONS.length);
		Object.values(states).forEach((s) => {
			expect(s.currentStageIndex).toBe(0);
			expect(s.isLost).toBe(false);
			expect(s.timesHelped).toBe(0);
		});
	});

	it("picks candidate choices with rich snippets and finances", () => {
		const states = initializeStoryClientStates();
		const choices = pickRoundCandidates(states, 3);
		expect(choices.length).toBe(3);
		choices.forEach((c) => {
			expect(c.character).toBeDefined();
			expect(c.stage).toBeDefined();
			expect(c.relationshipStatus).toBe("new");
			expect(c.monthlyIncome).toBeGreaterThan(0);
		});
	});

	it("decreases weight and tracks skips when candidates are bypassed", () => {
		const states = initializeStoryClientStates();
		const choices = pickRoundCandidates(states, 3);
		const chosenId = choices[0].character.id;
		const offeredIds = choices.map((c) => c.character.id);

		const updated = handleCandidateSelectionUpdate(states, chosenId, offeredIds, 1);

		// Chosen candidate:
		expect(updated[chosenId].timesOffered).toBe(1);
		expect(updated[chosenId].timesSkipped).toBe(0);

		// Skipped candidates:
		const skippedId = offeredIds[1];
		expect(updated[skippedId].timesOffered).toBe(1);
		expect(updated[skippedId].timesSkipped).toBe(1);
		expect(updated[skippedId].selectionWeight).toBeLessThan(100);
	});

	it("handles session completion, increases loyalty weight, advances stage, and sets cooldown", () => {
		const states = initializeStoryClientStates();
		const char = CHARACTER_DEFINITIONS[0];
		const updated = handleSessionCompletion(states, char.id, { accounts: [] }, 1);

		const clientState = updated[char.id];
		expect(clientState.timesHelped).toBe(1);
		expect(clientState.currentStageIndex).toBe(1);
		expect(clientState.cooldownRoundsRemaining).toBeGreaterThan(0);
		expect(clientState.selectionWeight).toBe(130);

		// Advancing cooldowns decrements remaining rounds
		const nextRoundStates = advanceCooldowns(updated);
		expect(nextRoundStates[char.id].cooldownRoundsRemaining).toBe(clientState.cooldownRoundsRemaining - 1);
	});

	it("builds story level carrying forward saved client account balances", () => {
		const states = initializeStoryClientStates();
		const char = CHARACTER_DEFINITIONS[0];
		const stage = char.stages[0];

		// Mock previous saved state
		const clientState = {
			...states[char.id],
			timesHelped: 1,
			savedFinancialState: {
				accounts: [
					{ id: "acc_prev", name: "Savings", type: "savings" as const, balance: 2000, apy: 3.0 }
				]
			}
		};

		const level = buildStoryLevel(char, stage, clientState, 2);
		expect(level.category).toBe("story");
		expect(level.client.name).toBe(char.name);
		// Saved account balance should carry forward with ~5% growth
		const carriedAcc = level.startingState.accounts.find((a: any) => a.id === "acc_prev");
		expect(carriedAcc).toBeDefined();
		expect(carriedAcc.balance).toBe(2100);
	});
});
