import { useState } from "react";
import type { Income, Expense } from "../../store/financeStore";
import { useFinanceStore } from "../../store/financeStore";

export function InputPanel() {
	const { levelId, client, incomes, expenses, insurances, hints, toTeach, inflationRate } = useFinanceStore();
	const [prevLevelId, setPrevLevelId] = useState(levelId);
	const [hintIndex, setHintIndex] = useState(-1);

	if (prevLevelId !== levelId) {
		setPrevLevelId(levelId);
		setHintIndex(-1);
	}

	const revealNextHint = () => {
		if (hintIndex < hints.length - 1) {
			setHintIndex((prev) => prev + 1);
		}
	};

	return (
		<div className="flex flex-col h-full gap-5 text-sm">
			{/* Learning Objective Section */}
			{toTeach && (
				<section className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-3 shadow-sm shrink-0">
					<div className="flex items-center gap-1.5 text-[11px] font-black text-indigo-900 uppercase tracking-wider mb-1">
						<span>🎯</span> Learning Objective
					</div>
					<p className="text-xs font-semibold text-indigo-900 leading-snug">{toTeach}</p>
				</section>
			)}

			{/* Macro Environment Notice */}
			{inflationRate > 0 && (
				<div className="bg-amber-50 border border-amber-300 rounded p-2.5 text-xs text-amber-900 flex items-center justify-between shadow-sm">
					<span className="font-bold flex items-center gap-1">
						<span>🔥</span> Macro Environment
					</span>
					<span className="font-black bg-amber-200/80 px-2 py-0.5 rounded text-[11px]">
						{inflationRate}% Inflation
					</span>
				</div>
			)}

			{/* Client Brief Section */}
			{/* Client Brief Section */}
			<section>
				<h2 className="font-semibold text-gray-800 border-b pb-2 mb-3">Client Brief</h2>
				{client ? (
					<div className="bg-purple-50/70 p-4 rounded-xl border border-purple-100 flex flex-col gap-2.5">
						<div className="flex items-center gap-3">
							<div className="w-10 h-10 rounded-xl bg-white border border-purple-200 flex items-center justify-center text-xl shadow-xs">
								{client.avatarEmoji || "👤"}
							</div>
							<div>
								<h3 className="font-bold text-slate-900 leading-tight flex items-center gap-2">
									<span>{client.name}</span>
								</h3>
								<p className="text-slate-500 text-[11px] font-medium leading-snug">
									{client.description}
								</p>
							</div>
						</div>

						{client.emotion && (
							<div className="flex items-center gap-1.5 self-start">
								<span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100/80 text-purple-800">
									Feeling: {client.emotion}
								</span>
							</div>
						)}

						{client.lifeEvent && (
							<div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-xs">
								<div className="font-bold text-amber-950 flex items-center gap-1 mb-0.5 text-[11px]">
									<span>⚡</span> {client.lifeEvent.title}
								</div>
								<p className="text-amber-900/90 text-[11px] leading-relaxed">
									{client.lifeEvent.description}
								</p>
							</div>
						)}

						<div className="bg-white p-3 rounded-lg border border-purple-100 italic text-slate-700 shadow-xs relative text-xs leading-relaxed">
							<span className="absolute -top-2 -left-1 text-2xl text-purple-300 font-serif leading-none select-none">“</span>
							{client.prompt}
						</div>
					</div>
				) : (
					<p className="text-gray-400 italic">No client loaded.</p>
				)}
			</section>

			{/* Manual Hint Section */}
			{hints && hints.length > 0 && (
				<section>
					<div className="flex justify-between items-center border-b pb-2 mb-3">
						<h2 className="font-semibold text-gray-800">Assistance</h2>
						<span className="text-xs text-gray-400 font-medium">
							{hintIndex + 1} / {hints.length} Hints
						</span>
					</div>

					<div className="flex flex-col gap-2">
						{hints.slice(0, hintIndex + 1).map((hint, idx) => (
							<div key={idx} className="bg-amber-50 border border-amber-200 p-3 rounded text-amber-900 text-xs leading-relaxed shadow-sm">
								<span className="font-bold mr-1">Hint {idx + 1}:</span> {hint}
							</div>
						))}

						{hintIndex < hints.length - 1 && (
							<button
								onClick={revealNextHint}
								className="w-full py-2 bg-white border-2 border-dashed border-gray-300 text-gray-500 hover:text-gray-800 hover:border-gray-400 hover:bg-gray-50 rounded font-medium transition-all text-xs"
							>
								+ Request a Hint
							</button>
						)}
					</div>
				</section>
			)}

			{/* Ledger Section */}
			<section className="flex-1">
				<h2 className="font-semibold text-gray-800 border-b pb-2 mb-3">Ledger</h2>

				{/* Incomes */}
				<div className="mb-4">
					<h3 className="font-medium text-gray-500 mb-2 uppercase text-xs tracking-wider">Income Sources</h3>
					{incomes.length === 0 && <p className="text-gray-400 text-xs">None</p>}
					<ul className="flex flex-col gap-2">
						{incomes.map((inc: Income) => {
							const effectiveTaxRate = inc.taxRate || 0;
							const hasGranularDeductions = inc.taxDeductions && inc.taxDeductions.length > 0;
							return (
								<li key={inc.id} className="flex flex-col bg-green-50 px-3 py-2 rounded border border-green-100">
									<div className="flex justify-between items-center">
										<span className="font-medium text-green-900">{inc.name}</span>
										<span className="text-green-700 font-bold">+${inc.amount.toFixed(2)}</span>
									</div>
									{hasGranularDeductions ? (
										<div className="mt-1 pt-1 border-t border-green-200/60 text-[10px] text-green-800 space-y-0.5">
											{inc.taxDeductions!.map((d, dIdx) => (
												<div key={dIdx} className="flex justify-between text-gray-500">
													<span>↳ {d.name}</span>
													<span>{d.rate ? `${d.rate}%` : d.fixedAmount ? `$${d.fixedAmount}` : "Progressive"}</span>
												</div>
											))}
										</div>
									) : effectiveTaxRate > 0 ? (
										<div className="flex justify-between items-center text-[10px] text-red-500 mt-0.5">
											<span>Withholding</span>
											<span>-{effectiveTaxRate}% Tax</span>
										</div>
									) : null}
								</li>
							);
						})}
					</ul>
				</div>

				{/* Insurance Policies */}
				{insurances.length > 0 && (
					<div className="mb-4">
						<h3 className="font-medium text-gray-500 mb-2 uppercase text-xs tracking-wider">Insurance Policies</h3>
						<ul className="flex flex-col gap-2">
							{insurances.map((ins) => (
								<li key={ins.id} className="flex justify-between items-center bg-cyan-50 px-3 py-2 rounded border border-cyan-200 text-xs">
									<div>
										<span className="font-bold text-cyan-950 block">{ins.name}</span>
										<span className="text-[10px] text-cyan-700">Deductible: ${ins.deductible.toFixed(0)}</span>
									</div>
									<span className="font-black text-cyan-900">${ins.premium.toFixed(0)}/mo</span>
								</li>
							))}
						</ul>
					</div>
				)}

				{/* Expenses */}
				<div>
					<h3 className="font-medium text-gray-500 mb-2 uppercase text-xs tracking-wider">Recurring Expenses</h3>
					{expenses.length === 0 && <p className="text-gray-400 text-xs">None</p>}
					<ul className="flex flex-col gap-2">
						{expenses.map((exp: Expense) => (
							<li key={exp.id} className="flex justify-between items-center bg-red-50 px-3 py-2 rounded border border-red-100">
								<div className="flex flex-col">
									<span className="font-medium text-red-900">{exp.name}</span>
									{exp.occurrenceMonth && (
										<span className="text-[10px] text-amber-700 font-bold">Month {exp.occurrenceMonth} Sudden Event</span>
									)}
								</div>
								<span className="text-red-700 font-bold">-${exp.amount.toFixed(2)}</span>
							</li>
						))}
					</ul>
				</div>
			</section>
		</div>
	);
}
