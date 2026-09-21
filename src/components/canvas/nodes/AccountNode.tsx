import { Handle, Position } from '@xyflow/react';

interface AccountNodeProps {
  data: {
    name: string;
    balance: number;
    forecastBalance: number;
    forecastMonths: number;
    accountType: string;
    history: { month: number; balance: number; in: number; out: number }[];
  };
}

export function AccountNode({ data }: AccountNodeProps) {
  const isCash = data.accountType === 'cash';
  const isNegative = data.forecastBalance < 0 && !isCash;

  let bgStyle = 'bg-white border-gray-200';
  if (isNegative) bgStyle = 'bg-red-50 border-red-400 z-10';
  else if (isCash) bgStyle = 'bg-green-50 border-green-200 shadow-[0_0_15px_rgba(34,197,94,0.15)] z-10';

  const handleColor = isCash ? 'bg-green-500' : 'bg-blue-400';
  const maxScale = Math.max(...data.history.map(h => Math.max(0, h.balance) + h.out), 100);

  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 w-[160px] ${bgStyle}`}>
      <Handle type="target" position={Position.Left} className={`w-3 h-3 ${handleColor}`} />
      
      <div className="flex flex-col">
        <div className="flex justify-between items-start">
          <div className={`text-sm font-bold truncate ${isCash ? 'text-green-800' : 'text-gray-700'}`}>
            {data.name}
          </div>
          
          {isNegative && (
            <div 
              className="w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0 ml-1 shadow-sm cursor-help animate-pulse"
              title="Overdraft Warning: More money is leaving this account than is available!"
            >
              !
            </div>
          )}
        </div>

        <div className={`text-[10px] ${isCash ? 'text-green-600/80' : 'text-gray-400'}`}>Start: ${data.balance.toFixed(2)}</div>
        <div className={`text-xs font-bold mt-1 ${isNegative ? 'text-red-600' : isCash ? 'text-green-700' : 'text-blue-600'}`}>
          {data.forecastMonths}m: ${data.forecastBalance.toFixed(2)}
        </div>
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

      <Handle type="source" position={Position.Right} className={`w-3 h-3 ${handleColor}`} />
    </div>
  );
}