import { useFinanceStore } from "../../store/financeStore";

export function EndlessMenu() {
	const { setCurrentScreen, loadLevel } = useFinanceStore();

	const handleStartEndless = () => {
		loadLevel({
			levelId: "endless_run",
			category: "endless",
			forecastMonths: 60,
			client: {
				name: "You",
				description: "Your entire financial lifetime.",
				prompt: "Welcome to the sandbox. Build generational wealth, survive economic downturns, and plan for retirement.",
				portraitId: "player_01"
			},
			startingState: {
				accounts: [{ id: "acc_1", name: "Teen Checking", type: "checking", balance: 200, apy: 0.01 }],
				income: [{ id: "inc_1", name: "High School Part-Time Job", amount: 650, taxRate: 10, frequency: "monthly", routings: [] }],
				expenses: [
					{ id: "exp_1", name: "Phone Plan & Gas", amount: 120, isFixed: true }
				],
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
		setCurrentScreen("game");
	};

	return (
		<div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-6">
			<div className="bg-white p-10 sm:p-12 rounded-2xl shadow-xl border-2 border-emerald-100 max-w-2xl text-center">
				<div className="w-16 h-16 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 shadow-inner">
					🌱
				</div>
				<h1 className="text-3xl sm:text-4xl font-extrabold text-emerald-950 mb-3 tracking-tight">Endless Lifetime Simulation</h1>
				<p className="text-slate-600 mb-8 leading-relaxed text-sm sm:text-base">
					Take control of your avatar starting at age 16 with your first paycheck. Navigate multi-year life chapters—from college and trade apprenticeships, first apartments, and career launches, to marriage, homeownership, and healthcare shocks. Build generational wealth or escape debt traps across a 50-year journey!
				</p>
				<button
					onClick={handleStartEndless}
					className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-200 transition-all w-full text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer"
				>
					<span>Begin 50-Year Lifetime Journey (Age 16)</span>
					<span>→</span>
				</button>
				<button onClick={() => setCurrentScreen("main_menu")} className="mt-4 px-4 py-2 text-slate-500 font-semibold hover:text-slate-800 text-sm cursor-pointer">
					← Return to Main Menu
				</button>
			</div>
		</div>
	);
}
