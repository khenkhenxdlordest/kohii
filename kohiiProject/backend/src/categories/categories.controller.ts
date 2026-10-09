import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/create-category.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { AuthRequest } from '../auth/jwt-payload.js';
import { Role } from '../common/enums/role.enum.js';
import { CategoryGroup } from '../generated/prisma/client.js';
import { optionalBoolean, optionalString, requireEnum, requireId, requireString } from '../common/utils/validation.js';

const categoryGroups = Object.values(CategoryGroup);

@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // GET /api/categories?includeInactive=true
  @Get()
  findAll(@Req() req: AuthRequest, @Query('includeInactive') includeInactive?: string) {
    // Admin lang ang nakakakita ng naka-deactivate
    return this.categoriesService.findAll(includeInactive === 'true' && req.user.role === Role.ADMIN);
  }

  // POST /api/categories  { name, group: 'DRINKS' | 'RICE_MEALS' | 'SNACKS' }
  @Post()
  @Roles(Role.ADMIN)
  create(@Body() body: CreateCategoryDto, @Req() req: AuthRequest) {
    return this.categoriesService.create(
      { name: requireString(body?.name, 'Name', 50), group: requireEnum(body?.group, categoryGroups, 'Group') },
      req.user.sub,
    );
  }

  // PATCH /api/categories/:id
  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() body: UpdateCategoryDto, @Req() req: AuthRequest) {
    return this.categoriesService.update(
      requireId(id, 'Category'),
      {
        name: optionalString(body?.name, 'Name', 50),
        group: body?.group === undefined ? undefined : requireEnum(body.group, categoryGroups, 'Group'),
        isActive: optionalBoolean(body?.isActive, 'Status'),
      },
      req.user.sub,
    );
  }
}
