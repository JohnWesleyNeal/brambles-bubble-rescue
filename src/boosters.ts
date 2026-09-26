export type BoosterId = 'rainbow' | 'double' | 'bonk';

export interface BoosterDefinition {
  id: BoosterId;
  name: string;
  symbol: string;
  description: string;
  price: number;
  unlockLevel: number;
}

export const boosters: BoosterDefinition[] = [
  { id: 'rainbow', name: 'Rainbow Pop', symbol: '✦', description: 'Choose any color still on the board for this shot.', price: 3, unlockLevel: 1 },
  { id: 'double', name: 'Double Pop', symbol: '✿', description: 'Your current color pops with a pair instead of three.', price: 4, unlockLevel: 5 },
  { id: 'bonk', name: 'Bonk', symbol: '⬢', description: 'Remove the first tile you hit, even dew or honeycomb.', price: 6, unlockLevel: 8 }
];

export const boosterById = Object.fromEntries(boosters.map((booster) => [booster.id, booster])) as Record<BoosterId, BoosterDefinition>;
