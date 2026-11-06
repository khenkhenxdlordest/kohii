import type { CategoryGroup } from '../types';

export const remarksPresets: Record<CategoryGroup, string[]> = {
  RICE_MEALS: ['No Catsup', 'No Mayo', 'Extra Catsup', 'Extra Mayo'],
  DRINKS: ['Less Sugar', 'More Sugar', '2 Shots', '3 Shots', 'No Ice'],
  SNACKS: [],
};
