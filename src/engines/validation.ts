import type { Account, Income, TransferRule, Goal, WinConditions, Expense } from '../store/financeStore';
import { generateForecast } from './forecast';

export interface ValidationReport {
  passed: boolean;
  score: number; // 0 to 100
  feedback: string[];
}

export function evaluatePlan(
  accounts: Account[],
  incomes: Income[],
  transferRules: TransferRule[],
  goals: Goal[],
  expenses: Expense[],
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
      
      const forecast = generateForecast(accounts, incomes, transferRules, goals, expenses, targetMonths);
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

  // 3. Ensure cash balance isn't piling up
  if (winConditions.maxCashBalance !== undefined) {
    const cashAccounts = accounts.filter(a => a.type === 'cash');
    const totalCash = cashAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    
    const incomeToCash = incomes.some(inc => 
      inc.routings && inc.routings.some(route => 
        cashAccounts.find(c => c.id === route.destinationId)
      )
    );

    if (totalCash > winConditions.maxCashBalance || incomeToCash) {
      score -= 20;
      feedback.push(`Risk Warning: You are holding too much physical cash or routing income to a cash location. Move funds to a secure bank account.`);
    }
  }

  const finalScore = Math.max(0, score);
  return {
    passed: finalScore >= 60,
    score: finalScore,
    feedback
  };
}