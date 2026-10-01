import { BaseNode } from "./BaseNode";

interface IncomeNodeProps {
	data: {
		name: string;
		amount: number;
		netAmount: number;
		taxRate: number;
		taxAmount: number;
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

	return (
		<BaseNode
			title={data.name}
			subtitle="INCOME"
			bgColor={bgColor}
			borderColor={borderColor}
			titleColor="text-gray-800"
			sourceHandle={{ color: "bg-green-500" }}
			headerElement={headerElement}
			className="w-[180px] h-[100px]"
		>
			<div className="flex flex-col w-full mt-2">
				<div className="flex justify-between items-center text-[10px] text-gray-500">
					<span>Gross Pay</span>
					<span>${data.amount.toFixed(2)}</span>
				</div>

				{data.taxRate > 0 && (
					<div className="flex justify-between items-center text-[10px] text-red-400 border-b border-gray-200 pb-1 mb-1">
						<span title="Estimated Taxes & Deductions" className="cursor-help border-b border-dotted border-red-300">
							Taxes ({data.taxRate}%)
						</span>
						<span>-${data.taxAmount.toFixed(2)}</span>
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
