import { useState, useMemo, useEffect } from "react";
import { useFinanceStore } from "../../store/financeStore";
import { CATEGORIES, levels, LevelRegistry, type LevelData } from "../../data/levels/registry";

export function LevelSelectMenu() {
	const {
		levelScores,
		isAllUnlocked,
		loadLevel,
		setCurrentScreen,
		unlockAllLevels,
		clearProgress,
		selectedCategory,
		setSelectedCategory,
		lastSelectedLevelId,
		levelId,
		category
	} = useFinanceStore();

	const validInitialCategory =
		(selectedCategory && CATEGORIES.some((c) => c.id === selectedCategory) ? selectedCategory : undefined) ||
		(category && CATEGORIES.some((c) => c.id === category) ? category : undefined) ||
		CATEGORIES[0].id;
	const [activeCategory, setActiveCategory] = useState<string>(validInitialCategory);

	const safeCategory = CATEGORIES.some((c) => c.id === activeCategory) ? activeCategory : validInitialCategory;

	useEffect(() => {
		const targetId = lastSelectedLevelId || levelId;
		if (targetId) {
			const timer = setTimeout(() => {
				const el = document.getElementById(`level-card-${targetId}`);
				if (el) {
					el.scrollIntoView({ behavior: "smooth", block: "center" });
				}
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [activeCategory, lastSelectedLevelId, levelId]);

	const handleCategoryChange = (catId: string) => {
		setActiveCategory(catId);
		setSelectedCategory(catId);
	};

	const handlePlay = (id: string) => {
		const levelData = LevelRegistry[id];
		if (levelData) {
			loadLevel(levelData);
			setCurrentScreen("game");
		} else {
			alert("This level's JSON data is not built yet!");
		}
	};

	const flatSubCategories = useMemo(() => {
		const flat: { categoryId: string; subCategoryIndex: number }[] = [];
		CATEGORIES.forEach((cat) => {
			cat.subCategories.forEach((_, idx) => {
				flat.push({ categoryId: cat.id, subCategoryIndex: idx });
			});
		});
		return flat;
	}, []);

	const highestCompletedSubCatIndex = useMemo(() => {
		let maxIndex = -1;
		levels.forEach((level) => {
			const score = levelScores[level.id] || 0;
			if (score >= 60) {
				const flatIdx = flatSubCategories.findIndex((f) => f.categoryId === level.category && f.subCategoryIndex === level.subCategoryIndex);
				if (flatIdx > maxIndex) {
					maxIndex = flatIdx;
				}
			}
		});
		return maxIndex;
	}, [levelScores, flatSubCategories]);

	const activeCatDef = CATEGORIES.find((c) => c.id === safeCategory);
	const activeLevels = levels.filter((lvl) => lvl.category === safeCategory);

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
						{CATEGORIES.map((category) => {
							const isActive = safeCategory === category.id;
							return (
								<button
									key={category.id}
									onClick={() => handleCategoryChange(category.id)}
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
							Unlock All Modules
						</button>
						<button onClick={clearProgress} className="px-4 py-2 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200">
							Clear Save Data
						</button>
					</div>
				</aside>
				<section className="flex-1 p-6 lg:p-8 overflow-y-auto bg-gray-50">
					<div className="w-full max-w-[1600px]">
						<h2 className="text-2xl font-bold text-gray-800 mb-8">{activeCatDef?.title}</h2>
						{!activeCatDef || activeCatDef.subCategories.length === 0 ? (
							<div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-xl text-gray-500">
								New scenarios for this module are currently under development.
							</div>
						) : (
							<div className="flex flex-col gap-10">
								{activeCatDef.subCategories.map((subCategoryName, subIdx) => {
									const catLevels = activeLevels.filter((l) => l.subCategoryIndex === subIdx);

									const flatIdx = flatSubCategories.findIndex((f) => f.categoryId === safeCategory && f.subCategoryIndex === subIdx);
									const isUnlocked = isAllUnlocked || flatIdx <= highestCompletedSubCatIndex + 1;

									if (catLevels.length === 0) return null;

									const completedCount = catLevels.filter((l) => (levelScores[l.id] || 0) >= 60).length;
									const gridColsClass =
										catLevels.length <= 1
											? "grid-cols-1"
											: catLevels.length === 2
											? "grid-cols-1 md:grid-cols-2"
											: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

									return (
										<div key={subIdx} className="w-full max-w-[1400px]">
											<div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
												<h3 className="text-lg font-bold text-gray-800">{subCategoryName}</h3>
												<span className="text-xs font-semibold text-gray-400">
													{completedCount}/{catLevels.length} Completed
												</span>
											</div>
											<div className={`grid gap-4 sm:gap-5 ${gridColsClass}`}>
												{catLevels.map((level: LevelData) => {
													const score = levelScores[level.id] || 0;
													const isCompleted = score >= 60;
													const isLastPlayed = level.id === (lastSelectedLevelId || levelId);

													return (
														<div
															key={level.id}
															id={`level-card-${level.id}`}
															className={`p-5 rounded-xl border-2 transition-all flex flex-col justify-between ${
																isLastPlayed ? "ring-2 ring-blue-500 shadow-md " : ""
															}${
																isUnlocked
																	? "bg-white border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer"
																	: "bg-gray-100 border-gray-200 opacity-60 grayscale cursor-not-allowed"
															}`}
															onClick={() => isUnlocked && handlePlay(level.id)}
														>
															<div>
																<div className="flex justify-between items-start mb-2 gap-2">
																	<h4 className="font-bold text-gray-800 leading-snug">{level.title}</h4>
																	{isCompleted && (
																		<span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full shrink-0">
																			✓ {score}%
																		</span>
																	)}
																</div>
																<p className="text-sm text-gray-600 mb-4 leading-relaxed">{level.desc}</p>
															</div>
															<button
																disabled={!isUnlocked}
																className={`w-full py-2.5 rounded-lg font-bold text-xs transition-all ${
																	isUnlocked
																		? "bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-[0.99] cursor-pointer"
																		: "bg-gray-200 text-gray-400 cursor-not-allowed"
																}`}
															>
																{isUnlocked ? (isCompleted ? "Replay Scenario" : "Start Scenario") : "Locked"}
															</button>
														</div>
													);
												})}
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</section>
			</main>
		</div>
	);
}
