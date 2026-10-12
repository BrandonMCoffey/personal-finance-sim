import { BaseNode } from "./BaseNode";

interface CardNodeProps {
	data: {
		id: string;
		name: string;
		type: "debit" | "credit";
		forecastBalance: number;
		interestPaid: number;
		apr?: number;
		isSnapped: boolean;
		isFlashing?: boolean;
		isMissingMinimum?: boolean;
		isUnderStatement?: boolean;
		month1Payment?: number;
		minPayment?: number;
		statementBalance?: number;
	};
}

export function CardNode({ data }: CardNodeProps) {
	const isCredit = data.type === "credit";

	const bgColor = isCredit ? "bg-indigo-700" : "bg-teal-600";
	const borderColor = isCredit ? "border-indigo-500" : "border-teal-400";
	const handleColor = isCredit ? "bg-indigo-300" : "bg-teal-300";

	const headerElement = isCredit ? (
		<div className="flex gap-1.5 items-center">
			{data.isMissingMinimum ? (
				<span
					title={`Danger: Payment ($${(data.month1Payment || 0).toFixed(2)}) falls below mandatory minimum ($${(data.minPayment || 0).toFixed(2)})!`}
					className="w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-black animate-pulse cursor-help shrink-0 shadow-xs"
				>
					!
				</span>
			) : data.isUnderStatement ? (
				<span
					title={`Warning: Does not meet full statement balance ($${(data.statementBalance || 0).toFixed(2)}). Carrying a balance incurs interest.`}
					className="text-[12px] cursor-help shrink-0"
				>
					⚠️
				</span>
			) : (
				<span title="Rewards Associated" className="text-[12px] opacity-90 cursor-help">
					✨
				</span>
			)}
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
			isFlashing={data.isFlashing}
			targetHandle={isCredit && !data.isSnapped ? { color: handleColor } : undefined}
			sourceHandle={{ color: handleColor }}
			headerElement={headerElement}
			className={data.isSnapped ? "w-[180px] h-[78px]" : "w-[180px] h-[95px]"}
		>
			<div className="mt-1 text-white w-full">
				{isCredit ? (
					<div className="flex flex-col w-full">
						<div className="flex justify-between items-end w-full">
							<div>
								<div className="text-[10px] opacity-75">Forecasted Debt</div>
								<div className={`text-sm font-bold ${data.forecastBalance > 0 ? "text-red-300" : "text-white"}`}>
									${data.forecastBalance.toFixed(2)}
								</div>
							</div>
							{data.interestPaid > 0 && (
								<div className="text-[9px] font-bold text-red-200 bg-red-900/60 border border-red-700/50 px-1.5 py-0.5 rounded text-right shrink-0">
									Int: -${data.interestPaid.toFixed(2)}
								</div>
							)}
						</div>
					</div>
				) : (
					<div className="text-[10px] opacity-75 italic">
						Draws directly from
						<br />
						linked account
					</div>
				)}
			</div>
		</BaseNode>
	);
}
