import { BaseNode } from "./BaseNode";

interface GoalNodeProps {
	data: {
		id: string;
		name: string;
		targetAmount: number;
		currentAmount: number;
		targetMonths?: number;
		hitMonth?: number;
		isSnapped: boolean;
		isFlashing?: boolean;
	};
}

export function GoalNode({ data }: GoalNodeProps) {
	const current = data.currentAmount || 0;
	const progress = Math.min((current / data.targetAmount) * 100, 100);
	const isComplete = current >= data.targetAmount;

	const getStatusColor = () => {
		if (!data.targetMonths) {
			return isComplete ? "text-emerald-600" : "text-rose-600";
		}
		if (data.hitMonth !== undefined && isComplete) {
			if (data.hitMonth < data.targetMonths) {
				return "text-emerald-800"; // slightly darker green for met early
			}
			if (data.hitMonth === data.targetMonths) {
				return "text-emerald-600"; // green for met on time
			}
			if (data.hitMonth <= data.targetMonths + 2) {
				return "text-amber-500"; // yellow for met late (max 2 months late)
			}
		}
		return "text-rose-600"; // red for not met
	};

	const bgColor = isComplete ? "bg-purple-50" : "bg-white";
	const borderColor = isComplete ? "border-purple-400" : "border-purple-200";

	return (
		<BaseNode
			title={data.name}
			subtitle="GOAL"
			bgColor={bgColor}
			borderColor={borderColor}
			titleColor="text-purple-900"
			isSnapped={data.isSnapped}
			targetHandle={!data.isSnapped ? { color: "bg-purple-500" } : undefined}
			className={"w-[180px] h-[66px]"}
			isFlashing={data.isFlashing}
		>
			<div className="w-full mt-1">
				<div className="w-full bg-purple-100 rounded-full h-1.5">
					<div className="bg-purple-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
				</div>
				<div className="flex justify-between mt-0.5">
					<div className="text-[9px] text-purple-600 font-medium">T: ${data.targetAmount}</div>
					<div className={`text-[9px] font-bold text-right ${getStatusColor()}`}>
						${current.toFixed(0)}
						{data.hitMonth ? ` (M${data.hitMonth})` : ""}
					</div>
				</div>
			</div>
		</BaseNode>
	);
}
