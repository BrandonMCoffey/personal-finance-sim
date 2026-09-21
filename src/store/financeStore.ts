import { create } from 'zustand';

// --- Type Definitions ---
export type AccountType = 'cash' | 'checking' | 'savings' | 'credit' | 'bank';

export interface AllowedActions {
  canCreateAccounts: boolean;
  canDeleteAccounts: boolean;
  allowedAccountTypes: AccountType[];
  maxNewAccounts?: number;
  allowedCardTypes?: ('debit' | 'credit')[];
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
  type: 'debit' | 'credit';
  linkedAccountId: string;
  balance: number;
  limit?: number;
  apr?: number;
}

export interface IncomeRoute {
  destinationId: string;
  amount: number;
  type: 'fixed' | 'percentage';
}

export interface Income {
  id: string;
  name: string;
  amount: number;
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
  type: 'fixed' | 'percentage';
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
}

// --- Store Interface ---
interface FinanceState {
  currentScreen: 'menu' | 'game';
  levelScores: Record<number, number>;
  isAllUnlocked: boolean;
  levelId: number | null;
  client: Client | null;
  expenses: Expense[];
  accounts: Account[];
  cards: Card[];
  incomes: Income[];
  goals: Goal[];
  transferRules: TransferRule[];
  winConditions: WinConditions | null;
  forecastMonths: number;
  allowedActions: AllowedActions | null;
  initialAccountCount: number;

  setCurrentScreen: (screen: 'menu' | 'game') => void;
  saveLevelScore: (levelId: number, score: number) => void;
  unlockAllLevels: () => void;
  clearProgress: () => void;
  loadLevel: (levelData: any) => void;

  addAccount: (name: string, type: AccountType) => void;
  removeAccount: (accountId: string) => void;
  addCard: (name: string, type: 'debit' | 'credit', linkedAccountId: string) => void;
  removeCard: (cardId: string) => void;
  updateCardLink: (cardId: string, accountId: string) => void;
  
  addIncomeRoute: (incomeId: string, destinationId: string, defaultAmount?: number, defaultType?: 'fixed' | 'percentage') => void;
  updateIncomeRoute: (incomeId: string, destinationId: string, amount: number, type: 'fixed' | 'percentage') => void;
  removeIncomeRoute: (incomeId: string, destinationId: string) => void;
  reorderIncomeRoutes: (incomeId: string, startIndex: number, endIndex: number) => void;
  
  addTransferRule: (sourceId: string, destinationId: string, amount?: number, type?: 'fixed' | 'percentage') => void;
  updateTransferRule: (ruleId: string, amount: number, type: 'fixed' | 'percentage') => void;
  removeTransferRule: (ruleId: string) => void;
  reorderTransferRules: (sourceId: string, startIndex: number, endIndex: number) => void;
}

