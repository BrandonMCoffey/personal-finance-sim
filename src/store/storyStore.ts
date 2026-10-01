import { create } from "zustand";

export type CharacterTrait = "frugal" | "spendthrift" | "balanced" | "risk-taker";
export type FamilyState = "single" | "married" | "parent";

export interface StoryCharacter {
	id: string;
	name: string;
	age: number;
	traits: CharacterTrait[];
	portraitId: string;
	familyState: FamilyState;
	savedFinancialState?: any;
}

interface StoryState {
	roundNumber: number;
	generation: number;
	activeCharacterId: string | null;
	characterPool: StoryCharacter[];

	setRoundNumber: (round: number) => void;
	advanceRound: () => void;
	advanceGeneration: () => void;
	setActiveCharacter: (id: string | null) => void;
	addCharacterToPool: (character: StoryCharacter) => void;
	updateCharacterState: (id: string, newState: any) => void;
	resetStoryState: () => void;
}

export const useStoryStore = create<StoryState>()((set) => ({
	roundNumber: 1,
	generation: 1,
	activeCharacterId: null,
	characterPool: [],

	setRoundNumber: (round) => set({ roundNumber: round }),
	advanceRound: () => set((state) => ({ roundNumber: state.roundNumber + 1 })),
	advanceGeneration: () => set((state) => ({ generation: state.generation + 1 })),
	setActiveCharacter: (id) => set({ activeCharacterId: id }),
	addCharacterToPool: (character) =>
		set((state) => ({
			characterPool: [...state.characterPool, character]
		})),
	updateCharacterState: (id, newState) =>
		set((state) => ({
			characterPool: state.characterPool.map((c) => (c.id === id ? { ...c, savedFinancialState: newState } : c))
		})),
	resetStoryState: () =>
		set({
			roundNumber: 1,
			generation: 1,
			activeCharacterId: null,
			characterPool: []
		})
}));
