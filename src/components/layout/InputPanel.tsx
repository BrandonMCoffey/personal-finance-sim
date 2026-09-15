import type { Income, Expense } from '../../store/financeStore';
import { useFinanceStore } from '../../store/financeStore';

export function InputPanel() {
  const { client, incomes, expenses } = useFinanceStore();

  return (
    <div className="flex flex-col h-full gap-6 text-sm">
      
      {/* Client Brief Section */}
      <section>
        <h2 className="font-semibold text-gray-800 border-b pb-2 mb-3">Client Brief</h2>
        {client ? (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <h3 className="font-bold text-blue-900 mb-1">{client.name}</h3>
            <p className="text-blue-800 mb-3 text-xs leading-relaxed">
              {client.description}
            </p>
            <div className="bg-white p-3 rounded border border-blue-200 italic text-gray-700 shadow-sm relative">
              <span className="absolute -top-2 -left-2 text-2xl text-blue-300">"</span>
              {client.prompt}
            </div>
          </div>
        ) : (
          <p className="text-gray-400 italic">No client loaded.</p>
        )}
      </section>

      {/* Ledger Section */}
      <section className="flex-1">
        <h2 className="font-semibold text-gray-800 border-b pb-2 mb-3">Ledger</h2>
        
        {/* Incomes */}
        <div className="mb-4">
          <h3 className="font-medium text-gray-500 mb-2 uppercase text-xs tracking-wider">Income Sources</h3>
          {incomes.length === 0 && <p className="text-gray-400">None</p>}
          <ul className="flex flex-col gap-2">
            {incomes.map((inc: Income) => (
              <li key={inc.id} className="flex justify-between items-center bg-green-50 px-3 py-2 rounded border border-green-100">
                <span className="font-medium text-green-900">{inc.name}</span>
                <span className="text-green-700 font-bold">+${inc.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Expenses */}
        <div>
          <h3 className="font-medium text-gray-500 mb-2 uppercase text-xs tracking-wider">Recurring Expenses</h3>
          {expenses.length === 0 && <p className="text-gray-400">None</p>}
          <ul className="flex flex-col gap-2">
            {expenses.map((exp: Expense) => (
              <li key={exp.id} className="flex justify-between items-center bg-red-50 px-3 py-2 rounded border border-red-100">
                <span className="font-medium text-red-900">{exp.name}</span>
                <span className="text-red-700 font-bold">-${exp.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

    </div>
  );
}