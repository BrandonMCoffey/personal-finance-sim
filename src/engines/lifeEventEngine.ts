export interface LifeEvent {
	id: string;
	title: string;
	description: string;
	type: "expense" | "income" | "debt";
	action: (store: any) => void;
}

export function rollForLifeEvent(currentAge: number, _: any): LifeEvent | null {
	const roll = Math.random();

	if (roll > 0.25) return null;

	const possibleEvents: LifeEvent[] = [];

	possibleEvents.push({
		id: "medical_emergency",
		title: "Medical Emergency",
		description: "An unexpected hospital visit left you with a hefty bill after insurance.",
		type: "debt",
		action: (s) => s.addLoan("Medical Bill", 3500, 5.0, 100)
	});

	possibleEvents.push({
		id: "car_trouble",
		title: "Major Car Repairs",
		description: "Your transmission blew out. You need to pay this off immediately.",
		type: "expense",
		action: (s) => s.addExpense("Transmission Repair", 2500, true, { occurrenceMonth: 1 })
	});

	if (currentAge >= 22 && currentAge <= 40) {
		possibleEvents.push({
			id: "promotion",
			title: "Job Promotion!",
			description: "Your hard work paid off. You received a significant raise.",
			type: "income",
			action: (s) => {
				// TODO: Update Salary Income?
				s.addIncome("Side Hustle / Bonus", 1000, 25, "monthly");
			}
		});

		possibleEvents.push({
			id: "child",
			title: "New Baby",
			description: "Congratulations! You had a child. Your monthly fixed expenses have skyrocketed.",
			type: "expense",
			action: (s) => s.addExpense("Childcare & Diapers", 1200, true)
		});
	}

	if (possibleEvents.length === 0) return null;

	const selectedEvent = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
	return selectedEvent;
}
