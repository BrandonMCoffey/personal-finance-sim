import {
	CHARACTER_DEFINITIONS,
	CHARACTER_MAP,
	type CharacterDefinition,
	type CharacterStage,
	type CharacterClientState
} from "../data/characters";

export interface StoryCandidateChoice {
	character: CharacterDefinition;
	stage: CharacterStage;
	clientState: CharacterClientState;
	snippet: string;
	relationshipStatus: "new" | "returning_helped" | "returning_skipped";
	relationshipNote: string;
	primaryWorry: string;
	monthlyIncome: number;
	monthlyExpenses: number;
}

export function initializeStoryClientStates(): Record<string, CharacterClientState> {
	const states: Record<string, CharacterClientState> = {};
	CHARACTER_DEFINITIONS.forEach((char) => {
		states[char.id] = {
			characterId: char.id,
			currentStageIndex: 0,
			cooldownRoundsRemaining: 0,
			timesHelped: 0,
			timesOffered: 0,
			timesSkipped: 0,
			isLost: false,
			selectionWeight: 100
		};
	});
	return states;
}

export function getEligibleCandidates(
	clientStates: Record<string, CharacterClientState>
): CharacterDefinition[] {
	return CHARACTER_DEFINITIONS.filter((char) => {
		const state = clientStates[char.id];
		if (!state) return false;
		if (state.isLost) return false;
		if (state.currentStageIndex >= char.stages.length) return false;
		if (state.cooldownRoundsRemaining > 0) return false;
		return true;
	});
}

export function advanceCooldowns(
	clientStates: Record<string, CharacterClientState>
): Record<string, CharacterClientState> {
	const updated = { ...clientStates };
	for (const id in updated) {
		const c = { ...updated[id] };
		if (c.cooldownRoundsRemaining > 0) {
			c.cooldownRoundsRemaining = Math.max(0, c.cooldownRoundsRemaining - 1);
		}
		updated[id] = c;
	}
	return updated;
}

export function pickRoundCandidates(
	clientStates: Record<string, CharacterClientState>,
	count: number = 3
): StoryCandidateChoice[] {
	let pool = getEligibleCandidates(clientStates);

	// Fallback if pool is too small (e.g. all on cooldown): awaken non-lost characters with remaining stages
	if (pool.length < count) {
		const backupPool = CHARACTER_DEFINITIONS.filter((char) => {
			const s = clientStates[char.id];
			return s && !s.isLost && s.currentStageIndex < char.stages.length;
		});
		if (backupPool.length > 0) {
			pool = backupPool;
		} else {
			// If all completed or lost, include any character
			pool = [...CHARACTER_DEFINITIONS];
		}
	}

	// Weighted semi-random selection without replacement
	const selectedChars: CharacterDefinition[] = [];
	const available = [...pool];

	const calculateWeight = (char: CharacterDefinition): number => {
		const s = clientStates[char.id];
		if (!s) return 100;
		let weight = s.selectionWeight || 100;
		if (s.timesHelped > 0) weight += 35; // Returning clients seek you out
		if (s.timesSkipped > 0) {
			weight = Math.max(5, Math.floor(weight * Math.pow(0.55, s.timesSkipped)));
		}
		return Math.max(5, weight);
	};

	const needed = Math.min(count, available.length);
	for (let i = 0; i < needed; i++) {
		const totalWeight = available.reduce((sum, c) => sum + calculateWeight(c), 0);
		let roll = Math.random() * totalWeight;
		let pickedIdx = 0;
		for (let j = 0; j < available.length; j++) {
			roll -= calculateWeight(available[j]);
			if (roll <= 0) {
				pickedIdx = j;
				break;
			}
		}
		selectedChars.push(available[pickedIdx]);
		available.splice(pickedIdx, 1);
	}

	// Map each selected character to a rich StoryCandidateChoice
	return selectedChars.map((char) => {
		const state = clientStates[char.id] || {
			characterId: char.id,
			currentStageIndex: 0,
			cooldownRoundsRemaining: 0,
			timesHelped: 0,
			timesOffered: 0,
			timesSkipped: 0,
			isLost: false,
			selectionWeight: 100
		};
		const stageIndex = Math.min(state.currentStageIndex, char.stages.length - 1);
		const stage = char.stages[stageIndex];

		let snippet = stage.selectionSnippet.firstTime;
		let relationshipStatus: "new" | "returning_helped" | "returning_skipped" = "new";
		let relationshipNote = "New Inquiry";

		if (state.timesHelped > 0) {
			relationshipStatus = "returning_helped";
			snippet = stage.selectionSnippet.returningHelped;
			relationshipNote = `Returning Client • Helped ${state.timesHelped}x`;
		} else if (state.timesSkipped > 0) {
			relationshipStatus = "returning_skipped";
			snippet = stage.selectionSnippet.returningSkipped;
			relationshipNote = `Follow-Up Inquiry • Missed ${state.timesSkipped}x`;
		}

		// Calculate overview metrics
		const rawIncome = (stage.financialState.income || []).reduce((sum, inc) => sum + inc.amount, 0);
		const rawExpenses = (stage.financialState.expenses || []).reduce((sum, exp) => sum + (exp.defaultAmount !== undefined ? exp.defaultAmount : exp.amount || 0), 0);

		return {
			character: char,
			stage,
			clientState: state,
			snippet,
			relationshipStatus,
			relationshipNote,
			primaryWorry: stage.lifeEvent?.title || stage.stageTitle,
			monthlyIncome: rawIncome,
			monthlyExpenses: rawExpenses
		};
	});
}

