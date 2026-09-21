import { Handle, Position } from '@xyflow/react';
import { useFinanceStore } from '../../../store/financeStore';

interface ExpenseNodeProps {
  data: {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    isSnapped: boolean;
  };
}

export function ExpenseNode({ data }: ExpenseNodeProps) {
  const { incomes, transferRules, updateIncomeRoute, updateTransferRule } = useFinanceStore();

  let incomingRule: any = null;
  let isIncomeRule = false;
  let sourceId = '';

  for (const inc of incomes) {
    const r = inc.routings?.find(route => route.destinationId === data.id && route.type === 'fixed');
    if (r) { incomingRule = r; isIncomeRule = true; sourceId = inc.id; break; }
  }
  if (!incomingRule) {
    const r = transferRules.find(rule => rule.destinationId === data.id && rule.type === 'fixed');
    if (r) { incomingRule = r; isIncomeRule = false; sourceId = r.sourceId; }
  }

  const sliderMax = Math.max(data.targetAmount * 1.5, incomingRule?.amount || 100);
  const fillPercentage = incomingRule ? Math.min((incomingRule.amount / sliderMax) * 100, 100) : 0;

  const isFunded = data.currentAmount >= data.targetAmount;
  const snappedStyle = data.isSnapped ? 'rounded-t-none shadow-none z-0' : 'rounded-md shadow-md z-10';
  const colorStyle = isFunded ? 'bg-red-50 border-red-400' : 'bg-white border-red-200';

  return (
    <div className={`relative px-4 py-3 border-2 w-[160px] ${snappedStyle} ${colorStyle}`}>
      <style>{`
        .expense-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 0; height: 0; }
        .expense-slider::-moz-range-thumb { width: 0; height: 0; border: 0; }
      `}</style>

      {!data.isSnapped && <Handle type="target" position={Position.Left} className="w-3 h-3 bg-red-500" />}
      
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-bold text-red-900">{data.name}</span>
      </div>

      {/* Slider */}
      {incomingRule ? (
        <input 
          type="range" min="0" max={sliderMax} value={incomingRule.amount}
          onChange={(e) => {
            if (isIncomeRule) updateIncomeRoute(sourceId, data.id, Number(e.target.value), 'fixed');
            else updateTransferRule(incomingRule.id, Number(e.target.value), 'fixed');
          }}
          style={{ background: `linear-gradient(to right, #ef4444 ${fillPercentage}%, #fee2e2 ${fillPercentage}%)` }}
          className="nodrag expense-slider w-full h-2 mt-2 rounded-full cursor-pointer transition-all appearance-none outline-none"
        />
      ) : (
        <div className="w-full bg-red-100 rounded-full h-2 mt-2">
          <div 
            className="bg-red-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${Math.min((data.currentAmount / data.targetAmount) * 100, 100)}%` }}
          ></div>
        </div>
      )}
      
      <div className="text-[10px] text-red-600 text-right mt-1 font-medium">
        ${data.currentAmount.toFixed(0)} /${data.targetAmount.toFixed(0)} / mo
      </div>
    </div>
  );
}