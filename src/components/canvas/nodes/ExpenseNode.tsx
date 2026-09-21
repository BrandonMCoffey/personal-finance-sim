import { Handle, Position } from '@xyflow/react';
import { useFinanceStore } from '../../../store/financeStore';

interface ExpenseNodeProps {
  data: {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    isFixed: boolean;
    minValue?: number;
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

  const fundedAmount = incomingRule?.amount || 0;
  const minRequired = data.minValue || data.targetAmount;
  
  let colorStyle = '';
  let sliderFill = '';
  let sliderTrack = '';
  let textColor = '';

  if (fundedAmount === 0) {
    // Not Connected
    colorStyle = 'bg-white border-red-200';
    sliderFill = '#ef4444'; sliderTrack = '#fee2e2'; textColor = 'text-red-900';
  } else if (fundedAmount < minRequired) {
    // Deficit
    colorStyle = 'bg-red-50 border-red-400';
    sliderFill = '#ef4444'; sliderTrack = '#fee2e2'; textColor = 'text-red-900';
  } else if (fundedAmount >= minRequired && fundedAmount < data.targetAmount) {
    // Partial / Minimum Met (Warning)
    colorStyle = 'bg-amber-50 border-amber-400';
    sliderFill = '#f59e0b'; sliderTrack = '#fef3c7'; textColor = 'text-amber-900';
  } else if (fundedAmount === data.targetAmount) {
    // Exact Target
    colorStyle = 'bg-blue-50 border-blue-400';
    sliderFill = '#3b82f6'; sliderTrack = '#dbeafe'; textColor = 'text-blue-900';
  } else {
    // Surplus
    colorStyle = 'bg-indigo-50 border-indigo-400';
    sliderFill = '#6366f1'; sliderTrack = '#e0e7ff'; textColor = 'text-indigo-900';
  }

  const snappedStyle = data.isSnapped ? 'rounded-t-none shadow-none z-0' : 'rounded-md shadow-md z-10';
  
  // Slider Limits
  const sliderMax = data.isFixed ? data.targetAmount : (data.targetAmount * 1.5);
  const fillPercentage = incomingRule ? Math.min((fundedAmount / sliderMax) * 100, 100) : 0;

  return (
    <div className={`relative px-4 py-3 border-2 w-[160px] transition-colors duration-300 ${snappedStyle} ${colorStyle}`}>
      <style>{`
        .expense-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 0; height: 0; }
        .expense-slider::-moz-range-thumb { width: 0; height: 0; border: 0; }
      `}</style>

      {!data.isSnapped && <Handle type="target" position={Position.Left} className="w-3 h-3 bg-red-500" />}
      
      <div className="flex justify-between items-center mb-1">
        <span className={`text-sm font-bold truncate ${textColor}`}>{data.name}</span>
        {data.isFixed && <span className="text-[9px] uppercase font-black opacity-40 ml-1 shrink-0">Fixed</span>}
      </div>
      
      {incomingRule ? (
        <input 
          type="range" min="0" max={sliderMax} value={incomingRule.amount}
          disabled={data.isFixed}
          onChange={(e) => {
            if (isIncomeRule) updateIncomeRoute(sourceId, data.id, Number(e.target.value), 'fixed');
            else updateTransferRule(incomingRule.id, Number(e.target.value), 'fixed');
          }}
          style={{ background: `linear-gradient(to right, ${sliderFill} ${fillPercentage}%, ${sliderTrack} ${fillPercentage}%)` }}
          className={`nodrag expense-slider w-full h-2 mt-2 rounded-full transition-all appearance-none outline-none ${data.isFixed ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
        />
      ) : (
        <div className="w-full bg-red-100 rounded-full h-2 mt-2">
          <div 
            className="bg-red-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${Math.min((data.currentAmount / data.targetAmount) * 100, 100)}%` }}
          ></div>
        </div>
      )}
      
      <div className={`text-[10px] text-right mt-1 font-medium ${textColor} opacity-80`}>
        ${data.currentAmount.toFixed(0)} /${data.targetAmount.toFixed(0)} / mo
      </div>
    </div>
  );
}