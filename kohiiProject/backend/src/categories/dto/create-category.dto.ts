export class CreateCategoryDto {
  name!: string;
  /** DRINKS | RICE_MEALS | SNACKS. Drinks lang ang puwedeng may upsize */
  group!: string;
}

export class UpdateCategoryDto {
  name?: string;
  group?: string;
  isActive?: boolean;
}
