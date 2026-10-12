import type { CharacterDefinition } from "./types";
export * from "./types";

const modules = import.meta.glob("./*.json", { eager: true });

export const CHARACTER_DEFINITIONS: CharacterDefinition[] = [];
export const CHARACTER_MAP: Record<string, CharacterDefinition> = {};

for (const path in modules) {
	const raw = (modules[path] as any).default || modules[path];
	if (raw && raw.id && raw.stages) {
		const charDef = raw as CharacterDefinition;
		CHARACTER_DEFINITIONS.push(charDef);
		CHARACTER_MAP[charDef.id] = charDef;
	}
}

export function getCharacterDefinition(id: string): CharacterDefinition | undefined {
	return CHARACTER_MAP[id];
}
