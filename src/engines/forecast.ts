import type { Account, Income, TransferRule, Goal, Expense, Card } from '../store/financeStore';

export interface MonthlySnapshot {
  month: number;
  accountBalances: Record<string, number>;
  accountFlows: Record<string, { in: number; out: number }>;
  cardBalances: Record<string, number>;
  goalProgress: Record<string, number>;
  expenseProgress: Record<string, number>;
  goalHitMonths: Record<string, number>;
}

export function generateForecast(
  accounts: Account[],
  incomes: Income[],
  transferRules: TransferRule[],
  goals: Goal[],
  expenses: Expense[],
  cards: Card[],
  monthsToProject: number = 6
): MonthlySnapshot[] {
  const snapshots: MonthlySnapshot[] = [];
  
  let currentBalances: Record<string, number> = {};
  let currentCardBalances: Record<string, number> = {};
  let goalBalances: Record<string, number> = {};
  let goalHitMonths: Record<string, number> = {};

  accounts.forEach(acc => { currentBalances[acc.id] = acc.balance; });
  goals.forEach(goal => { goalBalances[goal.id] = 0; });
  cards.forEach(card => { currentCardBalances[card.id] = card.balance || 0; });

  for (let m = 1; m <= monthsToProject; m++) {
    const nextBalances = { ...currentBalances };
    const nextCardBalances = { ...currentCardBalances };
    const monthlyExpenseProgress: Record<string, number> = {};
    const monthlyFlows: Record<string, { in: number; out: number }> = {};
    
    expenses.forEach(e => { monthlyExpenseProgress[e.id] = 0; });
    accounts.forEach(a => { monthlyFlows[a.id] = { in: 0, out: 0 }; });

    const applyTransfer = (destId: string, amount: number): number => {
      if (nextBalances[destId] !== undefined) {
        nextBalances[destId] += amount;
        monthlyFlows[destId].in += amount;
        return amount;
      } 
      else if (goalBalances[destId] !== undefined) {
        const goal = goals.find(g => g.id === destId)!;
        const needed = Math.max(0, goal.targetAmount - goalBalances[destId]);
        const accepted = Math.min(amount, needed);
        goalBalances[destId] += accepted;
        if (goalBalances[destId] >= goal.targetAmount && !goalHitMonths[destId]) {
          goalHitMonths[destId] = m;
        }
        return accepted;
      } 
      else if (monthlyExpenseProgress[destId] !== undefined) {
        const expense = expenses.find(e => e.id === destId)!;
        const needed = Math.max(0, expense.amount - monthlyExpenseProgress[destId]);
        const accepted = Math.min(amount, needed);
        monthlyExpenseProgress[destId] += accepted;
        return accepted;
      }
      return 0;
    };

    // 1. Process Income
    incomes.forEach(income => {
      if (income.routings && income.routings.length > 0) {
        let available = income.amount;
        income.routings.forEach((route) => {
          let intended = route.type === 'fixed' ? route.amount : income.amount * (route.amount / 100);
          intended = Math.max(0, Math.min(intended, available));
          const accepted = applyTransfer(route.destinationId, intended);
          available -= accepted;
        });
      }
    });

    // 2. Process Transfers & Card Spending
    transferRules.forEach(rule => {
      const sourceCard = cards.find(c => c.id === rule.sourceId);
      const destCard = cards.find(c => c.id === rule.destinationId);

      // A. Money flowing FROM a Card (Paying for an expense)
      if (sourceCard) {
        const transferAmount = rule.amount; // Expenses pull fixed amounts
        
        if (sourceCard.type === 'debit') {
          // Debit passes through to the linked bank account
          if (nextBalances[sourceCard.linkedAccountId] !== undefined) {
            nextBalances[sourceCard.linkedAccountId] -= transferAmount;
            monthlyFlows[sourceCard.linkedAccountId].out += transferAmount;
            applyTransfer(rule.destinationId, transferAmount);
          }
        } else if (sourceCard.type === 'credit') {
          // Credit card spending increases debt balance
          nextCardBalances[sourceCard.id] += transferAmount;
          applyTransfer(rule.destinationId, transferAmount);
        }
      } 
      // B. Money flowing FROM an Account (Standard transfer or Paying Credit Card Bill)
      else {
        const sourceBal = nextBalances[rule.sourceId];
        if (sourceBal === undefined) return;

        let transferAmount = 0;
        if (rule.type === 'fixed') transferAmount = rule.amount;
        else if (rule.type === 'percentage') transferAmount = Math.max(0, sourceBal) * (rule.amount / 100);

        if (transferAmount > 0) {
          nextBalances[rule.sourceId] -= transferAmount;
          monthlyFlows[rule.sourceId].out += transferAmount;

          if (destCard && destCard.type === 'credit') {
            // Paying off credit card debt
            nextCardBalances[destCard.id] -= transferAmount;
          } else {
            // Standard account/goal/expense routing
            applyTransfer(rule.destinationId, transferAmount);
          }
        }
      }
    });

    // 3. Process Interest & APR
    accounts.forEach(acc => {
      if (acc.apy > 0 && nextBalances[acc.id] > 0) {
        const interest = nextBalances[acc.id] * ((acc.apy / 100) / 12);
        nextBalances[acc.id] += interest;
        monthlyFlows[acc.id].in += interest;
      }
    });

    cards.forEach(card => {
      if (card.type === 'credit' && card.apr && card.apr > 0 && nextCardBalances[card.id] > 0) {
        nextCardBalances[card.id] += nextCardBalances[card.id] * ((card.apr / 100) / 12);
      }
    });

    snapshots.push({
      month: m,
      accountBalances: nextBalances,
      accountFlows: monthlyFlows,
      cardBalances: nextCardBalances,
      goalProgress: { ...goalBalances },
      expenseProgress: { ...monthlyExpenseProgress },
      goalHitMonths: { ...goalHitMonths }
    });
    
    currentBalances = nextBalances;
    currentCardBalances = nextCardBalances;
  }

  return snapshots;
}