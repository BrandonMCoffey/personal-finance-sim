import { BaseNode } from "./BaseNode";

interface InsuranceNodeProps {
	data: {
		id: string;
		name: string;
		premium: number;
		deductible: number;
		isCovered: boolean;
		fundedAmount: number;
		coveredExpenseIds?: string[];
		isFlashing?: boolean;
	};
}

export function InsuranceNode({ data }: InsuranceNodeProps) {
	const isCovered = data.isCovered;
	const bgColor = isCovered ? "bg-cyan-50" : "bg-slate-50";
	const borderColor = isCovered ? "border-cyan-400" : "border-amber-300";
	const titleColor = isCovered ? "text-cyan-900" : "text-slate-800";
	const targetColor = isCovered ? "bg-cyan-500" : "bg-amber-400";

	const headerElement = (
		<div className="flex items-center gap-1">
			<span className="text-[12px]" title="Risk Mitigation Policy">
				🛡️
			</span>
			<span
				className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
					isCovered ? "bg-cyan-100 text-cyan-800" : "bg-amber-100 text-amber-800"
				}`}
			>
				{isCovered ? "ACTIVE" : "UNPROTECTED"}
			</span>
		</div>
	);

	return (
		<BaseNode
			title={data.name}
			subtitle="INSURANCE"
			bgColor={bgColor}
			borderColor={borderColor}
			titleColor={titleColor}
			targetHandle={{ color: targetColor }}
			headerElement={headerElement}
			className="w-[170px] h-[95px]"
			isFlashing={data.isFlashing}
		>
			<div className="flex flex-col w-full mt-1">
				<div className="flex justify-between items-center text-[10px] text-gray-600">
					<span>Monthly Premium</span>
					<span className="font-bold text-gray-800">${data.premium.toFixed(0)}/mo</span>
				</div>
				<div className="flex justify-between items-center text-[10px] text-gray-500 border-b border-gray-200 pb-1 mb-1">
					<span>Max Deductible</span>
					<span className="font-semibold text-cyan-700">${data.deductible.toFixed(0)}</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="text-[9px] text-gray-400">Funded</span>
					<span className={`text-xs font-bold ${isCovered ? "text-cyan-600" : "text-amber-600"}`}>
						${data.fundedAmount.toFixed(0)} / ${data.premium.toFixed(0)}
					</span>
				</div>
			</div>
		</BaseNode>
	);
}
