import { Handle, Position } from '@xyflow/react';

interface GoalNodeProps {
  data: {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetMonths?: number;
    hitMonth?: number;
    isSnapped: boolean;
  };
}

export function GoalNode({ data }: GoalNodeProps) {
  const current = data.currentAmount || 0;
  const progress = Math.min((current / data.targetAmount) * 100, 100);
  const isComplete = current >= data.targetAmount;

  const snappedStyle = data.isSnapped ? 'rounded-t-none shadow-none z-0' : 'rounded-md shadow-md z-10';
  const colorStyle = isComplete ? 'bg-purple-50 border-purple-400' : 'bg-white border-purple-200';

  return (
    <div className={`relative px-4 py-3 border-2 w-[160px] ${snappedStyle} ${colorStyle}`}>
      
      {!data.isSnapped && <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500" />}

      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-bold text-purple-900">{data.name}</span>
      </div>

      <div className="w-full bg-purple-100 rounded-full h-2 mt-2">
        <div 
          className="bg-purple-500 h-2 rounded-full transition-all duration-500" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="flex justify-between mt-1">
        <div className="text-[10px] text-purple-600 font-medium">
          Target: ${data.targetAmount.toLocaleString()} {data.targetMonths ? `in ${data.targetMonths}mo` : ''}
        </div>
        <div className="text-[10px] text-purple-600 font-bold text-right">
          ${current.toFixed(0)} saved
          {data.hitMonth ? ` (M${data.hitMonth}!)` : ''}
        </div>
      </div>
    </div>
  );
}