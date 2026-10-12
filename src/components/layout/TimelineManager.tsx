import { useState, useMemo } from "react";
import { useFinanceStore } from "../../store/financeStore";
import { generateForecast } from "../../engines/forecast";
import { rollForLifeEvent } from "../../engines/lifeEventEngine";
import MILESTONES from "../../data/endless/milestones.json";

interface MilestoneChoice {
	id: string;
	title: string;
	tag?: string;
	prerequisiteOptionId?: string;
	grantsPrerequisiteId?: string;
	description: string;
	effects: {
		incomesToUpdate?: any[];
		incomesToAdd?: any[];
		expensesToAdd?: any[];
		loansToAdd?: any[];
		cardsToAdd?: any[];
		retirementsToAdd?: any[];
		insurancesToAdd?: any[];
		eventMessage?: string;
	};
}

interface Milestone {
	id: string;
	age: number;
	gapYears: number;
	title: string;
	narrative: string;
	choices: MilestoneChoice[];
}

export function TimelineManager() {
	const store = useFinanceStore();
	const {
		accounts,
		cards,
		loans,
		retirements,
		endlessAge,
		endlessMilestoneIndex,
		endlessCompletedPrerequisites,
		setEndlessAge,
		setEndlessMilestoneIndex,
		addEndlessPrerequisite,
		applyMilestoneEffects,
		applyTimeSkip,
		setFlashingNodeId,
		loadLevel,
		setCurrentScreen
	} = store;

	const [showChoiceModal, setShowChoiceModal] = useState(false);
	const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
	const [showRetirementModal, setShowRetirementModal] = useState(false);
	const [floatingAlert, setFloatingAlert] = useState<{
		title: string;
		narrative: string;
		eventNote?: string;
	} | null>(null);

	const milestones = MILESTONES as Milestone[];
	const currentMilestone = endlessMilestoneIndex < milestones.length ? milestones[endlessMilestoneIndex] : null;
	const isComplete = endlessMilestoneIndex >= milestones.length;

	// Total net worth calculations for retirement
	const financialStats = useMemo(() => {
		const cashLiquid = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
		const retirementInvestments = retirements.reduce((sum, r) => sum + (r.balance || 0), 0);
		const totalDebts = loans.reduce((sum, l) => sum + (l.balance || 0), 0) + cards.reduce((sum, c) => sum + (c.balance || 0), 0);
		const netWorth = cashLiquid + retirementInvestments - totalDebts;

		let tier = "🚨 Generational Debt Trap";
		let tierBadgeColor = "bg-rose-100 text-rose-800 border-rose-300";
		if (netWorth >= 2000000) {
			tier = "🏆 Generational Dynasty (Financial Titan)";
			tierBadgeColor = "bg-emerald-100 text-emerald-900 border-emerald-400";
		} else if (netWorth >= 1000000) {
			tier = "🥇 Self-Made Millionaire (Financial Independence)";
			tierBadgeColor = "bg-blue-100 text-blue-900 border-blue-400";
		} else if (netWorth >= 500000) {
			tier = "🥈 Prosperous Retirement (Upper Middle Class)";
			tierBadgeColor = "bg-indigo-100 text-indigo-900 border-indigo-400";
		} else if (netWorth >= 150000) {
			tier = "🥉 Modest Golden Years";
			tierBadgeColor = "bg-amber-100 text-amber-900 border-amber-400";
		} else if (netWorth >= 0) {
			tier = "⚠️ Solvent Survivor";
			tierBadgeColor = "bg-orange-100 text-orange-900 border-orange-400";
		}

		return { cashLiquid, retirementInvestments, totalDebts, netWorth, tier, tierBadgeColor };
	}, [accounts, retirements, loans, cards]);

	const handleOpenChapterModal = () => {
		if (isComplete) {
			setShowRetirementModal(true);
			return;
		}
		if (currentMilestone) {
			// Preselect first eligible choice
			const firstAvailable = currentMilestone.choices.find(
				(c) => !c.prerequisiteOptionId || endlessCompletedPrerequisites.includes(c.prerequisiteOptionId)
			);
			setSelectedChoiceId(firstAvailable ? firstAvailable.id : currentMilestone.choices[0]?.id || null);
			setShowChoiceModal(true);
		}
	};

	const handleConfirmChoice = () => {
		if (!currentMilestone || !selectedChoiceId) return;

		const chosen = currentMilestone.choices.find((c) => c.id === selectedChoiceId);
		if (!chosen) return;

		// 1. Grant prerequisite if specified
		if (chosen.grantsPrerequisiteId) {
			addEndlessPrerequisite(chosen.grantsPrerequisiteId);
		}

		// 2. Apply choice effects to store
		applyMilestoneEffects(chosen.effects);

		// 3. Run simulation for the gap years
		const gapMonths = currentMilestone.gapYears * 12;
		const forecast = generateForecast(
			store.accounts,
			store.incomes,
			store.transferRules,
			store.goals,
			store.expenses,
			store.cards,
			store.loans,
			store.retirements,
			gapMonths
		);
		const endSnapshot = forecast[forecast.length - 1];
		applyTimeSkip(endSnapshot);

		// 4. Advance age and milestone index
		setEndlessAge(currentMilestone.age);
		const nextIdx = endlessMilestoneIndex + 1;
		setEndlessMilestoneIndex(nextIdx);

		// 5. Stochastic life event roll
		const rolledEvent = rollForLifeEvent(currentMilestone.age);
		let eventNote = "";
		if (rolledEvent) {
			const createdNodeId = rolledEvent.action(store);
			if (createdNodeId) {
				setFlashingNodeId(createdNodeId);
			}
			eventNote = `${rolledEvent.title}: ${rolledEvent.description}`;
		}

		// 6. Close choice modal and display non-blocking floating alert
		setShowChoiceModal(false);
		setSelectedChoiceId(null);
		setFloatingAlert({
			title: `Chapter Advanced: Age ${currentMilestone.age} (+${currentMilestone.gapYears} Yrs)`,
			narrative: chosen.effects.eventMessage || chosen.description,
			eventNote
		});

		// 7. If reached final milestone (Age 65), trigger retirement celebration!
		if (currentMilestone.id === "ms_age_65" || nextIdx >= milestones.length) {
			setShowRetirementModal(true);
		}
	};

	const handleResetJourney = () => {
		setShowRetirementModal(false);
		loadLevel({
			levelId: "endless_run",
			category: "endless",
			forecastMonths: 600,
			client: {
				name: "You",
				description: "Your entire financial lifetime.",
				prompt: "Welcome to the sandbox. Build generational wealth, survive economic downturns, and plan for retirement.",
				portraitId: "player_01"
			},
			startingState: {
				accounts: [{ id: "acc_1", name: "Teen Checking", type: "checking", balance: 200, apy: 0.01 }],
				income: [{ id: "inc_1", name: "High School Part-Time Job", amount: 650, taxRate: 10, frequency: "monthly", routings: [] }],
				expenses: [{ id: "exp_1", name: "Phone Plan & Gas", amount: 120, isFixed: true }],
				goals: []
			},
			allowedActions: {
				canCreateAccounts: true,
				canDeleteAccounts: true,
				allowedAccountTypes: ["checking", "savings", "brokerage"],
				allowedCardTypes: ["credit"]
			},
			winConditions: { requiredAccounts: [] }
		});
	};

	return (
		<>
			{/* Timeline Status & Advance Button - Repositioned cleanly away from header & Back button */}
			<div className="absolute top-20 right-10 z-30 flex items-center gap-4 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border-2 border-emerald-100">
				<div className="flex flex-col pr-4 border-r border-slate-200">
					<div className="flex items-center gap-1.5">
						<span className="text-sm">🌱</span>
						<span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
							Lifetime Sandbox
						</span>
					</div>
					<span className="text-xl font-black text-slate-900 tracking-tight">Age {endlessAge}</span>
					<span className="text-[11px] font-semibold text-slate-500">
						{isComplete ? (
							<span className="text-emerald-700 font-bold">50-Year Journey Concluded</span>
						) : currentMilestone ? (
							`Next: Age ${currentMilestone.age} (+${currentMilestone.gapYears} Yrs)`
						) : (
							"Finished"
						)}
					</span>
				</div>

				<button
					onClick={handleOpenChapterModal}
					className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-200 transition-all active:scale-95 flex items-center gap-2 cursor-pointer text-sm"
				>
					{isComplete ? (
						<>
							<span>View Lifetime Legacy</span>
							<span>🏆</span>
						</>
					) : (
						<>
							<span>Advance Chapter</span>
							<span>⏭</span>
						</>
					)}
				</button>
			</div>

			{/* Interactive Milestone Choice Modal */}
			{showChoiceModal && currentMilestone && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
					<div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
						{/* Header */}
						<div className="bg-emerald-700 px-6 py-4 flex items-center justify-between text-white shrink-0">
							<div className="flex items-center gap-3">
								<span className="text-2xl">🌱</span>
								<div>
									<div className="flex items-center gap-2">
										<span className="text-xs font-bold uppercase tracking-wider bg-emerald-800/80 px-2 py-0.5 rounded">
											Age {currentMilestone.age} • +{currentMilestone.gapYears} Years Life Gap
										</span>
									</div>
									<h2 className="text-lg sm:text-xl font-black tracking-tight">{currentMilestone.title}</h2>
								</div>
							</div>
							<button
								onClick={() => setShowChoiceModal(false)}
								className="text-white/80 hover:text-white text-xl font-bold p-1 cursor-pointer"
							>
								✕
							</button>
						</div>

						{/* Narrative Brief */}
						<div className="p-6 overflow-y-auto space-y-4">
							<p className="text-slate-600 leading-relaxed text-sm bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
								{currentMilestone.narrative}
							</p>

							{/* Choices List */}
							<div className="space-y-3">
								<h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
									Select Your Direction:
								</h3>

								{currentMilestone.choices.map((choice) => {
									const isLocked =
										!!choice.prerequisiteOptionId &&
										!endlessCompletedPrerequisites.includes(choice.prerequisiteOptionId);
									const isSelected = selectedChoiceId === choice.id;

									return (
										<div
											key={choice.id}
											onClick={() => {
												if (!isLocked) setSelectedChoiceId(choice.id);
											}}
											className={`p-4 rounded-xl border-2 transition-all flex flex-col gap-2 ${
												isLocked
													? "bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed"
													: isSelected
													? "bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-200 cursor-pointer"
													: "bg-white border-slate-200 hover:border-emerald-300 hover:bg-slate-50 cursor-pointer"
											}`}
										>
											<div className="flex items-start justify-between gap-2">
												<div className="flex items-center gap-2 flex-wrap">
													<div
														className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
															isSelected ? "border-emerald-600 bg-emerald-600" : "border-slate-300"
														}`}
													>
														{isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
													</div>
													<h4 className="font-bold text-slate-900 text-sm">{choice.title}</h4>
													{choice.tag && (
														<span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
															{choice.tag}
														</span>
													)}
												</div>

												{isLocked && (
													<span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1 shrink-0">
														<span>🔒</span> Locked
													</span>
												)}
											</div>

											<p className="text-xs text-slate-600 pl-6 leading-relaxed">{choice.description}</p>

											{/* Financial Effects Pills */}
											<div className="pl-6 flex flex-wrap gap-1.5 pt-1">
												{choice.effects.incomesToUpdate?.map((inc, i) => (
													<span
														key={i}
														className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded"
													>
														💰 Income: ${inc.amount}/mo
													</span>
												))}
												{choice.effects.incomesToAdd?.map((inc, i) => (
													<span
														key={i}
														className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded"
													>
														+💰 New Income: ${inc.amount}/mo
													</span>
												))}
												{choice.effects.expensesToAdd?.map((exp, i) => (
													<span
														key={i}
														className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded"
													>
														💸 +${exp.amount}/mo {exp.name}
													</span>
												))}
												{choice.effects.loansToAdd?.map((loan, i) => (
													<span
														key={i}
														className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded"
													>
														⚠️ Loan: ${loan.balance.toLocaleString()} ({loan.apr}% APR)
													</span>
												))}
												{choice.effects.cardsToAdd?.map((card, i) => (
													<span
														key={i}
														className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded"
													>
														💳 Credit Debt: ${card.balance.toLocaleString()} ({card.apr}% APR)
													</span>
												))}
												{choice.effects.retirementsToAdd?.map((ret, i) => (
													<span
														key={i}
														className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded"
													>
														📈 401(k) Match: {ret.employerMatchPercent}%
													</span>
												))}
												{choice.effects.insurancesToAdd?.map((ins, i) => (
													<span
														key={i}
														className="text-[10px] font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded"
													>
														🛡️ Insurance: ${ins.premium}/mo
													</span>
												))}
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* Footer Actions */}
						<div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
							<button
								onClick={() => setShowChoiceModal(false)}
								className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
							>
								Cancel & Check Canvas
							</button>
							<button
								onClick={handleConfirmChoice}
								disabled={!selectedChoiceId}
								className={`px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2 ${
									selectedChoiceId
										? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95"
										: "bg-slate-200 text-slate-400 cursor-not-allowed"
								}`}
							>
								<span>Confirm Path & Advance (+{currentMilestone.gapYears} Yrs)</span>
								<span>→</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Floating Non-Blocking Toast Banner (Replaces Obtrusive Full-Screen Modal) */}
			{floatingAlert && (
				<div className="fixed bottom-8 right-8 z-40 max-w-md bg-white border-2 border-emerald-400 shadow-2xl rounded-2xl p-4 animate-in slide-in-from-bottom duration-300">
					<div className="flex items-start justify-between gap-3 mb-2">
						<div className="flex items-center gap-2">
							<span className="text-xl">🌱</span>
							<h4 className="font-extrabold text-slate-900 text-sm">{floatingAlert.title}</h4>
						</div>
						<button
							onClick={() => setFloatingAlert(null)}
							className="text-slate-400 hover:text-slate-700 font-bold text-sm p-1 cursor-pointer"
						>
							✕
						</button>
					</div>

					<p className="text-xs text-slate-600 mb-2 leading-relaxed">{floatingAlert.narrative}</p>

					{floatingAlert.eventNote && (
						<div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg text-amber-900 text-xs font-medium mb-2">
							<span className="font-bold">⚠️ Sudden Life Event:</span> {floatingAlert.eventNote}
						</div>
					)}

					<div className="flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200/60 font-medium">
						<span>✨ New nodes added to canvas. Rebalance your cash flow!</span>
						<button
							onClick={() => setFloatingAlert(null)}
							className="font-bold underline hover:opacity-80 ml-2 cursor-pointer"
						>
							Got it
						</button>
					</div>
				</div>
			)}

			{/* 50-Year Retirement Celebration Modal */}
			{showRetirementModal && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-in zoom-in-95">
					<div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border-2 border-emerald-200 flex flex-col">
						<div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center relative">
							<span className="text-5xl mb-2 block animate-bounce">🏆</span>
							<h2 className="text-2xl sm:text-3xl font-black tracking-tight">50-Year Lifetime Complete!</h2>
							<p className="text-emerald-100 text-xs sm:text-sm mt-1">
								From a 16-year-old with a part-time job to Age 65 financial independence.
							</p>
						</div>

						<div className="p-6 space-y-6">
							{/* Legacy Tier Banner */}
							<div className={`p-4 rounded-2xl border-2 text-center ${financialStats.tierBadgeColor}`}>
								<span className="text-xs font-bold uppercase tracking-wider block opacity-75">
									Generational Legacy Rating
								</span>
								<span className="text-lg sm:text-xl font-black mt-0.5 block">{financialStats.tier}</span>
							</div>

							{/* Stats Grid */}
							<div className="grid grid-cols-2 gap-3">
								<div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
									<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
										Lifetime Net Worth
									</span>
									<span
										className={`text-xl font-black mt-1 block ${
											financialStats.netWorth >= 0 ? "text-emerald-700" : "text-rose-600"
										}`}
									>
										${financialStats.netWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
									</span>
								</div>

								<div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
									<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
										Retirement Portfolio
									</span>
									<span className="text-xl font-black text-teal-700 mt-1 block">
										${financialStats.retirementInvestments.toLocaleString(undefined, { maximumFractionDigits: 0 })}
									</span>
								</div>

								<div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
									<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
										Cash & Liquid Reserves
									</span>
									<span className="text-lg font-black text-slate-800 mt-1 block">
										${financialStats.cashLiquid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
									</span>
								</div>

								<div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-center">
									<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
										Remaining Liabilities
									</span>
									<span
										className={`text-lg font-black mt-1 block ${
											financialStats.totalDebts === 0 ? "text-emerald-600" : "text-rose-600"
										}`}
									>
										{financialStats.totalDebts === 0
											? "Debt Free! 🎉"
											: `$${financialStats.totalDebts.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
									</span>
								</div>
							</div>

							{/* Unlocked Badges */}
							<div>
								<span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
									Milestone Achievements:
								</span>
								<div className="flex flex-wrap gap-1.5">
									{endlessCompletedPrerequisites.includes("college_degree") && (
										<span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-lg">
											🎓 College Graduate
										</span>
									)}
									{endlessCompletedPrerequisites.includes("skilled_trade") && (
										<span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-lg">
											⚡ Master Trade Craftsman
										</span>
									)}
									{endlessCompletedPrerequisites.includes("workforce_experience") && (
										<span className="text-xs bg-slate-100 text-slate-800 font-bold px-2.5 py-1 rounded-lg">
											💼 Veteran Industry Leader
										</span>
									)}
									{endlessCompletedPrerequisites.includes("married") && (
										<span className="text-xs bg-purple-100 text-purple-800 font-bold px-2.5 py-1 rounded-lg">
											💍 Dual Household Power
										</span>
									)}
									{endlessCompletedPrerequisites.includes("homeowner") && (
										<span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-lg">
											🏡 Real Estate Equity Owner
										</span>
									)}
									{financialStats.totalDebts === 0 && (
										<span className="text-xs bg-emerald-100 text-emerald-900 font-bold px-2.5 py-1 rounded-lg">
											🛡️ 100% Debt-Free Finale
										</span>
									)}
								</div>
							</div>
						</div>

						{/* Footer Actions */}
						<div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row gap-2.5">
							<button
								onClick={() => setShowRetirementModal(false)}
								className="flex-1 py-3 text-slate-700 bg-white border border-slate-300 font-bold rounded-xl hover:bg-slate-100 text-sm cursor-pointer"
							>
								Inspect Final Canvas
							</button>
							<button
								onClick={handleResetJourney}
								className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md cursor-pointer"
							>
								Start New Journey 🌱
							</button>
							<button
								onClick={() => {
									setShowRetirementModal(false);
									setCurrentScreen("main_menu");
								}}
								className="py-3 px-4 text-slate-500 font-semibold hover:text-slate-800 text-sm cursor-pointer"
							>
								Exit to Menu
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
