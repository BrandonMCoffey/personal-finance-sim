import { Handle, Position } from '@xyflow/react';

interface AccountNodeProps {
  data: {
    name: string;
    balance: number;
    forecastBalance: number;
    forecastMonths: number;
  };
}

export function AccountNode({ data }: AccountNodeProps) {
  const isNegative = data.forecastBalance < 0;

  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 min-w-[150px] ${isNegative ? 'bg-red-50 border-red-400' : 'bg-white border-gray-200'}`}>
      {/* Input Handle (Left side) */}
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-blue-400" />
      
      <div className="flex flex-col">
        <div className="text-sm font-bold text-gray-700">{data.name}</div>
        <div className="text-gray-400 text-[10px]">Start: ${data.balance.toFixed(2)}</div>
        <div className={`text-xs font-bold mt-1 ${isNegative ? 'text-red-600' : 'text-blue-600'}`}>
          {data.forecastMonths}m Forecast: ${data.forecastBalance.toFixed(2)}
        </div>
      </div>

      {/* Output Handle (Right side) */}
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-400" />
    </div>
  );
}