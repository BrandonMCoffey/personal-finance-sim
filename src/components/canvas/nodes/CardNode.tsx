import { Handle, Position } from '@xyflow/react';

interface CardNodeProps {
  data: {
    id: string;
    name: string;
    type: 'debit' | 'credit';
    forecastBalance: number;
    apr?: number;
    isSnapped: boolean;
  };
}

export function CardNode({ data }: CardNodeProps) {
  const isCredit = data.type === 'credit';
  
  // Visual styling to look like a physical credit/debit card
  const bgGradient = isCredit 
    ? 'bg-gradient-to-br from-indigo-700 to-indigo-900 border-indigo-500' 
    : 'bg-gradient-to-br from-teal-600 to-teal-800 border-teal-400';

  return (
    <div className={`relative px-4 py-3 shadow-lg rounded-xl border-2 min-w-[190px] ${bgGradient} text-white`}>
      
      {/* Visual strut linking to parent account */}
      {data.isSnapped && (
        <div className="absolute -top-3 left-1/2 w-1.5 h-3 bg-gray-300 transform -translate-x-1/2 rounded-full"></div>
      )}

      {/* Target handle: for paying off the credit card from an account */}
      {isCredit && !data.isSnapped && (
        <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-300" />
      )}
      
      <div className="flex justify-between items-start mb-4">
        <span className="text-sm font-bold tracking-wider uppercase opacity-90">{data.name}</span>
        <span className="text-[10px] font-black uppercase opacity-75">{data.type}</span>
      </div>
      
      {/* Simulating the card chip */}
      <div className="w-8 h-6 bg-yellow-400/80 rounded mb-2 border border-yellow-500/50"></div>
      
      <div className="mt-2">
        {isCredit ? (
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[10px] opacity-75">Forecasted Debt</div>
              <div className={`text-sm font-bold ${data.forecastBalance > 0 ? 'text-red-300' : 'text-white'}`}>
                ${data.forecastBalance.toFixed(2)}
              </div>
            </div>
            {data.apr !== undefined && (
              <div className="text-[10px] opacity-75">{data.apr}% APR</div>
            )}
          </div>
        ) : (
          <div className="text-[10px] opacity-75 italic">Draws directly from<br/>linked account</div>
        )}
      </div>

      {/* Source handle: for expenses drawing money OUT of this card */}
      <Handle type="source" position={Position.Right} className={`w-3 h-3 ${isCredit ? 'bg-indigo-300' : 'bg-teal-300'}`} />
    </div>
  );
}