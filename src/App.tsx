import { useState } from "react";
import { FlowSandbox } from "./components/canvas/FlowSandbox";
import { ForecastPanel } from "./components/layout/ForecastPanel";
import { InputPanel } from "./components/layout/InputPanel";
import { LevelSelectMenu } from "./components/layout/LevelSelectMenu";
import { MainMenu } from "./components/layout/MainMenu";
import { StoryMenu } from "./components/layout/StoryMenu";
import { EndlessMenu } from "./components/layout/EndlessMenu";
import { TimelineManager } from "./components/layout/TimelineManager";
import { GradeModal } from "./components/ui/GradeModal";
import { useFinanceStore } from "./store/financeStore";
import { evaluatePlan, type ValidationReport } from "./engines/validation";
import { useStoryStore } from "./store/storyStore";

export default function App() {
	const {
		currentScreen,
		setCurrentScreen,
		saveLevelScore,
		levelId,
		category,
		client,
		goals,
		accounts,
		incomes,
		transferRules,
		expenses,
		cards,
		loans,
		retirements,
		winConditions
	} = useFinanceStore();

	const { advanceRound, activeCharacterId, updateCharacterState } = useStoryStore();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [report, setReport] = useState<ValidationReport | null>(null);

	const primaryGoal = goals.length > 0 ? goals[0].name : "No active goals";

	const handleSubmitPlan = () => {
		const results = evaluatePlan(accounts, incomes, transferRules, goals, expenses, cards, loans, retirements, winConditions);
		setReport(results);
		setIsModalOpen(true);
	};

	const handleRetry = () => setIsModalOpen(false);

	const handleContinue = () => {
		if (category === "story" && activeCharacterId) {
			updateCharacterState(activeCharacterId, {
				accounts,
				incomes,
				transferRules,
				goals,
				expenses,
				cards,
				loans,
				retirements
			});
			advanceRound();
			setIsModalOpen(false);
			setCurrentScreen("story");
		} else {
			if (report && levelId) saveLevelScore(levelId as number, report.score);
			setIsModalOpen(false);
			setCurrentScreen("levels");
		}
	};

	// --- Router Logic ---
	if (currentScreen === "main_menu") return <MainMenu />;
	if (currentScreen === "levels") return <LevelSelectMenu />;
	if (currentScreen === "story") return <StoryMenu />;
	if (currentScreen === "endless") return <EndlessMenu />;

	return (
		<div className="flex flex-col w-full h-full bg-gray-50 text-gray-900 relative overflow-hidden">
			<GradeModal isOpen={isModalOpen} report={report} onRetry={handleRetry} onContinue={handleContinue} />

			{category === "endless" && <TimelineManager />}

			<header className="flex justify-between items-center p-4 bg-white border-b shadow-sm h-16 shrink-0 relative z-10">
				<div>
					<h1 className="text-xl font-bold">Client: {client ? client.name : "None"}</h1>
					<p className="text-sm text-gray-600">Goal: {primaryGoal}</p>
				</div>
				<div className="flex gap-4 items-center">
					<button
						onClick={() => setCurrentScreen(category === "endless" ? "main_menu" : "levels")}
						className="text-sm text-gray-500 hover:text-gray-800 font-medium"
					>
						← Back to {category === "endless" ? "Menu" : "Levels"}
					</button>

					{category !== "endless" && (
						<button onClick={handleSubmitPlan} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium transition-colors">
							Submit Plan
						</button>
					)}
				</div>
			</header>

			<main className="flex flex-1 overflow-hidden">
				<aside className="w-72 bg-white border-r p-4 overflow-y-auto shrink-0">
					<InputPanel />
				</aside>
				<section className="flex-1 relative bg-gray-100 min-w-0">
					<FlowSandbox />
				</section>
				<aside className="w-80 bg-white border-l p-4 overflow-y-auto shrink-0">
					<ForecastPanel />
				</aside>
			</main>
		</div>
	);
}
