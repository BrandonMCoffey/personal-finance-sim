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
      subtitle="GOAL"
      bgColor={bgColor}
      borderColor={borderColor}
      titleColor="text-purple-900"
      isSnapped={data.isSnapped}
      targetHandle={!data.isSnapped ? { color: 'bg-purple-500' } : undefined}
      className="w-[160px] flex-col justify-center"
    >
      <div className="w-full mt-1">
        <div className="w-full bg-purple-100 rounded-full h-1.5">
          <div
            className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-0.5">
          <div className="text-[9px] text-purple-600 font-medium">
            T: ${data.targetAmount}
          </div>
          <div className="text-[9px] text-purple-600 font-bold text-right">
            ${current.toFixed(0)}
            {data.hitMonth ? ` (M${data.hitMonth})` : ''}
          </div>
        </div>
      </div>
    </BaseNode>
  );
}