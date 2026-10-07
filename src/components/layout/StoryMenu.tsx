import { useEffect, useState } from "react";
import { useFinanceStore } from "../../store/financeStore";
import { useStoryStore } from "../../store/storyStore";
import { generateInitialCharacters, applyTimeSkipDeviation } from "../../engines/storyEngine";

export function StoryMenu() {
	const { setCurrentScreen, loadLevel } = useFinanceStore();
	const { roundNumber, characterPool, setActiveCharacter, addCharacterToPool } = useStoryStore();
	const [choices, setChoices] = useState<any[]>([]);

	useEffect(() => {
		if (characterPool.length === 0) {
			const initialChars = generateInitialCharacters();
			initialChars.forEach(addCharacterToPool);
			setChoices(initialChars);
		} else {
			const returningChar = characterPool[characterPool.length - 1];
			const newChars = generateInitialCharacters().slice(0, 2);

			const yearsSkipped = Math.floor(Math.random() * 4) + 2;
			const deviatedChar = applyTimeSkipDeviation(returningChar, yearsSkipped);

			setChoices([deviatedChar, ...newChars]);
		}
	}, [characterPool, addCharacterToPool]);

	const handleSelectCharacter = (character: any) => {
		setActiveCharacter(character.id);

		if (!characterPool.some((c) => c.id === character.id)) {
			addCharacterToPool(character);
		}

		loadLevel({
			levelId: `story_${character.id}_${roundNumber}`,
			category: "story",
			forecastMonths: 12,
			client: {
				name: character.name,
				description: `Age: ${character.age} | Family: ${character.familyState} | Trait: ${character.traits.join(", ")}`,
				prompt: character.prompt,
				portraitId: character.portraitId
			},
			startingState: character.savedFinancialState,
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
		<div className="w-full h-full bg-gray-50 flex flex-col overflow-y-auto">
			<header className="bg-white border-b py-8 px-12 shrink-0 relative">
				<button onClick={() => setCurrentScreen("main_menu")} className="absolute top-8 right-12 text-sm font-bold text-gray-500 hover:text-gray-800">
					← Main Menu
				</button>
				<h1 className="text-3xl font-bold text-purple-900 mb-2">Advisory Firm - Round {roundNumber}</h1>
				<p className="text-gray-600">Select a client to advise. The relationships you build here will span years.</p>
			</header>

			<main className="flex-1 p-12 max-w-6xl mx-auto w-full">
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{choices.map((char) => (
						<div
							key={char.id}
							className="bg-white p-6 rounded-xl border-2 border-purple-100 hover:border-purple-400 hover:shadow-lg cursor-pointer transition-all flex flex-col"
							onClick={() => handleSelectCharacter(char)}
						>
							<div className="flex items-center gap-4 mb-4 border-b pb-4">
								<div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center text-2xl">👤</div>
								<div>
									<h2 className="text-xl font-bold text-gray-900">
										{char.name}, {char.age}
									</h2>
									<div className="flex gap-2 mt-1">
										{char.traits.map((trait: string) => (
											<span key={trait} className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
												{trait}
											</span>
										))}
									</div>
								</div>
							</div>

							<div className="bg-purple-50 p-3 rounded-lg border border-purple-100 italic text-sm text-purple-900 mb-6 flex-1 relative">
								<span className="absolute -top-2 -left-1 text-2xl text-purple-300">"</span>
								{char.prompt}
							</div>

							<button className="w-full py-2.5 bg-purple-600 text-white font-bold rounded hover:bg-purple-700 transition-colors text-sm">
								Accept Client
							</button>
						</div>
					))}
				</div>
			</main>
		</div>
	);
}
