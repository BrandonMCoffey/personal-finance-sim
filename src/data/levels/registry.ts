export interface CategoryDef {
	id: string;
	title: string;
	icon: string;
	subCategories: string[];
}

export const CATEGORIES: CategoryDef[] = [
	{
		id: "foundations",
		title: "Financial Foundations",
		icon: "🏦",
		subCategories: ["Cash Flow", "Saving for Goals"]
	},
	{
		id: "debt",
		title: "Credit & Debt",
		icon: "💳",
		subCategories: ["Managing Credit Cards"]
	},
	{
		id: "investing",
		title: "Investing & Retirement",
		icon: "📈",
		subCategories: ["Retirement", "Wealth Building"]
	},
	{
		id: "life",
		title: "Life Events & Taxes",
		icon: "🏠",
		subCategories: []
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
