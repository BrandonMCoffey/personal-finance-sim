import { BaseNode } from './BaseNode';

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

  const bgColor = isComplete ? 'bg-purple-50' : 'bg-white';
  const borderColor = isComplete ? 'border-purple-400' : 'border-purple-200';

  return (
    <BaseNode
      title={data.name}
      bgColor={bgColor}
      borderColor={borderColor}
      titleColor="text-purple-900"
      isSnapped={data.isSnapped}
      targetHandle={!data.isSnapped ? { color: 'bg-purple-500' } : undefined}
    >
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
          ${current.toFixed(0)}
          {data.hitMonth ? ` (M${data.hitMonth}!)` : ''}
        </div>
      </div>
    </BaseNode>
  );
}