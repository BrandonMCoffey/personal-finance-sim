import { useFinanceStore } from "../../store/financeStore";

export function EndlessMenu() {
	const { setCurrentScreen, loadLevel } = useFinanceStore();

	const handleStartEndless = () => {
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
				accounts: [{ id: "acc_1", name: "Main Checking", type: "checking", balance: 1000, apy: 0 }],
				income: [{ id: "inc_1", name: "Entry Salary", amount: 3000, taxRate: 15, frequency: "monthly", routings: [] }],
				expenses: [
					{ id: "exp_1", name: "Rent", amount: 1200, isFixed: true },
					{ id: "exp_2", name: "Living", amount: 800, isFixed: false, minValue: 400 }
				],
				goals: []
			},
			allowedActions: {
				canCreateAccounts: true,
				canDeleteAccounts: true,
				allowedAccountTypes: ["checking", "savings", "brokerage"],
				allowedCardTypes: ["debit", "credit"]
			},
			winConditions: { requiredAccounts: [] }
		});
		setCurrentScreen("game");
	};

	return (
		<div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center">
			<div className="bg-white p-12 rounded-xl shadow-lg border-2 border-emerald-100 max-w-2xl text-center">
				<h1 className="text-4xl font-bold text-emerald-900 mb-4">Endless Simulation</h1>
				<p className="text-gray-600 mb-8 leading-relaxed">
					Take control of a fresh avatar and simulate 50 years of financial decisions. In this sandbox environment, you will encounter random life
					events, inflation, and market volatility. Your goal is to maximize your net worth by retirement.
				</p>
				<button
					onClick={handleStartEndless}
					className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 shadow-md transition-all w-full text-lg"
				>
					Begin Lifetime Simulation
				</button>
				<button onClick={() => setCurrentScreen("main_menu")} className="mt-4 px-4 py-2 text-gray-500 font-medium hover:text-gray-800">
					Return to Menu
				</button>
			</div>
		</div>
	);
}
