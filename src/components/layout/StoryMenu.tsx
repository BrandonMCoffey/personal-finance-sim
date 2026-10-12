import { useEffect, useState } from "react";
import { useFinanceStore } from "../../store/financeStore";
import { useStoryStore } from "../../store/storyStore";
import { buildStoryLevel } from "../../engines/storyEngine";
import { CHARACTER_DEFINITIONS } from "../../data/characters";

export function StoryMenu() {
	const { setCurrentScreen, loadLevel } = useFinanceStore();
	const {
		roundNumber,
		currentRoundChoices,
		clientStates,
		totalClientsAdvised,
		initStoryState,
		selectCandidate,
		resetStoryState
	} = useStoryStore();

	const [showRoster, setShowRoster] = useState(false);
	const [confirmReset, setConfirmReset] = useState(false);

	useEffect(() => {
		initStoryState();
	}, [initStoryState]);

	const handleSelectCandidate = (candidateChoice: any) => {
		const { character, stage, clientState } = candidateChoice;

		// Record the selection & update skip counts for the other offered candidates
		selectCandidate(character.id);

		// Build the rich level data with stage finances, goals, life events, and dialogue
		const levelData = buildStoryLevel(character, stage, clientState, roundNumber);

		// Load level into finance store and launch game
		loadLevel(levelData);
		setCurrentScreen("game");
	};

	return (
		<div className="w-full h-full bg-slate-50 flex flex-col overflow-y-auto">
			{/* Top Advisory Firm Navigation & Header */}
			<header className="bg-white border-b border-slate-200 py-6 px-8 sm:px-12 shrink-0 relative shadow-sm">
				<div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
					<div>
						<div className="flex items-center gap-2 mb-1">
							<span className="text-2xl">🏛️</span>
							<h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
								Beacon Wealth Advisory
							</h1>
							<span className="ml-2 text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 uppercase tracking-wide">
								Round {roundNumber}
							</span>
						</div>
						<p className="text-slate-600 text-sm">
							Review client intake inquiries. Every consultation you accept shapes a life; ignoring clients may cause them to seek advice elsewhere.
						</p>
					</div>

					<div className="flex items-center gap-3 self-end sm:self-auto">
						<button
							onClick={() => setShowRoster(!showRoster)}
							className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
						>
							<span>👥</span>
							{showRoster ? "Hide Roster" : "Client Roster"}
						</button>

						{confirmReset ? (
							<div className="flex items-center gap-1.5 bg-red-50 border border-red-200 p-1 rounded-lg">
								<span className="text-xs text-red-700 px-1 font-semibold">Reset Career?</span>
								<button
									onClick={() => {
										resetStoryState();
										setConfirmReset(false);
									}}
									className="px-2 py-1 text-xs font-bold bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
								>
									Yes
								</button>
								<button
									onClick={() => setConfirmReset(false)}
									className="px-2 py-1 text-xs text-slate-600 hover:text-slate-800"
								>
									Cancel
								</button>
							</div>
						) : (
							<button
								onClick={() => setConfirmReset(true)}
								className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
							>
								Restart Career
							</button>
						)}

						<button
							onClick={() => setCurrentScreen("main_menu")}
							className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors shadow-sm"
						>
							← Main Menu
						</button>
					</div>
				</div>

				{/* Career Snapshot Counter */}
				<div className="max-w-6xl mx-auto mt-4 pt-4 border-t border-slate-100 flex items-center gap-6 text-xs text-slate-500">
					<div>
						<span className="font-semibold text-slate-700">Total Consultations Completed: </span>
						<span className="font-bold text-purple-700 text-sm">{totalClientsAdvised}</span>
					</div>
					<div>
						<span className="font-semibold text-slate-700">Advisory Round: </span>
						<span className="font-bold text-slate-900">{roundNumber}</span>
					</div>
					<div className="hidden sm:block text-slate-400">
						• Clients return every few years as their lives evolve
					</div>
				</div>
			</header>

			{/* Main Content Area */}
			<main className="flex-1 p-6 sm:p-10 max-w-6xl mx-auto w-full flex flex-col gap-8">
				{/* Client Roster Overlay if toggled */}
				{showRoster && (
					<section className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-sm">
						<div className="flex justify-between items-center mb-4">
							<h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
								<span>👥</span> Advised Client Directory
							</h2>
							<button
								onClick={() => setShowRoster(false)}
								className="text-xs font-semibold text-slate-500 hover:text-slate-800"
							>
								✕ Close
							</button>
						</div>
						{CHARACTER_DEFINITIONS.filter((c) => (clientStates[c.id]?.timesHelped || 0) > 0).length === 0 ? (
							<div className="text-xs text-slate-500 italic py-6 text-center">
								No clients advised yet. Select an intake inquiry below to begin building your advisory record!
							</div>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
								{CHARACTER_DEFINITIONS.filter((c) => (clientStates[c.id]?.timesHelped || 0) > 0).map((char) => {
									const s = clientStates[char.id];
									const stageIdx = s ? Math.max(0, s.currentStageIndex - 1) : 0;
									const stage = char.stages[Math.min(stageIdx, char.stages.length - 1)];

									return (
										<div
											key={char.id}
											className="p-3.5 rounded-xl border border-slate-200 bg-white text-xs flex flex-col justify-between shadow-xs"
										>
											<div>
												<div className="flex items-center gap-2 mb-1.5">
													<span className="text-2xl">{char.avatarEmoji}</span>
													<div>
														<div className="font-bold text-slate-900">{char.name}</div>
														<div className="text-[10px] text-slate-500">Age {stage?.age || 20} • {stage?.occupation || "Client"}</div>
													</div>
												</div>
												<div className="text-[11px] text-slate-700 italic my-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-snug">
													“{s?.lastReactionMessage || "Thank you for the guidance on my finances!"}”
												</div>
											</div>

											<div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px]">
												<span className="text-purple-700 font-bold">
													Consultations: {s?.timesHelped || 1}
												</span>
												<span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
													Score: {s?.lastScore !== undefined ? `${s.lastScore}%` : "Passed"}
												</span>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</section>
				)}

				{/* Available Inquiries for This Round */}
				<section>
					<div className="flex items-center justify-between mb-4">
						<div>
							<h2 className="text-xl font-bold text-slate-900">Current Client Inquiries</h2>
							<p className="text-xs text-slate-500">
								Choose one client case to consult with this round. Unchosen clients may feel ignored.
							</p>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{currentRoundChoices.map((candidate) => {
							const {
								character,
								stage,
								snippet,
								relationshipStatus,
								relationshipNote,
								monthlyIncome,
								totalOutflow
							} = candidate;

							return (
								<div
									key={character.id}
									className="bg-white rounded-2xl border-2 border-slate-200 hover:border-purple-500 hover:shadow-xl transition-all duration-200 flex flex-col overflow-hidden group cursor-pointer"
									onClick={() => handleSelectCandidate(candidate)}
								>
									{/* Top Header Card */}
									<div className="p-6 border-b border-slate-100 flex flex-col gap-3">
										<div className="flex justify-between items-start">
											<div className="flex items-center gap-3">
												<div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-purple-100 group-hover:scale-105 transition-transform">
													{character.avatarEmoji}
												</div>
												<div>
													<h3 className="text-lg font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors">
														{character.name}
													</h3>
													<p className="text-xs text-slate-500 font-medium">
														Age {stage.age} • {stage.occupation}
													</p>
												</div>
											</div>
										</div>

										{/* Status Badges */}
										<div className="flex flex-wrap items-center gap-1.5">
											{relationshipStatus === "returning_helped" && (
												<span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
													<span>🤝</span> {relationshipNote}
												</span>
											)}
											{relationshipStatus === "returning_skipped" && (
												<span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
													<span>⏳</span> {relationshipNote}
												</span>
											)}
											{relationshipStatus === "new" && (
												<span className="bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
													<span>🌟</span> New Inquiry
												</span>
											)}

											<span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
												Mood: {stage.dialogue.emotion}
											</span>
										</div>
									</div>

									{/* Narrative First-Person Message */}
									<div className="p-6 flex-1 flex flex-col justify-between">
										<div>
											<div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
												Why they're reaching out:
											</div>
											<div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-700 italic leading-relaxed relative">
												<span className="text-xl text-purple-300 font-serif leading-none mr-1 select-none">“</span>
												{snippet}
												<span className="text-xl text-purple-300 font-serif leading-none ml-1 select-none">”</span>
											</div>
										</div>

										{/* Financial Snapshot - Only shown for returning clients */}
										{relationshipStatus !== "new" && (
											<div className="mt-5 pt-4 border-t border-slate-100">
												<div className="grid grid-cols-2 gap-2 text-xs">
													<div className="bg-slate-50 p-2.5 rounded-lg">
														<div className="text-[10px] text-slate-500 font-medium">Total Income</div>
														<div className="font-bold text-emerald-700">${monthlyIncome.toFixed(0)}/mo</div>
													</div>
													<div className="bg-slate-50 p-2.5 rounded-lg">
														<div className="text-[10px] text-slate-500 font-medium">Total Outflows</div>
														<div className="font-bold text-rose-600">${totalOutflow.toFixed(0)}/mo</div>
													</div>
												</div>
											</div>
										)}
									</div>

									{/* Action Footer */}
									<div className="p-6 pt-0">
										<button
											className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors text-sm shadow-md shadow-purple-200 flex items-center justify-center gap-2 group-hover:bg-purple-700"
										>
											<span>Consult with {character.name.split(" ")[0]}</span>
											<span>→</span>
										</button>
									</div>
								</div>
							);
						})}
					</div>
				</section>
			</main>
		</div>
	);
}
