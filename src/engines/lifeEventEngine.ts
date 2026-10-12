export interface LifeEvent {
	id: string;
	title: string;
	description: string;
	type: "expense" | "income" | "debt";
	action: (store: any) => string | void;
}

export function rollForLifeEvent(currentAge: number): LifeEvent | null {
	const roll = Math.random();

	if (roll > 0.3) return null;

	const possibleEvents: LifeEvent[] = [];

	possibleEvents.push({
		id: "medical_emergency",
		title: "Medical Emergency",
		description: "An unexpected hospital stay left you with an out-of-pocket medical debt ($3,500 at 5% APR, $100/mo minimum).",
		type: "debt",
		action: (s) => s.addLoan("Medical Emergency Debt", 3500, 5.0, 100)
	});

	possibleEvents.push({
		id: "car_trouble",
		title: "Major Transmission Repair",
		description: "Your vehicle's transmission blew out on the highway. Auto repair shop bill is $2,200 due immediately.",
		type: "expense",
		action: (s) => s.addExpense("Transmission Repair", 2200, true, { occurrenceMonth: 1 })
	});

	if (currentAge >= 22 && currentAge <= 45) {
		possibleEvents.push({
			id: "promotion",
			title: "Merit Performance Promotion",
			description: "Your hard work and leadership earned you an executive merit bonus stream of +$1,100/mo!",
			type: "income",
			action: (s) => s.addIncome("Merit Bonus Stream", 1100, 20, "monthly")
		});

		possibleEvents.push({
			id: "child",
			title: "New Baby Welcomed",
			description: "Congratulations! A new baby brings joy and $1,200/mo in essential childcare and pediatric costs.",
			type: "expense",
			action: (s) => s.addExpense("Childcare & Infant Expenses", 1200, true)
		});
	}

	if (currentAge >= 30) {
		possibleEvents.push({
			id: "appliance_failure",
			title: "Home HVAC Breakdown",
			description: "The home furnace failed during a cold snap. Emergency replacement required ($2,800).",
			type: "expense",
			action: (s) => s.addExpense("HVAC Replacement", 2800, true, { occurrenceMonth: 1 })
		});

		possibleEvents.push({
			id: "side_consulting",
			title: "Consulting Retainer Signed",
			description: "A former client signed you to a monthly advisory contract (+$850/mo revenue).",
			type: "income",
			action: (s) => s.addIncome("Advisory Consulting", 850, 22, "monthly")
		});
	}

	if (possibleEvents.length === 0) return null;

	const selectedEvent = possibleEvents[Math.floor(Math.random() * possibleEvents.length)];
	return selectedEvent;
}
