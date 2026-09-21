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

  // Check Required Accounts
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

  // Check Goals
  goals.forEach(goal => {
    const configuredGoalDeadline =
      winConditions.goalsFundedWithinMonths?.goalId === goal.id
        ? winConditions.goalsFundedWithinMonths.months
        : goal.targetMonths;
    if (configuredGoalDeadline) {
      const forecast = generateForecast(accounts, incomes, transferRules, goals, expenses, cards, configuredGoalDeadline);
      const finalSnapshot = forecast[forecast.length - 1];
      const finalAmount = finalSnapshot?.goalProgress[goal.id] || 0;
      
      const hitMonth = finalSnapshot?.goalHitMonths[goal.id];
      
      if (finalAmount >= goal.targetAmount) {
        if (hitMonth && hitMonth < configuredGoalDeadline) {
          score += 10;
          feedback.push(`Excellent: You reached $${goal.targetAmount} for "${goal.name}" early in Month ${hitMonth}! (+10 pts)`);
        } else {
          feedback.push(`Success: You reached $${goal.targetAmount} for "${goal.name}" within ${configuredGoalDeadline} months!`);
        }
      } else {
        score -= 30;
        feedback.push(`Missed Timeline: "${goal.name}" only reached $${finalAmount.toFixed(2)} out of $${goal.targetAmount} after ${configuredGoalDeadline} months.`);
      }
    }
  });

  // Check card expenses
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

  // Check minimum funding for variable expenses
  const VARIABLE_EXPENSE_MIN_PENALTY = 10;
  const expenseForecast = generateForecast(accounts, incomes, transferRules, goals, expenses, cards, 12);
  expenses.forEach(expense => {
    if (expense.isFixed || expense.minValue === undefined) return;

    const violation = expenseForecast.find(snapshot =>
      (snapshot.expenseProgress[expense.id] ?? 0) < expense.minValue! - 0.01
    );

    if (violation) {
      score -= VARIABLE_EXPENSE_MIN_PENALTY;
      const actual = violation.expenseProgress[expense.id] ?? 0;
      feedback.push(
        `Minimum Funding Warning: "${expense.name}" falls below its $${expense.minValue!.toFixed(2)} minimum in Month ${violation.month}, receiving only $${actual.toFixed(2)}. (-${VARIABLE_EXPENSE_MIN_PENALTY} pts)`
      );
    }
  });

  // Ensure cash balance isn't piling up
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