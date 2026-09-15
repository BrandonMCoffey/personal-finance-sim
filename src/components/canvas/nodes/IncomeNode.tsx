import { Handle, Position } from '@xyflow/react';

interface IncomeNodeProps {
  data: {
    name: string;
    amount: number;
  };
}

export function IncomeNode({ data }: IncomeNodeProps) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-green-50 border-2 border-green-300 min-w-[150px]">
      <div className="flex flex-col">
        <div className="text-sm font-bold text-green-800">{data.name}</div>
        <div className="text-green-600 text-xs text-right mt-1">
          +${data.amount.toFixed(2)} / mo
        </div>
      </div>

      {/* Output Handle (Right side) */}
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-green-500" 
      />
    </div>
  );
}