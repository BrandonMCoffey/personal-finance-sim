import { useState } from "react";
import { useFinanceStore } from "../../store/financeStore";
import manifest from "../../data/levels/manifest.json";
import { LevelRegistry } from "../../data/levels/registry";

export function LevelSelectMenu() {
	const { levelScores, isAllUnlocked, loadLevel, setCurrentScreen, unlockAllLevels, clearProgress } = useFinanceStore();
	const [activeCategory, setActiveCategory] = useState<string>(manifest.categories[0].id);

	const handlePlay = (fileId: string) => {
		const levelData = LevelRegistry[fileId];
		if (levelData) {
			loadLevel(levelData);
			setCurrentScreen("game");
		} else {
			alert("This level's JSON data is not built yet!");
		}
	};

	const activeLevels = manifest.levels.filter((lvl) => lvl.mainCategory === activeCategory);

	const groupedLevels = activeLevels.reduce(
		(acc, level) => {
			if (!acc[level.subCategory]) acc[level.subCategory] = [];
			acc[level.subCategory].push(level);
			return acc;
		},
		{} as Record<string, typeof manifest.levels>
	);

	return (
		<div className="w-full h-full bg-gray-50 flex flex-col overflow-hidden">
			<header className="bg-white border-b py-6 px-8 shrink-0 relative flex justify-between items-center shadow-sm z-10">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 mb-1">Training Modules</h1>
					<p className="text-sm text-gray-600">Select a specific financial scenario to master.</p>
				</div>
				<button
					onClick={() => setCurrentScreen("main_menu")}
					className="px-4 py-2 border border-gray-300 rounded text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
				>
					← Main Menu
				</button>
			</header>

			<main className="flex-1 w-full flex overflow-hidden">
				<aside className="w-80 border-r border-gray-200 p-6 overflow-y-auto shrink-0 bg-white">
					<h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Curriculum</h2>
					<nav className="flex flex-col gap-2">
						{manifest.categories.map((category) => {
							const isActive = activeCategory === category.id;
							return (
								<button
									key={category.id}
									onClick={() => setActiveCategory(category.id)}
									className={`flex items-center gap-3 p-4 rounded-lg text-left transition-all font-medium border-2 ${
										isActive
											? "bg-blue-50 border-blue-400 text-blue-800 shadow-sm"
											: "bg-white border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900"
									}`}
								>
									<span className="text-xl">{category.icon}</span>
									{category.title}
								</button>
							);
						})}
					</nav>
					<div className="mt-12 pt-6 border-t border-gray-200 flex flex-col gap-3">
						<button onClick={unlockAllLevels} className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded border border-gray-300">
							Dev: Unlock All Modules
						</button>
						<button onClick={clearProgress} className="px-4 py-2 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200">
							Clear Save Data
						</button>
					</div>
				</aside>

				<section className="flex-1 p-8 overflow-y-auto bg-gray-50">
					<div className="max-w-4xl">
						<h2 className="text-2xl font-bold text-gray-800 mb-8">{manifest.categories.find((c) => c.id === activeCategory)?.title}</h2>
						{Object.keys(groupedLevels).length === 0 ? (
							<div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-xl text-gray-500">
								New scenarios for this module are currently under development.
							</div>
						) : (
							<div className="flex flex-col gap-10">
								{Object.entries(groupedLevels).map(([subCategory, levels]) => (
									<div key={subCategory}>
										<h3 className="text-lg font-bold text-gray-700 mb-4 border-b border-gray-200 pb-2">{subCategory}</h3>
										<div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
											{levels.map((level) => {
												const score = levelScores[level.id];
												const isCompleted = score >= 60;
												const isUnlocked = isAllUnlocked || level.id === 1 || levelScores[level.id - 1] >= 60;

												return (
													<div
														key={level.id}
														className={`p-5 rounded-xl border-2 transition-all flex flex-col ${
															isUnlocked
																? "bg-white border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer"
																: "bg-gray-100 border-gray-200 opacity-60 grayscale cursor-not-allowed"
														}`}
														onClick={() => isUnlocked && handlePlay(level.fileId)}
													>
														<div className="flex justify-between items-start mb-2">
															<h4 className="font-bold text-gray-800 leading-tight">{level.title}</h4>
															{isCompleted && (
																<span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full shrink-0 ml-2">✓ {score}%</span>
															)}
														</div>
														<p className="text-sm text-gray-600 mb-4 flex-1">{level.desc}</p>
														<button
															disabled={!isUnlocked}
															className={`w-full py-2 rounded font-bold text-xs transition-colors ${isUnlocked ? "bg-blue-50 text-blue-700 hover:bg-blue-100" : "bg-gray-200 text-gray-400"}`}
														>
															{isUnlocked ? (isCompleted ? "Replay" : "Start Scenario") : "Locked"}
														</button>
													</div>
												);
											})}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</section>
			</main>
		</div>
	);
}
