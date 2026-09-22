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

function interpolateColor(color1: number[], color2: number[], factor: number) {
  const r = Math.round(color1[0] + factor * (color2[0] - color1[0]));
  const g = Math.round(color1[1] + factor * (color2[1] - color1[1]));
  const b = Math.round(color1[2] + factor * (color2[2] - color1[2]));
  return `${r}, ${g}, ${b}`;
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
  const sliderMax = data.isFixed ? data.targetAmount : (data.targetAmount * 1.5);
  const fillPercentage = incomingRule ? Math.min((fundedAmount / sliderMax) * 100, 100) : 0;

  const cRedLight = [239, 68, 68]; // Normal
  const cRed = [255, 0, 0];        // Deficit
  const cAmber = [245, 158, 11];   // Minimum Met
  const cBlue = [59, 130, 246];    // Target Met
  const cIndigo = [5, 50, 255];  // Surplus

  let currentRgb = cRedLight.join(', ');

  if (fundedAmount == data.targetAmount) {
    currentRgb = cBlue.join(', ');
  } else if (fundedAmount < minRequired) {
    currentRgb = cRed.join(', ');
  } else if (fundedAmount > minRequired && fundedAmount < data.targetAmount) {
    const range = data.targetAmount - minRequired;
    const factor = range > 0 ? ((fundedAmount - minRequired) / range) : 1;
    currentRgb = interpolateColor(cAmber, cBlue, factor);
  } else if (fundedAmount > data.targetAmount) {
    const range = sliderMax - data.targetAmount;
    const factor = range > 0 ? ((fundedAmount - data.targetAmount) / range) : 1;
    currentRgb = interpolateColor(cBlue, cIndigo, factor);
  }

  const snappedStyle = data.isSnapped ? 'rounded-t-none shadow-none z-0' : 'rounded-md shadow-md z-10';

  return (
    <div
      className={`relative px-4 py-3 border-2 w-[160px] min-h-[70px] flex flex-col justify-between bg-white transition-colors ${snappedStyle}`}
      style={{ borderColor: `rgba(${currentRgb}, 0.5)` }}
    >
      <style>{`
          .expense-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 0; height: 0; }
          .expense-slider::-moz-range-thumb { width: 0; height: 0; border: 0; }
        `}</style>
      {!data.isSnapped && <Handle type="target" position={Position.Left} className="w-3 h-3 bg-red-500" />}

      <div className="flex justify-between items-start mb-1">
        <span
          className="text-sm font-bold truncate leading-tight"
          style={{ color: `rgb(${currentRgb})` }}
        >
          {data.name}
        </span>
        {data.isFixed && <span className="text-[9px] uppercase font-black opacity-40 ml-1 shrink-0">Fixed</span>}
      </div>

      <div className="w-full">
        {incomingRule ? (
          <input
            type="range" min="0" max={sliderMax} value={incomingRule.amount}
            disabled={data.isFixed}
            onChange={(e) => {
              if (isIncomeRule) updateIncomeRoute(sourceId, data.id, Number(e.target.value), 'fixed');
              else updateTransferRule(incomingRule.id, Number(e.target.value), 'fixed');
            }}
            style={{
              background: `linear-gradient(to right, rgb(${currentRgb}) ${fillPercentage}%, rgba(${currentRgb}, 0.15) ${fillPercentage}%)`
            }}
            className={`nodrag expense-slider w-full h-2 mt-1 rounded-full appearance-none outline-none ${data.isFixed ? 'cursor-not-allowed opacity-90' : 'cursor-pointer'}`}
          />
        ) : (
          <div className="w-full bg-red-100 rounded-full h-2 mt-1">
            <div
              className="h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((data.currentAmount / data.targetAmount) * 100, 100)}%`, backgroundColor: `rgb(${cRed.join(',')})` }}
            ></div>
          </div>
        )}
        <div
          className="text-[10px] text-right mt-1 font-medium opacity-80"
          style={{ color: `rgb(${currentRgb})` }}
        >
          ${data.currentAmount.toFixed(0)} /${data.targetAmount.toFixed(0)} / mo
        </div>
      </div>
    </div>
  );
}