// --- Zustand Implementation ---
export const useFinanceStore = create<FinanceState>()((set) => ({
  currentScreen: 'menu',
  levelScores: JSON.parse(localStorage.getItem('finance_scores') || '{}'),
  isAllUnlocked: localStorage.getItem('finance_unlocked') === 'true',
  
  levelId: null,
  client: null,
  expenses: [],
  accounts: [],
  cards: [],
  incomes: [],
  goals: [],
  transferRules: [],
  winConditions: null,
  forecastMonths: 6,
  allowedActions: null,
  initialAccountCount: 0,

  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  
  saveLevelScore: (levelId, score) => set((state) => {
    const currentHigh = state.levelScores[levelId] || 0;
    const newScores = { ...state.levelScores, [levelId]: Math.max(currentHigh, score) };
    localStorage.setItem('finance_scores', JSON.stringify(newScores));
    return { levelScores: newScores };
  }),

  unlockAllLevels: () => set(() => {
    localStorage.setItem('finance_unlocked', 'true');
    return { isAllUnlocked: true };
  }),

  clearProgress: () => set(() => {
    localStorage.removeItem('finance_scores');
    localStorage.removeItem('finance_unlocked');
    return { levelScores: {}, isAllUnlocked: false };
  }),

  loadLevel: (levelData: any) => set({
    levelId: levelData.levelId,
    client: levelData.client || null,
    expenses: (levelData.startingState?.expenses || []).map((exp: any) => ({
      ...exp,
      requiresCard: exp.requiresCard || false
    })),
    accounts: levelData.startingState?.accounts || [],
    cards: levelData.startingState?.cards || [],
    incomes: (levelData.startingState?.income || []).map((inc: any) => ({
      ...inc,
      routings: inc.routings ? inc.routings.map((r: any) => ({
        destinationId: r.destinationId,
        amount: r.percentage || r.amount || 10,
        type: r.type || 'percentage'
      })) : []
    })),
    goals: levelData.startingState?.goals || [],
    transferRules: levelData.startingState?.transferRules || [],
    winConditions: levelData.winConditions || null,
    forecastMonths: levelData.forecastMonths || 6,
    allowedActions: levelData.allowedActions || null,
    initialAccountCount: levelData.startingState?.accounts?.length || 0,
  }),

  addAccount: (name, type) => set((state) => ({
    accounts: [...state.accounts, {
      id: `acc_${Date.now()}`, name, type, balance: 0, apy: type === 'savings' ? 2.5 : 0
    }]
  })),

  removeAccount: (accountId) => set((state) => {
    if (!state.allowedActions?.canDeleteAccounts) {
      const initialAccountIds = state.accounts.slice(0, state.initialAccountCount).map(a => a.id);
      if (initialAccountIds.includes(accountId)) return state;
    }

    return {
      accounts: state.accounts.filter(a => a.id !== accountId),
      transferRules: state.transferRules.filter(r => r.sourceId !== accountId && r.destinationId !== accountId),
      incomes: state.incomes.map(inc => ({
        ...inc,
        routings: inc.routings?.filter(r => r.destinationId !== accountId)
      }))
    };
  }),

  addCard: (name, type, linkedAccountId) => set((state) => ({
    cards: [
      ...state.cards,
      {
        id: `card_${Date.now()}`,
        name,
        type,
        linkedAccountId,
        balance: 0,
        limit: type === 'credit' ? 5000 : undefined,
        apr: type === 'credit' ? 19.99 : 0
      }
    ]
  })),

  removeCard: (cardId) => set((state) => ({
    cards: state.cards.filter(c => c.id !== cardId),
    transferRules: state.transferRules.filter(r => r.destinationId !== cardId && r.sourceId !== cardId)
  })),

  updateCardLink: (cardId, accountId) => set((state) => ({
    cards: state.cards.map(c => c.id === cardId ? { ...c, linkedAccountId: accountId } : c)
  })),

  // --- INCOME ACTIONS ---
  addIncomeRoute: (incomeId, destinationId, defaultAmount = 10, defaultType = 'percentage') => set((state) => ({
    incomes: state.incomes.map(income => {
      if (income.id !== incomeId) return income;
      
      const existing = income.routings || [];
      if (existing.find(r => r.destinationId === destinationId)) return income;

      if (defaultType === 'fixed') {
        return {
          ...income,
          routings: [{ destinationId, amount: defaultAmount, type: 'fixed' }, ...existing]
        };
      }

      const newCount = existing.length + 1;
      const split = Math.floor(100 / newCount);
      const updatedPrior = existing.map(r => r.type === 'percentage' ? { ...r, amount: split } : r);
      
      return {
        ...income,
        routings: [...updatedPrior, { destinationId, amount: split, type: 'percentage' }]
      };
    })
  })),

  updateIncomeRoute: (incomeId, destinationId, amount, type) => set((state) => ({
    incomes: state.incomes.map(income => {
      if (income.id !== incomeId || !income.routings) return income;
      return {
        ...income,
        routings: income.routings.map(r => r.destinationId === destinationId ? { ...r, amount, type } : r)
      };
    })
  })),

  removeIncomeRoute: (incomeId, destinationId) => set((state) => ({
    incomes: state.incomes.map(income => {
      if (income.id !== incomeId) return income;
      return {
        ...income,
        routings: (income.routings || []).filter(r => r.destinationId !== destinationId)
      };
    })
  })),

  reorderIncomeRoutes: (incomeId, startIndex, endIndex) => set((state) => ({
    incomes: state.incomes.map(income => {
      if (income.id !== incomeId || !income.routings) return income;
      const newRoutings = Array.from(income.routings);
      const [moved] = newRoutings.splice(startIndex, 1);
      newRoutings.splice(endIndex, 0, moved);
      return { ...income, routings: newRoutings };
    })
  })),

  // --- TRANSFER ACTIONS ---
  addTransferRule: (sourceId, destinationId, amount = 10, type = 'percentage') => set((state) => {
    if (state.transferRules.find(r => r.sourceId === sourceId && r.destinationId === destinationId)) {
      return { transferRules: state.transferRules };
    }
    return {
      transferRules: [
        ...state.transferRules,
        { id: `rule_${Date.now()}`, sourceId, destinationId, amount, type }
      ]
    };
  }),

  updateTransferRule: (ruleId, amount, type) => set((state) => ({
    transferRules: state.transferRules.map(rule =>
      rule.id === ruleId ? { ...rule, amount, type } : rule
    )
  })),

  removeTransferRule: (ruleId) => set((state) => ({
    transferRules: state.transferRules.filter(rule => rule.id !== ruleId)
  })),

  reorderTransferRules: (sourceId, startIndex, endIndex) => set((state) => {
    const sourceRules = state.transferRules.filter(r => r.sourceId === sourceId);
    const otherRules = state.transferRules.filter(r => r.sourceId !== sourceId);
    
    const newSourceRules = Array.from(sourceRules);
    const [moved] = newSourceRules.splice(startIndex, 1);
    newSourceRules.splice(endIndex, 0, moved);

    return { transferRules: [...otherRules, ...newSourceRules] };
  }),
}));