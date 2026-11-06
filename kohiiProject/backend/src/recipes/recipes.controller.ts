import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { RecipesService } from './recipes.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthRequest } from '../auth/jwt-payload.js';
import { Role } from '../common/enums/role.enum.js';
import { requireId, requireQty } from '../common/utils/validation.js';

interface RecipeItemDto {
  inventoryItemId?: unknown;
  qtyPerUnit?: unknown;
}

@Controller('recipes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  // GET /api/recipes
  @Get()
  findAll() {
    return this.recipesService.findAll();
  }

  // PUT /api/recipes/:productId  { items: [{ inventoryItemId, qtyPerUnit }] }
  @Put(':productId')
  replaceRecipe(@Param('productId') productId: string, @Body() body: { items?: RecipeItemDto[] }, @Req() req: AuthRequest) {
    const items = Array.isArray(body?.items) ? body.items : [];
    return this.recipesService.replaceRecipe(
      requireId(productId, 'Product'),
      items.map((i) => ({
        inventoryItemId: requireId(i?.inventoryItemId, 'Ingredient'),
        qtyPerUnit: requireQty(i?.qtyPerUnit, 'Quantity per unit'),
      })),
      req.user.sub,
    );
  }
}
