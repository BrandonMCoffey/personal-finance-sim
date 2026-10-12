export interface CategoryDef {
	id: string;
	title: string;
	icon: string;
	subCategories: string[];
}

export const CATEGORIES: CategoryDef[] = [
	{
		id: "earning",
		title: "Earning & Income",
		icon: "💵",
		subCategories: [
			"Gross vs. Net Pay",
			"Tracking Cash Flow",
			"Fixed vs. Variable Expenses",
			"The 50/30/20 Rule",
			"Unplanned Spending"
		]
	},
	{
		id: "saving",
		title: "Saving & Goal Setting",
		icon: "🏦",
		subCategories: [
			"Emergency Funds",
			"Short-Term Goals",
			"Account Types",
			"Exponential Growth"
		]
	},
	{
		id: "debt",
		title: "Credit & Debt Management",
		icon: "💳",
		subCategories: [
			"Understanding Credit Cards",
			"Minimum Payments",
			"The Debt Avalanche",
			"The Debt Snowball",
			"Managing Loans"
		]
	},
	{
		id: "investing",
		title: "Investing & Wealth Building",
		icon: "📈",
		subCategories: [
			"The Employer Match",
			"Brokerage Basics",
			"Retirement Planning",
			"Inflation & Purchasing Power",
			"Asset Allocation"
		]
	},
	{
		id: "protecting",
		title: "Protecting & Life Events",
		icon: "🏠",
		subCategories: [
			"Insurance Basics",
			"Major Purchases (Housing)",
			"Major Purchases (Vehicles)",
			"Income Shocks",
			"Predatory Lending"
		]
	}
];

export interface LevelData {
	id: string;
	category: string;
	subCategoryIndex: number;
	title: string;
	desc: string;
	forecastMonths: number;
	hints?: string[];
	client?: any;
	startingState?: any;
	allowedActions?: any;
	winConditions?: any;
}

const modules = import.meta.glob("./*/*.json", { eager: true });

export const LevelRegistry: Record<string, LevelData> = {};
export const levels: LevelData[] = [];

for (const path in modules) {
	const parts = path.split("/");
	const categoryId = parts[1];
	const filename = parts[2];
	const id = filename.replace(".json", "");

	const rawData = (modules[path] as any).default || modules[path];

	const levelData: LevelData = {
		...rawData,
		id,
		category: categoryId
	};

	LevelRegistry[id] = levelData;
	levels.push(levelData);
}
