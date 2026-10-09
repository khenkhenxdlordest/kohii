import type { CategoryGroup } from '../types';

export const categoryGroupOrder: CategoryGroup[] = ['DRINKS', 'RICE_MEALS', 'SNACKS'];

export const categoryGroupLabels: Record<CategoryGroup, string> = {
  DRINKS: 'Drinks',
  RICE_MEALS: 'Rice Meals',
  SNACKS: 'Snacks',
};

export const categoryGroupHints: Record<CategoryGroup, string> = {
  DRINKS: 'Coffee, non-coffee, matcha. Hot, iced or upsize price.',
  RICE_MEALS: 'Silog and other rice meals. One price only.',
  SNACKS: 'Chips, pastries, fries. One price only.',
};

