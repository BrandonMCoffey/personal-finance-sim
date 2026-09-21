import type { Account, Income, TransferRule, Goal, WinConditions, Expense, Card } from '../store/financeStore';
import { generateForecast } from './forecast';

export interface ValidationReport {
  passed: boolean;
  score: number;
  feedback: string[];
}

export function evaluatePlan(
  accounts: Account[],
  incomes: Income[],
  transferRules: TransferRule[],
  goals: Goal[],
  expenses: Expense[],
  cards: Card[],
  winConditions: WinConditions | null
): ValidationReport {
  const feedback: string[] = [];
  let score = 100;

  if (!winConditions) {
    return { passed: false, score: 0, feedback: ["No win conditions found for this level."] };
  }

  // 1. Check Required Accounts
  if (winConditions.requiredAccounts) {
    const existingTypes = accounts.map(a => a.type);
    winConditions.requiredAccounts.forEach(reqType => {
      if (!existingTypes.includes(reqType)) {
        score -= 20;
        feedback.push(`Missing account type: You need to open a ${reqType} account.`);
      } else {
        feedback.push(`Great job opening a ${reqType} account.`);
      }
    });
  }

  // 2. Check Goals Funded
  if (winConditions.goalsFundedWithinMonths) {
    const targetGoal = goals.find(g => g.id === winConditions.goalsFundedWithinMonths?.goalId);
    if (targetGoal) {
      const targetMonths = winConditions.goalsFundedWithinMonths.months;
      const forecast = generateForecast(accounts, incomes, transferRules, goals, expenses, cards, targetMonths);
      const finalSnapshot = forecast[forecast.length - 1];
      const finalAmount = finalSnapshot.goalProgress[targetGoal.id] || 0;
      
      if (finalAmount >= targetGoal.targetAmount) {
        feedback.push(`Success: ${targetGoal.name} is fully funded within ${targetMonths} months!`);
      } else {
        score -= 30;
        feedback.push(`Missed Goal: ${targetGoal.name} only reached $${finalAmount.toFixed(2)} out of $${targetGoal.targetAmount} after ${targetMonths} months.`);
      }
    }
  }

  // 2. Check card expenses
  expenses.forEach(exp => {
    if (exp.requiresCard) {
      const fundingRule = transferRules.find(r => r.destinationId === exp.id);
      if (fundingRule) {
        const sourceIsAccount = accounts.some(a => a.id === fundingRule.sourceId);
        if (sourceIsAccount) {
          score -= 15;
          feedback.push(`Payment Error: "${exp.name}" requires a Debit or Credit Card, but you are trying to pay it directly via routing number from a bank account.`);
        }
      }
    }
  });

  // 4. Ensure cash balance isn't piling up
  if (winConditions.maxCashBalance !== undefined) {
    const cashAccounts = accounts.filter(a => a.type === 'cash');
    
    const incomeToCash = incomes.some(inc => inc.routings?.some(route => cashAccounts.some(c => c.id === route.destinationId)));
    const transferToCash = transferRules.some(rule => cashAccounts.some(c => c.id === rule.destinationId));

    if (incomeToCash || transferToCash) {
      score -= 20;
      feedback.push(`Risk Warning: You are routing incoming money into physical cash. In the modern world, incoming funds should be secured directly into a bank account.`);
    }

    const sweepForecast = generateForecast(accounts, incomes, transferRules, goals, expenses, cards, 1);
    const finalCash = cashAccounts.reduce((sum, acc) => sum + (sweepForecast[0]?.accountBalances[acc.id] || 0), 0);

    if (finalCash > winConditions.maxCashBalance) {
      score -= 20;
      feedback.push(`Unsecured Funds: You have $${finalCash.toFixed(2)} left as physical cash. Connect it to a bank account to deposit it securely.`);
    } else if (cashAccounts.length > 0 && finalCash <= winConditions.maxCashBalance) {
      feedback.push(`Good habit: You successfully deposited physical cash into a secure account.`);
    }
  }

  const fullForecast = generateForecast(accounts, incomes, transferRules, goals, expenses, cards, 12); 
  let overdraftFound = false;

  fullForecast.forEach(snap => {
    Object.entries(snap.accountBalances).forEach(([accId, balance]) => {
      if (balance < -0.01 && !overdraftFound) {
        const accName = accounts.find(a => a.id === accId)?.name || 'An account';
        score -= 40;
        feedback.push(`Overdraft Error: Your plan causes "${accName}" to drop into the negative. You cannot spend more money than you have in a bank account.`);
        overdraftFound = true;
      }
    });
  });

  const finalScore = Math.max(0, score);
  return {
    passed: finalScore >= 60,
    score: finalScore,
    feedback
  };
}