export function handleCandidateSelectionUpdate(
	clientStates: Record<string, CharacterClientState>,
	chosenId: string,
	offeredIds: string[],
	roundNumber: number
): Record<string, CharacterClientState> {
	const updated = { ...clientStates };

	offeredIds.forEach((id) => {
		const s = { ...(updated[id] || {
			characterId: id,
			currentStageIndex: 0,
			cooldownRoundsRemaining: 0,
			timesHelped: 0,
			timesOffered: 0,
			timesSkipped: 0,
			isLost: false,
			selectionWeight: 100
		}) };

		s.timesOffered += 1;
		s.lastRoundOffered = roundNumber;

		if (id === chosenId) {
			// Selected by player!
			// We do not increment timesHelped yet until they successfully complete the session
		} else {
			// Skipped!
			s.timesSkipped += 1;
			s.selectionWeight = Math.max(5, Math.floor(s.selectionWeight * 0.5));

			// Rule: not selecting a character should make them less likely to come back or not at all
			if (s.timesSkipped >= 3 && s.timesHelped === 0) {
				// 75% chance they find another advisor or drift away permanently
				if (Math.random() < 0.75 || s.timesSkipped >= 4) {
					s.isLost = true;
				}
			} else if (s.timesSkipped >= 4) {
				s.isLost = true;
			}
		}

		updated[id] = s;
	});

	return updated;
}

export function handleSessionCompletion(
	clientStates: Record<string, CharacterClientState>,
	characterId: string,
	finalFinancialState: any,
	roundNumber: number
): Record<string, CharacterClientState> {
	const updated = { ...clientStates };
	const char = CHARACTER_MAP[characterId];
	if (!char || !updated[characterId]) return updated;

	const s = { ...updated[characterId] };
	const currentStage = char.stages[s.currentStageIndex];

	s.timesHelped += 1;
	s.timesSkipped = 0; // Fresh bond restored
	s.selectionWeight = 130; // High loyalty
	s.lastRoundHelped = roundNumber;
	s.cooldownRoundsRemaining = currentStage ? currentStage.cooldownRounds : 2;
	s.savedFinancialState = finalFinancialState;
	s.currentStageIndex += 1;

	updated[characterId] = s;
	return updated;
}

export function buildStoryLevel(
	char: CharacterDefinition,
	stage: CharacterStage,
	clientState: CharacterClientState,
	roundNumber: number
): any {
	let startingState = JSON.parse(JSON.stringify(stage.financialState));

	// If player previously helped this client, carry forward their existing accounts
	if (clientState.savedFinancialState && clientState.timesHelped > 0) {
		const prev = clientState.savedFinancialState;
		if (prev.accounts && prev.accounts.length > 0) {
			// Carry forward saved accounts with modest growth/carryover
			startingState.accounts = prev.accounts.map((acc: any) => ({
				...acc,
				balance: Math.max(100, Math.round(acc.balance * 1.05))
			}));
		}
	}

	return {
		id: `story_${char.id}_stage_${stage.stageId}_r${roundNumber}`,
		levelId: `story_${char.id}_stage_${stage.stageId}_r${roundNumber}`,
		category: "story",
		desc: `${stage.stageTitle} - ${stage.occupation}`,
		toTeach: `Advise ${char.name} through life milestone: ${stage.stageTitle}`,
		forecastMonths: 12,
		client: {
			name: char.name,
			age: stage.age,
			occupation: stage.occupation,
			stageTitle: stage.stageTitle,
			avatarEmoji: char.avatarEmoji,
			emotion: stage.dialogue.emotion,
			description: `Age ${stage.age} • ${stage.occupation}`,
			prompt: stage.dialogue.greeting,
			portraitId: char.portraitId,
			lifeEvent: stage.lifeEvent,
			characterId: char.id,
			stageId: stage.stageId,
			dialogue: stage.dialogue
		},
		startingState,
		allowedActions: stage.allowedActions || {
			canCreateAccounts: true,
			canDeleteAccounts: true,
			allowedAccountTypes: ["checking", "savings", "brokerage"],
			allowedCardTypes: ["debit", "credit"]
		},
		winConditions: stage.winConditions || { requiredAccounts: ["checking", "savings"] }
	};
}
