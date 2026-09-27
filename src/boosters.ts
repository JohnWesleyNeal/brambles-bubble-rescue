export type BoosterId = 'rainbow' | 'double' | 'bonk';

export interface BoosterDefinition {
  id: BoosterId;
  name: string;
  symbol: string;
  description: string;
  unlockLevel: number;
}

export const boosters: BoosterDefinition[] = [
  { id: 'rainbow', name: 'Rainbow Pop', symbol: '🌈', description: 'Burst the connected color you hit. Dew cracks; honeycomb blocks it.', unlockLevel: 1 },
  { id: 'double', name: 'Double Pop', symbol: '✿', description: 'Your current color pops with a pair instead of three.', unlockLevel: 5 },
  { id: 'bonk', name: 'Bonk', symbol: '⬢', description: 'Remove the first tile you hit, even dew or honeycomb.', unlockLevel: 8 }
];

export const boosterById = Object.fromEntries(boosters.map((booster) => [booster.id, booster])) as Record<BoosterId, BoosterDefinition>;
