import { useState } from "react";
import { useFinanceStore } from "../../store/financeStore";
import { generateForecast } from "../../engines/forecast";
import { rollForLifeEvent, type LifeEvent } from "../../engines/lifeEventEngine";

export function TimelineManager() {
	const store = useFinanceStore();
	const { accounts, incomes, transferRules, goals, expenses, cards, loans, retirements } = store;

	const [currentYear, setCurrentYear] = useState(1);
	const [currentAge, setCurrentAge] = useState(22);
	const [activeEvent, setActiveEvent] = useState<LifeEvent | null>(null);

	const handleAdvanceYear = () => {
		const forecast = generateForecast(accounts, incomes, transferRules, goals, expenses, cards, loans, retirements, 12);
		const endOfYearSnapshot = forecast[forecast.length - 1];

		store.applyTimeSkip(endOfYearSnapshot);
		setCurrentYear((prev) => prev + 1);
		setCurrentAge((prev) => prev + 1);

		const triggeredEvent = rollForLifeEvent(currentAge + 1, store);
		if (triggeredEvent) {
			triggeredEvent.action(store);
			setActiveEvent(triggeredEvent);
		}
	};

	return (
		<>
			<div className="absolute top-6 right-6 z-40 flex items-center gap-4 bg-white p-3 rounded-xl shadow-lg border-2 border-emerald-100">
				<div className="flex flex-col pr-4 border-r border-gray-200">
					<span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Endless Mode</span>
					<span className="text-lg font-black text-emerald-900">Year {currentYear}</span>
					<span className="text-xs font-medium text-emerald-600">Age: {currentAge}</span>
				</div>

				<button
					onClick={handleAdvanceYear}
					className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-2"
				>
					Advance 1 Year <span>⏭</span>
				</button>
			</div>

			{activeEvent && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
					<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform scale-100 transition-transform">
						<div className="bg-amber-500 px-6 py-4 flex items-center gap-3">
							<span className="text-3xl">⚠️</span>
							<h2 className="text-xl font-bold text-white">Life Event Triggered!</h2>
						</div>
						<div className="p-6">
							<h3 className="text-lg font-bold text-gray-900 mb-2">{activeEvent.title}</h3>
							<p className="text-gray-600 leading-relaxed mb-6">{activeEvent.description}</p>
							<div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900 text-sm font-medium mb-6">
								A new node has been added to your canvas. You must re-balance your cash flow to accommodate this change before advancing time again.
							</div>
							<button
								onClick={() => setActiveEvent(null)}
								className="w-full py-3 bg-gray-900 text-white font-bold rounded-lg hover:bg-gray-800 transition-colors"
							>
								Return to Canvas
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
