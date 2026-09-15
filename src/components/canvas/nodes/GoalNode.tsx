import { Handle, Position } from '@xyflow/react';

interface GoalNodeProps {
  data: {
    name: string;
    targetAmount: number;
    currentAmount: number;
    hitMonth?: number;
  };
}

export function GoalNode({ data }: GoalNodeProps) {
  const current = data.currentAmount || 0;
  const progressPercent = Math.min((current / data.targetAmount) * 100, 100);

  return (
    <div className="px-4 py-3 shadow-md rounded-md bg-purple-50 border-2 border-purple-300 min-w-[180px]">
      {/* Input Handle (Left side) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-purple-500" 
      />
      
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-purple-800">{data.name}</span>
          <span className="text-purple-600 text-xs font-semibold">
            ${data.targetAmount.toFixed(0)}
          </span>
        </div>
        
        {/* Progress Bar UI */}
        <div className="w-full bg-purple-200 rounded-full h-2.5">
          <div 
            className="bg-purple-600 h-2.5 rounded-full transition-all duration-300" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="text-[10px] text-purple-600 text-right font-medium">
          ${current.toFixed(0)} saved 
          {data.hitMonth ? ` (Hit in M${data.hitMonth}!)` : ''}
        </div>
      </div>
    </div>
  );
}