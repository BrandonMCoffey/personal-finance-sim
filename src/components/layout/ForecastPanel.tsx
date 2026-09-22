import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useFinanceStore } from '../../store/financeStore';
import { generateForecast } from '../../engines/forecast';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444'];

export function ForecastPanel() {
  const { accounts, incomes, transferRules, goals, expenses, cards, loans, retirements, forecastMonths } = useFinanceStore();

  const chartData = useMemo(() => {
    const snapshots = generateForecast(accounts, incomes, transferRules, goals, expenses, cards, loans, retirements, forecastMonths);
    return snapshots.map(snap => {
      const dataPoint: any = { month: `M${snap.month}` };
      accounts.forEach(acc => { dataPoint[acc.name] = snap.accountBalances[acc.id] || 0; });
      retirements.forEach(ret => { dataPoint[ret.name] = snap.retirementBalances[ret.id] || 0; });
      cards.forEach(card => {
        if (card.type === 'credit') dataPoint[card.name] = -(snap.cardBalances[card.id] || 0);
      });
      loans.forEach(loan => { dataPoint[loan.name] = -(snap.loanBalances[loan.id] || 0); });
      return dataPoint;
    });
  }, [accounts, incomes, transferRules, goals, expenses, cards, loans, retirements, forecastMonths]);

  return (
    <div className="flex flex-col h-full">
      <h2 className="font-semibold mb-4 border-b pb-2 text-gray-800">Forecast ({forecastMonths} Months)</h2>

      {accounts.length === 0 && cards.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm text-center">
          Add accounts and route income to see your forecast.
        </div>
      ) : (
        <div className="flex-1 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
              <Tooltip
                formatter={(value: any) => [`$${Number(value).toFixed(2)}`, 'Balance']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />

              {accounts.map((acc, index) => (
                <Line
                  key={acc.id} type="monotone" dataKey={acc.name}
                  stroke={COLORS[index % COLORS.length]} strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }}
                />
              ))}
              {cards.filter(c => c.type === 'credit').map((card, _index) => (
                <Line
                  key={card.id} type="monotone" dataKey={card.name}
                  stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5"
                  dot={{ r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4">
        {/* Goal Summary Section */}
        {goals.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Goal Trajectory</h3>
            {goals.map(goal => {
              const finalSnap = generateForecast(accounts, incomes, transferRules, goals, expenses, cards, loans, retirements, forecastMonths).pop();
              const finalAmount = finalSnap?.goalProgress[goal.id] || 0;
              const isFunded = finalAmount >= goal.targetAmount;

              return (
                <div key={goal.id} className="p-3 bg-white rounded border border-purple-100 shadow-sm text-sm mb-2">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-gray-800">{goal.name}</span>
                    <span className={isFunded ? 'text-green-600 font-bold' : 'text-gray-500'}>
                      ${finalAmount.toFixed(0)} /${goal.targetAmount}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${isFunded ? 'bg-green-500' : 'bg-purple-500'}`}
                      style={{ width: `${Math.min((finalAmount / goal.targetAmount) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Expense Summary Section */}
        {expenses.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Monthly Expenses</h3>
            {expenses.map(exp => {
              const finalSnap = generateForecast(accounts, incomes, transferRules, goals, expenses, cards, loans, retirements, forecastMonths).pop();
              const fundedAmount = finalSnap?.expenseProgress[exp.id] || 0;
              const isFunded = fundedAmount >= exp.amount;

              return (
                <div key={exp.id} className="p-3 bg-white rounded border border-red-100 shadow-sm text-sm mb-2">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium text-gray-800">{exp.name}</span>
                    <span className={isFunded ? 'text-green-600 font-bold' : 'text-red-500 font-medium'}>
                      ${fundedAmount.toFixed(0)} /${exp.amount}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${isFunded ? 'bg-green-500' : 'bg-red-400'}`}
                      style={{ width: `${Math.min((fundedAmount / exp.amount) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}