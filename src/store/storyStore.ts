import { create } from "zustand";
import type { CharacterClientState } from "../data/characters/types";
import {
	initializeStoryClientStates,
	advanceCooldowns,
	pickRoundCandidates,
	handleCandidateSelectionUpdate,
	handleSessionCompletion,
	type StoryCandidateChoice
} from "../engines/storyEngine";

interface StoryStoreState {
	roundNumber: number;
	activeCharacterId: string | null;
	clientStates: Record<string, CharacterClientState>;
	currentRoundChoices: StoryCandidateChoice[];
	totalClientsAdvised: number;

	initStoryState: () => void;
	generateRoundChoices: () => void;
	selectCandidate: (chosenId: string) => void;
	completeClientSession: (characterId: string, finalFinancialState: any, score: number) => void;
	advanceRound: () => void;
	resetStoryState: () => void;
}

export const useStoryStore = create<StoryStoreState>()((set, get) => ({
	roundNumber: 1,
	activeCharacterId: null,
	clientStates: initializeStoryClientStates(),
	currentRoundChoices: [],
	totalClientsAdvised: 0,

	initStoryState: () => {
		const state = get();
		if (state.currentRoundChoices.length === 0) {
			const initialStates = initializeStoryClientStates();
			const choices = pickRoundCandidates(initialStates, 3);
			set({
				clientStates: initialStates,
				currentRoundChoices: choices,
				roundNumber: 1,
				totalClientsAdvised: 0
			});
		}
	},

	generateRoundChoices: () => {
		const { clientStates } = get();
		const choices = pickRoundCandidates(clientStates, 3);
		set({ currentRoundChoices: choices });
	},

	selectCandidate: (chosenId: string) => {
		const { clientStates, currentRoundChoices, roundNumber } = get();
		const offeredIds = currentRoundChoices.map((c) => c.character.id);
		const updatedStates = handleCandidateSelectionUpdate(
			clientStates,
			chosenId,
			offeredIds,
			roundNumber
		);
		set({
			activeCharacterId: chosenId,
			clientStates: updatedStates
		});
	},

	completeClientSession: (characterId: string, finalFinancialState: any) => {
		const { clientStates, roundNumber, totalClientsAdvised } = get();
		const updatedStates = handleSessionCompletion(
			clientStates,
			characterId,
			finalFinancialState,
			roundNumber
		);
		set({
			clientStates: updatedStates,
			activeCharacterId: null,
			totalClientsAdvised: totalClientsAdvised + 1
		});
	},

	advanceRound: () => {
		const { roundNumber, clientStates } = get();
		const nextRound = roundNumber + 1;
		const readyStates = advanceCooldowns(clientStates);
		const newChoices = pickRoundCandidates(readyStates, 3);
		set({
			roundNumber: nextRound,
			clientStates: readyStates,
			currentRoundChoices: newChoices,
			activeCharacterId: null
		});
	},

	resetStoryState: () => {
		const freshStates = initializeStoryClientStates();
		const freshChoices = pickRoundCandidates(freshStates, 3);
		set({
			roundNumber: 1,
			activeCharacterId: null,
			clientStates: freshStates,
			currentRoundChoices: freshChoices,
			totalClientsAdvised: 0
		});
	}
}));
