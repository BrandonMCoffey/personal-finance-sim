import { BaseNode } from "./BaseNode";
import { useFinanceStore } from "../../../store/financeStore";

interface LoanNodeProps {
	data: {
		id: string;
		name: string;
		balance: number;
		apr: number;
		minimumPayment: number;
		forecastBalance: number;
		interestPaid: number;
		forecastMonths?: number;
		isFlashing?: boolean;
	};
}

export function LoanNode({ data }: LoanNodeProps) {
	const { renameAccount } = useFinanceStore();
	const isPaidOff = data.forecastBalance <= 0;
	const isMultiYear = Boolean(data.forecastMonths && data.forecastMonths > 12);

	return (
		<BaseNode
			title={data.name}
			subtitle="LOAN"
			bgColor="bg-orange-50"
			borderColor={isPaidOff ? "border-green-400" : "border-orange-400"}
			titleColor="text-orange-900"
			targetHandle={{ color: "bg-orange-500" }}
			isFlashing={data.isFlashing}
			onRename={(newName) => renameAccount(data.id, newName)}
			headerElement={<span className="text-[10px] text-orange-600 font-bold">{data.apr}% APR</span>}
			className="w-[180px] h-[95px]"
		>
			<div className="flex flex-col w-full mt-1">
				<div className="flex justify-between items-start w-full">
					<div className="flex flex-col">
						<div className="text-[9px] text-orange-800/80">Start: ${data.balance.toFixed(0)}</div>
						<div className="text-[9px] opacity-75 text-orange-800 font-medium mt-0.5">
							{isMultiYear ? "1yr Debt" : "Forecast Debt"}
						</div>
						<div className={`text-xs font-bold leading-tight ${isPaidOff ? "text-green-600" : "text-orange-700"}`}>
							${Math.max(0, data.forecastBalance).toFixed(2)}
						</div>
					</div>
					<div className="flex flex-col items-end">
						<div className="text-[9px] text-orange-700 font-medium bg-orange-100 px-1 py-0.5 rounded whitespace-nowrap">
							Min: ${data.minimumPayment}/mo
						</div>
						{data.interestPaid > 0 && (
							<div className="text-[8px] font-bold text-red-600 bg-red-50 border border-red-100 px-1 py-0.5 rounded w-fit mt-1 whitespace-nowrap">
								{isMultiYear ? "1yr Int" : "Interest"}: -${data.interestPaid.toFixed(2)}
							</div>
						)}
					</div>
				</div>
			</div>
		</BaseNode>
	);
}
