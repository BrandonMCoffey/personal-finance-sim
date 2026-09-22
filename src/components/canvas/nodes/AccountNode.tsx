import { BaseNode } from './BaseNode';
import { useFinanceStore } from '../../../store/financeStore';

interface AccountNodeProps {
  data: {
    id: string;
    name: string;
    balance: number;
    forecastBalance: number;
    forecastMonths: number;
    accountType: string;
    apy?: number;
    history: { month: number; balance: number; goal: number; in: number; out: number }[];
  };
}

export function AccountNode({ data }: AccountNodeProps) {
  const { renameAccount } = useFinanceStore();
  const isCash = data.accountType === 'cash';
  const isNegative = data.forecastBalance < 0 && !isCash;

  let bgColor = 'bg-white';
  let borderColor = 'border-gray-200';
  if (isNegative) {
    bgColor = 'bg-red-50';
    borderColor = 'border-red-400';
  } else if (isCash) {
    bgColor = 'bg-green-50 shadow-[0_0_15px_rgba(34,197,94,0.15)]';
    borderColor = 'border-green-200';
  }

  const handleColor = isCash ? 'bg-green-500' : 'bg-blue-400';
  const titleColor = isCash ? 'text-green-800' : 'text-gray-700';
  const maxScale = Math.max(...data.history.map(h => Math.max(0, h.balance) + h.out), 500);

  const headerElement = isNegative ? (
    <div className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white text-[11px] font-black shadow-sm cursor-help animate-pulse" title="Overdraft Warning: More money is leaving this account than is available!">!</div>
  ) : (data.apy ? (
    <div className="text-[10px] font-bold text-blue-500 cursor-help" title="Annual Percentage Yield">+{data.apy}% APY</div>
  ) : undefined);

  return (
    <BaseNode
      title={data.name}
      subtitle={isCash ? 'CASH' : 'ACC'}
      bgColor={bgColor}
      borderColor={borderColor}
      titleColor={titleColor}
      targetHandle={{ color: handleColor }}
      sourceHandle={{ color: handleColor }}
      onRename={(newName) => renameAccount(data.id, newName)}
      headerElement={headerElement}
      className={data.forecastMonths > 1 ? 'w-[280px] flex-row' : 'w-[160px] flex-col'}
    >
      <div className={`flex flex-col flex-1 ${data.forecastMonths > 1 ? 'pr-2' : ''}`}>
        <div className={`text-[10px] ${isCash ? 'text-green-600/80' : 'text-gray-400'}`}>
          Start: ${data.balance.toFixed(0)}
        </div>
        <div className={`text-xs font-bold mt-0.5 ${isNegative ? 'text-red-600' : isCash ? 'text-green-700' : 'text-blue-600'}`}>
          {data.forecastMonths}m: ${data.forecastBalance.toFixed(0)}
        </div>
      </div>

      {data.forecastMonths > 1 && (
        <div className="flex flex-col justify-center h-full w-28 border-l border-black/10 pl-2 gap-[2px]">
          {data.history.map((h) => {
            const totalBalance = Math.max(0, h.balance);
            const goalEarmark = Math.min(h.goal || 0, totalBalance);
            const availableBal = totalBalance - goalEarmark;

            const outWidth = (h.out / maxScale) * 100;
            const goalWidth = (goalEarmark / maxScale) * 100;
            const balWidth = (availableBal / maxScale) * 100;
            const barColor = isCash ? 'bg-green-500' : 'bg-blue-400';

            return (
              <div
                key={h.month}
                className="flex flex-row items-center w-full h-1.5 hover:opacity-80 transition-opacity cursor-crosshair group relative"
                title={`Month ${h.month}\nIn: $${h.in.toFixed(0)}\nOut: $${h.out.toFixed(0)}\nGoal Alloc: $${goalEarmark.toFixed(0)}\nEnd Bal: $${h.balance.toFixed(0)}`}
              >
                {h.balance < 0 && <div className="absolute -left-1.5 top-1/2 transform -translate-y-1/2 w-1 h-1 bg-red-600 rounded-full" />}
                {balWidth > 0 && <div className={`h-full ${barColor} ${h.out === 0 && goalWidth === 0 ? 'rounded-r-sm' : ''} rounded-l-sm`} style={{ width: `${balWidth}%`, minWidth: '2px' }} />}
                {goalWidth > 0 && <div className={`h-full bg-purple-500 ${h.out === 0 ? 'rounded-r-sm' : ''} ${balWidth === 0 ? 'rounded-l-sm' : ''}`} style={{ width: `${goalWidth}%`, minWidth: '2px' }} />}
                {outWidth > 0 && <div className={`h-full bg-red-400 ${balWidth === 0 && goalWidth === 0 ? 'rounded-sm' : 'rounded-r-sm'}`} style={{ width: `${outWidth}%`, minWidth: outWidth > 0 ? '2px' : '0' }} />}
              </div>
            );
          })}
        </div>
      )}
    </BaseNode>
  );
}