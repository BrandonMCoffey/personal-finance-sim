export interface LifeEventData {
	title: string;
	description: string;
	type: "debt" | "expense" | "income" | "goal" | "insurance" | "general";
	badgeText?: string;
}

export interface SelectionSnippets {
	firstTime: string;
	returningHelped: string;
	returningSkipped: string;
}

export interface StageDialogue {
	greeting: string;
	emotion: string;
	planApproved: string;
	planNeedsWork: string;
}

export interface CharacterStartingFinancialState {
	accounts: {
		id: string;
		name: string;
		type: "cash" | "checking" | "savings" | "credit" | "bank" | "brokerage";
		balance: number;
		apy: number;
	}[];
	cards?: {
		id: string;
		name: string;
		type: "debit" | "credit";
		linkedAccountId: string;
		balance: number;
		limit?: number;
		apr?: number;
		minimumPayment?: number;
	}[];
	loans?: {
		id: string;
		name: string;
		balance: number;
		apr: number;
		minimumPayment: number;
	}[];
	income?: {
		id: string;
		name: string;
		amount: number;
		taxRate?: number;
		frequency: string;
		routings?: {
			destinationId: string;
			amount: number;
			type?: "fixed" | "percentage";
			isAuto?: boolean;
		}[];
	}[];
	expenses?: {
		id: string;
		name: string;
		defaultAmount?: number;
		amount?: number;
		maxAmount?: number;
		isFixed: boolean;
		minValue?: number;
		requiresCard?: boolean;
		frequency?: number;
		occurrenceMonth?: number;
		isCancelable?: boolean;
	}[];
	insurances?: {
		id: string;
		name: string;
		premium: number;
		deductible: number;
		coveredExpenseIds?: string[];
	}[];
	retirements?: {
		id: string;
		name: string;
		type?: "401k" | "roth_ira" | "traditional_ira";
		balance: number;
		expectedApy: number;
		employerMatchPercent: number;
	}[];
	goals?: {
		id: string;
		name: string;
		targetAmount: number;
		targetMonths?: number;
	}[];
	transferRules?: {
		id: string;
		sourceId: string;
		destinationId: string;
		amount: number;
		type: "fixed" | "percentage";
		isAuto?: boolean;
	}[];
}

export interface CharacterStage {
	stageId: string;
	stageTitle: string;
	age: number;
	occupation: string;
	yearsSinceLastStage: number;
	cooldownRounds: number;
	selectionSnippet: SelectionSnippets;
	dialogue: StageDialogue;
	lifeEvent?: LifeEventData;
	financialState: CharacterStartingFinancialState;
	winConditions?: {
		requiredAccounts?: ("cash" | "checking" | "savings" | "credit" | "bank" | "brokerage")[];
		maxCashBalance?: number;
		goalsFundedWithinMonths?: {
			goalId: string;
			months: number;
		};
		optimalDebtRouting?: "avalanche" | "snowball";
		requireInsuranceCoverage?: boolean;
	};
	allowedActions?: {
		canCreateAccounts: boolean;
		canDeleteAccounts: boolean;
		allowedAccountTypes: ("cash" | "checking" | "savings" | "credit" | "bank" | "brokerage")[];
		allowedCardTypes?: ("debit" | "credit")[];
	};
}

export interface CharacterDefinition {
	id: string;
	name: string;
	bio: string;
	avatarEmoji: string;
	portraitId: string;
	traits: string[]; // Internal personality traits (never displayed to user as tags)
	stages: CharacterStage[];
}

export interface CharacterClientState {
	characterId: string;
	currentStageIndex: number;
	cooldownRoundsRemaining: number;
	timesHelped: number;
	timesOffered: number;
	timesSkipped: number;
	isLost: boolean;
	selectionWeight: number;
	savedFinancialState?: any;
	lastRoundHelped?: number;
	lastRoundOffered?: number;
	lastScore?: number;
	lastReactionMessage?: string;
}
