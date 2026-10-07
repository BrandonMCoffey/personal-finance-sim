import type { StoryCharacter } from "../store/storyStore";
import type { Expense } from "../store/financeStore";

const PORTRAITS = ["portrait_a", "portrait_b", "portrait_c", "portrait_d"];
const FIRST_NAMES = ["Liam", "Emma", "Noah", "Olivia", "Elijah", "Ava", "Mateo", "Isabella"];

export function generateInitialCharacters(): StoryCharacter[] {
	return [
		{
			id: `char_${Date.now()}_1`,
			name: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)],
			age: 18,
			traits: ["spendthrift"],
			portraitId: PORTRAITS[0],
			familyState: "single",
			prompt: "I just got my first job and want to buy a car, but my money keeps disappearing.",
			savedFinancialState: {
				accounts: [{ id: "acc_1", name: "Checking", type: "checking", balance: 150, apy: 0 }],
				income: [{ id: "inc_1", name: "Fast Food Job", amount: 800, frequency: "monthly", routings: [] }],
				expenses: [{ id: "exp_1", name: "Fast Food & Games", amount: 500, isFixed: false, minValue: 200 }],
				goals: [{ id: "goal_1", name: "Used Car", targetAmount: 3000, targetMonths: 12 }]
			}
		},
		{
			id: `char_${Date.now()}_2`,
			name: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)],
			age: 22,
			traits: ["frugal"],
			portraitId: PORTRAITS[1],
			familyState: "single",
			prompt: "I graduated and got a real job. I want to save aggressively but don't know where to put it.",
			savedFinancialState: {
				accounts: [{ id: "acc_1", name: "Checking", type: "checking", balance: 2000, apy: 0 }],
				income: [{ id: "inc_1", name: "Entry Level Salary", amount: 3500, taxRate: 15, frequency: "monthly", routings: [] }],
				expenses: [
					{ id: "exp_1", name: "Rent", amount: 1200, isFixed: true },
					{ id: "exp_2", name: "Groceries", amount: 300, isFixed: false, minValue: 200 }
				],
				goals: [{ id: "goal_1", name: "Emergency Fund", targetAmount: 10000 }]
			}
		},
		{
			id: `char_${Date.now()}_3`,
			name: FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)],
			age: 20,
			traits: ["risk-taker"],
			portraitId: PORTRAITS[2],
			familyState: "single",
			prompt: "I have a credit card and I love using it. How bad can it be if I make the minimum payments?",
			savedFinancialState: {
				accounts: [{ id: "acc_1", name: "Checking", type: "checking", balance: 300, apy: 0 }],
				cards: [{ id: "card_1", name: "Rewards Card", type: "credit", balance: 2500, apr: 24.99, linkedAccountId: "" }],
				income: [{ id: "inc_1", name: "Part Time", amount: 1500, frequency: "monthly", routings: [] }],
				expenses: [{ id: "exp_1", name: "Shopping", amount: 600, isFixed: false, minValue: 300, requiresCard: true }],
				goals: []
			}
		}
	];
}

export function applyTimeSkipDeviation(character: StoryCharacter, yearsToSkip: number): StoryCharacter {
	const mutatedState = JSON.parse(JSON.stringify(character.savedFinancialState)); // Deep copy
	const traits = character.traits;
	let newPrompt = `It's been ${yearsToSkip} years! `;

	// Time Adjustments
	mutatedState.income.forEach((inc: any) => {
		inc.amount = Math.round(inc.amount * Math.pow(1.03, yearsToSkip));
	});
	mutatedState.expenses.forEach((exp: Expense) => {
		if (exp.isFixed) {
			exp.amount = Math.round(exp.amount * Math.pow(1.02, yearsToSkip));
		}
	});

	// Trait-Based Deviations
	if (traits.includes("spendthrift")) {
		mutatedState.expenses.forEach((exp: Expense) => {
			if (!exp.isFixed && exp.minValue) {
				exp.amount = Math.round(exp.amount * 1.15);
				exp.minValue = Math.round(exp.minValue * 1.1);
			}
		});

		if (!mutatedState.cards) mutatedState.cards = [];
		mutatedState.cards.push({
			id: `card_deviated_${Date.now()}`,
			name: "Impulse Rewards Card",
			type: "credit",
			balance: Math.floor(Math.random() * 3000) + 1000,
			apr: 26.99,
			linkedAccountId: ""
		});
		newPrompt += "I kind of let my spending get out of hand and opened a new credit card. I need help restructuring.";
	} else if (traits.includes("frugal")) {
		mutatedState.accounts.forEach((acc: any) => {
			if (acc.type === "savings") {
				acc.balance += 2000 * yearsToSkip;
			}
		});
		newPrompt += "I've been stashing away extra cash like you taught me. Where should I deploy this new capital?";
	} else if (traits.includes("risk-taker")) {
		if (!mutatedState.loans) mutatedState.loans = [];
		mutatedState.loans.push({
			id: `loan_deviated_${Date.now()}`,
			name: "Crypto Personal Loan",
			balance: 5000,
			apr: 12.0,
			minimumPayment: 150
		});
		newPrompt += "I took out a personal loan for a 'sure-thing' investment that didn't pan out. Let's fix this.";
	} else {
		newPrompt += "Things have been stable, but my expenses have gone up with inflation. Can we re-balance my budget?";
	}

	return {
		...character,
		age: character.age + yearsToSkip,
		prompt: newPrompt,
		savedFinancialState: mutatedState
	};
}
