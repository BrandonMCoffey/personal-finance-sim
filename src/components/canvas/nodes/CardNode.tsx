import { BaseNode } from './BaseNode';

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

  const bgColor = isCredit ? 'bg-indigo-700' : 'bg-teal-600';
  const borderColor = isCredit ? 'border-indigo-500' : 'border-teal-400';
  const handleColor = isCredit ? 'bg-indigo-300' : 'bg-teal-300';

  const headerElement = isCredit ? (
    <div className="flex gap-1 items-center">
      <span title="Rewards Associated" className="text-[12px] opacity-90 cursor-help">✨</span>
      {data.apr !== undefined && <span className="text-[10px] text-indigo-200">{data.apr}% APR</span>}
    </div>
  ) : undefined;

  return (
    <BaseNode
      title={data.name}
      subtitle={data.type}
      bgColor={bgColor}
      borderColor={borderColor}
      titleColor="text-white"
      isSnapped={data.isSnapped}
      targetHandle={isCredit && !data.isSnapped ? { color: handleColor } : undefined}
      sourceHandle={{ color: handleColor }}
      headerElement={headerElement}
    >
      <div className="mt-2 text-white w-full">
        {isCredit ? (
          <div className="flex justify-between items-end w-full">
            <div>
              <div className="text-[10px] opacity-75">Forecasted Debt</div>
              <div className={`text-sm font-bold ${data.forecastBalance > 0 ? 'text-red-300' : 'text-white'}`}>
                ${data.forecastBalance.toFixed(2)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[10px] opacity-75 italic">Draws directly from<br />linked account</div>
        )}
      </div>
    </BaseNode>
  );
}