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
  let goalHitMonths: Record<string, number> = {};
  let goalProgress: Record<string, number> = {};
  goals.forEach(g => { goalProgress[g.id] = 0; });

  accounts.forEach(acc => { currentBalances[acc.id] = acc.balance; });
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

        income.routings.forEach((route, idx) => {
          const isLast = idx === income.routings!.length - 1;
          let intended = 0;

          if (isLast) {
            intended = Math.max(0, available);
          } else {
            intended = route.type === 'fixed' ? route.amount : income.amount * (route.amount / 100);
          }

          const acceptedAmount = Math.max(0, Math.min(intended, available));
          const accepted = applyTransfer(route.destinationId, acceptedAmount);
          available -= accepted;
        });
      }
    });

    // 2. Process Transfers & Card Spending
    transferRules.forEach(rule => {
      const isGoal = goals.some(g => g.id === rule.destinationId);
      if (isGoal) return;

      const sourceCard = cards.find(c => c.id === rule.sourceId);
      const destCard = cards.find(c => c.id === rule.destinationId);

      if (sourceCard) {
        const transferAmount = rule.amount;
        if (sourceCard.type === 'debit') {
          if (nextBalances[sourceCard.linkedAccountId] !== undefined) {
            nextBalances[sourceCard.linkedAccountId] -= transferAmount;
            monthlyFlows[sourceCard.linkedAccountId].out += transferAmount;
            applyTransfer(rule.destinationId, transferAmount);
          }
        } else if (sourceCard.type === 'credit') {
          nextCardBalances[sourceCard.id] += transferAmount;
          applyTransfer(rule.destinationId, transferAmount);
        }
      }
      else {
        const sourceBal = nextBalances[rule.sourceId];
        if (sourceBal === undefined) return;

        let transferAmount = 0;
        if (rule.type === 'fixed') transferAmount = rule.amount;
        else if (rule.type === 'percentage') transferAmount = Math.max(0, sourceBal) * (rule.amount / 100);

        if (transferAmount > 0) {
          nextBalances[rule.sourceId] -= transferAmount;
          monthlyFlows[rule.sourceId].out += transferAmount;

          if (destCard && destCard.type === 'credit') nextCardBalances[destCard.id] -= transferAmount;
          else applyTransfer(rule.destinationId, transferAmount);
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

    // 4. Process Goals
    accounts.forEach(acc => {
      const attachedRules = transferRules.filter(r => r.sourceId === acc.id && goals.some(g => g.id === r.destinationId));
      let availableBalance = Math.max(0, nextBalances[acc.id]);
      attachedRules.forEach(rule => {
        const goal = goals.find(g => g.id === rule.destinationId)!;
        const remainingGoal = Math.max(0, goal.targetAmount - goalProgress[goal.id]);
        const allocated = Math.min(availableBalance, remainingGoal);
        goalProgress[goal.id] += allocated;
        availableBalance -= allocated;

        nextBalances[acc.id] -= allocated;
        monthlyFlows[acc.id].out += allocated;
      });
    });

    goals.forEach(goal => {
      if (goalProgress[goal.id] >= goal.targetAmount && !goalHitMonths[goal.id]) {
        goalHitMonths[goal.id] = m;
      }
    });

    snapshots.push({
      month: m,
      accountBalances: nextBalances,
      accountFlows: monthlyFlows,
      cardBalances: nextCardBalances,
      goalProgress: { ...goalProgress },
      expenseProgress: { ...monthlyExpenseProgress },
      goalHitMonths: { ...goalHitMonths }
    });

    currentBalances = nextBalances;
    currentCardBalances = nextCardBalances;
  }

  return snapshots;
}