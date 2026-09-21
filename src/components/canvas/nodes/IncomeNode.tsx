import { Handle, Position } from '@xyflow/react';

interface IncomeNodeProps {
  data: {
    name: string;
    amount: number;
    isBalanced: boolean;
  };
}

export function IncomeNode({ data }: IncomeNodeProps) {
  const bgStyle = data.isBalanced ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-400';

  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 w-[160px] ${bgStyle} transition-colors`}>
      <div className="flex justify-between items-center">
        <div className="text-sm font-bold text-gray-700 truncate">{data.name}</div>
        
        {!data.isBalanced && (
          <div 
            className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0 ml-1 shadow-sm cursor-help"
            title="Warning: The outgoing lines do not equal your total income. Adjust them to equal 100%."
          >
            !
          </div>
        )}
      </div>
      
      <div className="text-green-600 font-bold mt-1">+${data.amount.toFixed(2)}</div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-green-500" />
    </div>
  );
}