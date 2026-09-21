import { useState } from 'react';
import { Panel } from '@xyflow/react';
import { useFinanceStore } from '../../store/financeStore';

interface OutputEditorPanelProps {
  selectedEdgeId: string | null;
  onClose: () => void;
}

export function OutputEditorPanel({ selectedEdgeId, onClose }: OutputEditorPanelProps) {
  const { 
    accounts, incomes, goals, expenses, transferRules, cards, 
    updateIncomeRoute, removeIncomeRoute, reorderIncomeRoutes,
    updateTransferRule, removeTransferRule, reorderTransferRules 
  } = useFinanceStore();

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  if (!selectedEdgeId) return null;

  let sourceId = '';
  if (selectedEdgeId.startsWith('inc|')) {
    sourceId = selectedEdgeId.split('|')[1];
  } else if (selectedEdgeId.startsWith('rule|')) {
    const ruleId = selectedEdgeId.split('|')[1];
    sourceId = transferRules.find(r => r.id === ruleId)?.sourceId || '';
  }
  
  if (!sourceId) return null;

  const isIncome = incomes.some(i => i.id === sourceId);
  const sourceAccount = accounts.find(a => a.id === sourceId);
  const sourceCard = cards.find(c => c.id === sourceId);
  const isCashAccount = sourceAccount?.type === 'cash';

  const sourceName = isIncome 
    ? incomes.find(i => i.id === sourceId)?.name 
    : (sourceAccount?.name || sourceCard?.name || 'Unknown');
  
  const sourceTotal = isIncome 
    ? (incomes.find(i => i.id === sourceId)?.amount || 0) 
    : (sourceAccount?.balance || sourceCard?.balance || 0);
  
  const activeIncome = incomes.find(i => i.id === sourceId);
  const itemsList = isIncome ? (activeIncome?.routings || []) : transferRules.filter(r => r.sourceId === sourceId);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIndex) return;
    if (isIncome) reorderIncomeRoutes(sourceId, draggedIdx, dropIndex);
    else reorderTransferRules(sourceId, draggedIdx, dropIndex);
    setDraggedIdx(null);
  };

  const calculateUnallocated = () => {
    if (itemsList.length === 0) return '100%';
    const allFixed = itemsList.every((i: any) => i.type === 'fixed');
    
    if (allFixed) {
      const sum = itemsList.reduce((acc: number, curr: any) => acc + curr.amount, 0);
      return `$${Math.max(0, sourceTotal - sum).toFixed(2)}`;
    } else {
      const percentSum = itemsList.filter((i: any) => i.type === 'percentage').reduce((acc: number, curr: any) => acc + curr.amount, 0);
      return `${Math.max(0, 100 - percentSum)}%`;
    }
  };

  return (
    <Panel position="top-right" className="bg-white p-4 rounded-lg shadow-xl border w-80 m-4 z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-800 text-sm">Outputs: {sourceName}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold">×</button>
      </div>

      <p className="text-xs text-gray-500 mb-3 italic">
        Drag items to change execution priority.
      </p>

      <ul className="flex flex-col gap-2">
        {itemsList.map((item: any, idx: number) => {
          const ruleId = item.id;
          const destId = item.destinationId;
          const destName = 
            accounts.find(a => a.id === destId)?.name || 
            cards.find(c => c.id === destId)?.name ||
            goals.find(g => g.id === destId)?.name || 
            expenses.find(e => e.id === destId)?.name || 'Unknown';
          
          const isGoal = goals.some(g => g.id === destId);
          const isLastIncomeRule = isIncome && idx === itemsList.length - 1;

          return (
            <li 
              key={ruleId || destId}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, idx)}
              className={`flex items-center gap-2 p-2 rounded border cursor-move ${draggedIdx === idx ? 'opacity-50' : 'bg-gray-50'}`}
            >
              <span className="text-gray-400 cursor-move">☰</span>
              <div className="flex-1 truncate text-sm font-semibold text-gray-700">{destName}</div>
              
              {isCashAccount ? (
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded text-center">
                  Deposit
                </span>
              ) : isGoal ? (
                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded text-center whitespace-nowrap">
                  Monitors Balance
                </span>
              ) : isLastIncomeRule ? (
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded text-center whitespace-nowrap">
                  Remaining
                </span>
              ) : (
                <div className="flex items-center gap-1">
                  <input 
                    type="number" min="0" value={item.amount}
                    onChange={(e) => isIncome 
                      ? updateIncomeRoute(sourceId, destId, Number(e.target.value), item.type)
                      : updateTransferRule(ruleId, Number(e.target.value), item.type)
                    }
                    className="border rounded px-1 py-1 w-16 text-xs text-right bg-white"
                  />
                  <select 
                    value={item.type}
                    onChange={(e) => isIncome
                      ? updateIncomeRoute(sourceId, destId, item.amount, e.target.value as any)
                      : updateTransferRule(ruleId, item.amount, e.target.value as any)
                    }
                    className="text-xs border rounded p-1 bg-white cursor-pointer"
                  >
                    <option value="percentage">%</option>
                    <option value="fixed">$</option>
                  </select>
                </div>
              )}
              
              <button 
                onClick={() => {
                  if (isIncome) removeIncomeRoute(sourceId, destId);
                  else removeTransferRule(ruleId);
                }}
                className="text-red-400 hover:text-red-600 px-1 ml-1 font-bold"
              >✕</button>
            </li>
          );
        })}
      </ul>

      {!isIncome && (
        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center text-xs font-bold text-gray-500">
          <span>Unallocated / Remaining:</span>
          <span className="text-blue-600 px-2 py-1 bg-blue-50 rounded">{calculateUnallocated()}</span>
        </div>
      )}
    </Panel>
  );
}