import { BaseNode } from "./BaseNode";

interface IncomeNodeProps {
	data: {
		name: string;
		amount: number;
		netAmount: number;
		taxRate: number;
		taxAmount: number;
		taxDeductionBreakdown?: { name: string; amount: number; rate?: number }[];
		isBalanced: boolean;
	};
}

export function IncomeNode({ data }: IncomeNodeProps) {
	const bgColor = data.isBalanced ? "bg-green-50" : "bg-yellow-50";
	const borderColor = data.isBalanced ? "border-green-200" : "border-yellow-400";

	const headerElement = !data.isBalanced ? (
		<div
			className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center text-white text-[11px] font-black shadow-sm cursor-help"
			title="Warning: The outgoing lines do not equal your total net income. Adjust them to equal 100%."
		>
			!
		</div>
	) : undefined;

	const breakdownTooltip = data.taxDeductionBreakdown && data.taxDeductionBreakdown.length > 0
		? data.taxDeductionBreakdown.map((d) => `${d.name}: -$${d.amount.toFixed(2)}`).join("\n")
		: `Estimated Taxes: -$${data.taxAmount.toFixed(2)}`;

	const taxesLabel = data.taxDeductionBreakdown && data.taxDeductionBreakdown.length > 1
		? "Tax Deductions"
		: `Taxes (${data.taxRate}%)`;

	return (
		<BaseNode
			title={data.name}
			subtitle="INCOME"
			bgColor={bgColor}
			borderColor={borderColor}
			titleColor="text-gray-800"
			sourceHandle={{ color: "bg-green-500" }}
			headerElement={headerElement}
			className="w-[185px] h-[105px]"
		>
			<div className="flex flex-col w-full mt-2">
				<div className="flex justify-between items-center text-[10px] text-gray-500">
					<span>Gross Pay</span>
					<span>${data.amount.toFixed(2)}</span>
				</div>

				{data.taxAmount > 0 && (
					<div className="flex justify-between items-center text-[10px] text-red-500 border-b border-gray-200 pb-1 mb-1">
						<span title={breakdownTooltip} className="cursor-help border-b border-dotted border-red-300">
							{taxesLabel}
						</span>
						<span title={breakdownTooltip}>-${data.taxAmount.toFixed(2)}</span>
					</div>
				)}

				<div className="flex justify-between items-center mt-1">
					<span className="text-[10px] font-bold text-green-800">Net Pay</span>
					<span className="text-sm font-bold text-green-600">+${data.netAmount.toFixed(2)}</span>
				</div>
			</div>
		</BaseNode>
	);
}
