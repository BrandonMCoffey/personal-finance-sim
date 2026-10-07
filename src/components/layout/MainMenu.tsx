import { useFinanceStore } from "../../store/financeStore";

export function MainMenu() {
	const { setCurrentScreen } = useFinanceStore();

	return (
		<div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center p-8 overflow-y-auto">
			<div className="text-center mb-12">
				<h1 className="text-5xl font-bold text-gray-900 mb-4">Financial Advisor Simulator</h1>
				<p className="text-xl text-gray-600">Select a game mode to begin.</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full">
				{/* Levels Mode */}
				<div
					className="bg-white p-8 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg cursor-pointer transition-all flex flex-col group"
					onClick={() => setCurrentScreen("levels")}
				>
					<h2 className="text-2xl font-bold text-gray-800 mb-3 group-hover:text-blue-600 transition-colors">Levels</h2>
					<p className="text-gray-600 flex-1 leading-relaxed">
						Master fundamental financial concepts through categorized training modules and targeted problem-solving scenarios.
					</p>
					<button className="mt-8 w-full py-3 bg-blue-50 text-blue-700 font-bold rounded hover:bg-blue-100 transition-colors">Play Levels</button>
				</div>

				{/* Story Mode */}
				<div
					className="bg-white p-8 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:shadow-lg cursor-pointer transition-all flex flex-col group"
					onClick={() => setCurrentScreen("story")}
				>
					<div className="flex justify-between items-start mb-3">
						<h2 className="text-2xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors">Story Mode</h2>
					</div>
					<p className="text-gray-600 flex-1 leading-relaxed">
						Advise recurring clients over multiple years. Navigate their major life events, changing goals, and unique spending habits.
					</p>
					<button className="mt-8 w-full py-3 bg-purple-50 text-purple-700 font-bold rounded hover:bg-purple-100 transition-colors">
						Play Story
					</button>
				</div>

				{/* Endless Mode */}
				<div
					className="bg-white p-8 rounded-xl border-2 border-gray-200 hover:border-emerald-400 hover:shadow-lg cursor-pointer transition-all flex flex-col group"
					onClick={() => setCurrentScreen("endless")}
				>
					<div className="flex justify-between items-start mb-3">
						<h2 className="text-2xl font-bold text-gray-800 group-hover:text-emerald-600 transition-colors">Endless Mode</h2>
					</div>
					<p className="text-gray-600 flex-1 leading-relaxed">
						Simulate an entire lifetime of financial decisions. Build generational wealth and adapt to dynamic, unpredictable events.
					</p>
					<button className="mt-8 w-full py-3 bg-emerald-50 text-emerald-700 font-bold rounded hover:bg-emerald-100 transition-colors">
						Play Endless
					</button>
				</div>
			</div>
		</div>
	);
}
