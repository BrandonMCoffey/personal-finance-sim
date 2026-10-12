import { BaseNode } from "./BaseNode";
import { useFinanceStore } from "../../../store/financeStore";

interface ExpenseNodeProps {
	data: {
		id: string;
		name: string;
		targetAmount: number;
		defaultAmount?: number;
		maxAmount?: number;
		currentAmount: number;
		isFixed: boolean;
		minValue?: number;
		isSnapped: boolean;
		frequency?: number;
		occurrenceMonth?: number;
		isActiveThisMonth?: boolean;
		isLocked?: boolean;
		isFlashing?: boolean;
	};
}

function interpolateColor(color1: number[], color2: number[], factor: number) {
	const r = Math.round(color1[0] + factor * (color2[0] - color1[0]));
	const g = Math.round(color1[1] + factor * (color2[1] - color1[1]));
	const b = Math.round(color1[2] + factor * (color2[2] - color1[2]));
	return `${r}, ${g}, ${b}`;
}

export function ExpenseNode({ data }: ExpenseNodeProps) {
	const { incomes, transferRules, updateIncomeRoute, updateTransferRule } = useFinanceStore();

	let incomingRule: any = null;
	let isIncomeRule = false;
	let sourceId = "";

	for (const inc of incomes) {
		const r = inc.routings?.find((route) => route.destinationId === data.id && route.type === "fixed");
		if (r) {
			incomingRule = r;
			isIncomeRule = true;
			sourceId = inc.id;
			break;
		}
	}

	if (!incomingRule) {
		const r = transferRules.find((rule) => rule.destinationId === data.id && rule.type === "fixed");
		if (r) {
			incomingRule = r;
			isIncomeRule = false;
			sourceId = r.sourceId;
		}
	}

	const isLocked = Boolean(data.isLocked);
	const defaultAmt = data.defaultAmount !== undefined ? data.defaultAmount : data.targetAmount;
	const fundedAmount = incomingRule?.amount || 0;
	const minRequired = data.minValue || data.targetAmount;
	const sliderMax = data.isFixed ? defaultAmt : (data.maxAmount !== undefined ? data.maxAmount : defaultAmt * 1.5);
	const fillPercentage = incomingRule && sliderMax > 0 ? Math.min((fundedAmount / sliderMax) * 100, 100) : 0;

	const cRedLight = [239, 68, 68];
	const cRed = [255, 0, 0];
	const cAmber = [245, 158, 11];
	const cBlue = [59, 130, 246];
	const cIndigo = [5, 50, 255];

	let currentRgb = cRedLight.join(", ");
	if (!data.isActiveThisMonth) {
		currentRgb = "156, 163, 175";
	} else if (fundedAmount == data.targetAmount) {
		currentRgb = cBlue.join(", ");
	} else if (fundedAmount < minRequired) {
		currentRgb = cRed.join(", ");
	} else if (fundedAmount > minRequired && fundedAmount < data.targetAmount) {
		const range = data.targetAmount - minRequired;
		const factor = range > 0 ? (fundedAmount - minRequired) / range : 1;
		currentRgb = interpolateColor(cAmber, cBlue, factor);
	} else if (fundedAmount > data.targetAmount) {
		const range = sliderMax - data.targetAmount;
		const factor = range > 0 ? (fundedAmount - data.targetAmount) / range : 1;
		currentRgb = interpolateColor(cBlue, cIndigo, factor);
	}

	let timingLabel = "";
	if (data.occurrenceMonth) timingLabel = `Month ${data.occurrenceMonth}`;
	else if (data.frequency && data.frequency > 1) timingLabel = `Every ${data.frequency} Mos`;

	const amountText = `$${data.currentAmount.toFixed(0)} / $${sliderMax.toFixed(0)}`;

	return (
		<BaseNode
			title={data.name}
			subtitle={data.isFixed ? "FIXED" : data.isLocked ? "LOCKED" : undefined}
			bgColor={data.isActiveThisMonth ? "bg-white" : "bg-gray-50"}
			borderColor={`border-[rgba(${currentRgb},0.5)]`}
			titleColor={`text-[rgb(${currentRgb})]`}
			isSnapped={data.isSnapped}
			isFlashing={data.isFlashing}
			targetHandle={!data.isSnapped ? { color: "bg-red-500" } : undefined}
			className="w-[164px] h-[74px]"
		>
			<style>{`
        .expense-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 0; height: 0; }
        .expense-slider::-moz-range-thumb { width: 0; height: 0; border: 0; }
      `}</style>
			<div className={`w-full mt-0.5 flex flex-col justify-between flex-1 ${!data.isActiveThisMonth ? "opacity-50" : ""}`}>
				{incomingRule ? (
					<input
						type="range"
						min="0"
						max={sliderMax}
						value={incomingRule.amount}
						disabled={isLocked || data.isFixed}
						onChange={(e) => {
							if (data.isFixed) return;
							if (isIncomeRule) updateIncomeRoute(sourceId, data.id, Number(e.target.value), "fixed");
							else updateTransferRule(incomingRule.id, Number(e.target.value), "fixed");
						}}
						style={{
							background: `linear-gradient(to right, rgb(${currentRgb}) ${fillPercentage}%, rgba(0,0,0,0.1) ${fillPercentage}%)`
						}}
						className={`nodrag nopan expense-slider w-full h-1.5 rounded-full appearance-none outline-none ${
							isLocked || data.isFixed ? "cursor-default opacity-90" : "cursor-pointer"
						}`}
					/>
				) : (
					<div className="w-full bg-red-100 rounded-full h-1.5">
						<div
							className="h-1.5 rounded-full transition-all duration-300"
							style={{ width: `${sliderMax > 0 ? Math.min((data.currentAmount / sliderMax) * 100, 100) : 0}%`, backgroundColor: `rgb(${cRed.join(",")})` }}
						></div>
					</div>
				)}
				<div className="flex justify-between items-center mt-1 pb-0.5">
					<span className="text-[8px] font-bold uppercase tracking-wider text-gray-400">{timingLabel}</span>
					<div className="text-[9px] text-right font-medium opacity-80" style={{ color: `rgb(${currentRgb})` }}>
						{!data.isActiveThisMonth ? "Inactive" : amountText}
					</div>
				</div>
			</div>
		</BaseNode>
	);
}
