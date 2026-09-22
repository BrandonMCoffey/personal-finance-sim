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
    history: { month: number; balance: number; in: number; out: number }[];
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
  const maxScale = Math.max(...data.history.map(h => Math.max(0, h.balance) + h.out), 100);

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
    >
      <div className={`text-[10px] ${isCash ? 'text-green-600/80' : 'text-gray-400'}`}>Start: ${data.balance.toFixed(2)}</div>
      <div className={`text-xs font-bold mt-1 ${isNegative ? 'text-red-600' : isCash ? 'text-green-700' : 'text-blue-600'}`}>
        {data.forecastMonths}m: ${data.forecastBalance.toFixed(2)}
      </div>

      {data.forecastMonths > 1 && (
        <div className="mt-2 pt-2 border-t border-black/5 flex items-end justify-between h-10 w-full gap-[2px]">
          {data.history.map((h) => {
            const outHeight = (h.out / maxScale) * 100;
            const balHeight = (Math.max(0, h.balance) / maxScale) * 100;
            const barColor = isCash ? 'bg-green-500' : 'bg-blue-400';
            return (
              <div
                key={h.month}
                className="flex-1 flex flex-col justify-end h-full hover:opacity-80 transition-opacity cursor-crosshair group relative"
                title={`Month ${h.month}\nIn: $${h.in.toFixed(0)}\nOut: $${h.out.toFixed(0)}\nEnd: $${h.balance.toFixed(0)}`}
              >
                {h.out > 0 && <div className={`w-full bg-red-400 ${balHeight === 0 ? 'rounded-sm' : 'rounded-t-sm'}`} style={{ height: `${outHeight}%`, minHeight: outHeight > 0 ? '2px' : '0' }} />}
                {balHeight > 0 && <div className={`w-full ${barColor} ${h.out === 0 ? 'rounded-t-sm' : ''} rounded-b-sm`} style={{ height: `${balHeight}%`, minHeight: '2px' }} />}
                {h.balance < 0 && <div className="absolute -bottom-1.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-600 rounded-full" />}
              </div>
            );
          })}
        </div>
      )}
    </BaseNode>
  );
}