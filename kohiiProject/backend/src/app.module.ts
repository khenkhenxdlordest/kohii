import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthController } from './health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { StoresModule } from './stores/stores.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ProductsModule } from './products/products.module.js';
import { IngredientsModule } from './ingredients/ingredients.module.js';
import { RecipesModule } from './recipes/recipes.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    StoresModule,
    CategoriesModule,
    ProductsModule,
    IngredientsModule,
    RecipesModule,
    InventoryModule,
    OrdersModule,
    ReportsModule,
    DashboardModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
