import type { Account, Income, TransferRule, Goal, Expense } from '../store/financeStore';

export interface MonthlySnapshot {
  month: number;
  accountBalances: Record<string, number>;
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
  monthsToProject: number = 6
): MonthlySnapshot[] {
  const snapshots: MonthlySnapshot[] = [];
  
  let currentBalances: Record<string, number> = {};
  let goalBalances: Record<string, number> = {};
  let goalHitMonths: Record<string, number> = {};

  accounts.forEach(acc => { currentBalances[acc.id] = acc.balance; });
  goals.forEach(goal => { goalBalances[goal.id] = 0; });

  for (let m = 1; m <= monthsToProject; m++) {
    const nextBalances = { ...currentBalances };
    const monthlyExpenseProgress: Record<string, number> = {};
    expenses.forEach(e => { monthlyExpenseProgress[e.id] = 0; });

    const applyTransfer = (destId: string, amount: number): number => {
      if (nextBalances[destId] !== undefined) {
        nextBalances[destId] += amount;
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

    // 2. Process Account Transfers
    transferRules.forEach(rule => {
      const sourceBal = nextBalances[rule.sourceId];
      if (sourceBal === undefined) return;

      let transferAmount = 0;
      if (rule.type === 'fixed') transferAmount = rule.amount;
      else if (rule.type === 'percentage') transferAmount = Math.max(0, sourceBal) * (rule.amount / 100);

      if (transferAmount > 0) {
        nextBalances[rule.sourceId] -= transferAmount;
        applyTransfer(rule.destinationId, transferAmount);
      }
    });

    // 3. Process Interest
    accounts.forEach(acc => {
      if (acc.apy > 0 && nextBalances[acc.id] > 0) {
        nextBalances[acc.id] += nextBalances[acc.id] * ((acc.apy / 100) / 12);
      }
    });

    snapshots.push({
      month: m,
      accountBalances: nextBalances,
      goalProgress: { ...goalBalances },
      expenseProgress: { ...monthlyExpenseProgress },
      goalHitMonths: { ...goalHitMonths }
    });
    
    currentBalances = nextBalances;
  }

  return snapshots;
}