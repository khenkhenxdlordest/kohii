// Seed: stores, default users, categories, inventory items, products + recipes.
// Run: npx prisma db seed   (safe to re-run — uses upsert)
import 'dotenv/config';
import { hashPassword } from '../src/common/utils/password.js';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  InventoryItemType,
  ProductType,
  Role,
  Unit,
} from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEFAULT_PASSWORD = 'kohii123'; // must be changed on first login

async function main() {
  // ── Stores ──
  const b1 = await prisma.store.upsert({
    where: { code: 'B1' },
    update: {},
    create: { code: 'B1', name: 'Kohii Cafe by Riri - Branch 1' },
  });
  const b2 = await prisma.store.upsert({
    where: { code: 'B2' },
    update: {},
    create: { code: 'B2', name: 'Kohii Cafe by Riri - Branch 2' },
  });

  // ── Users ──
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const users: { username: string; role: Role; storeId: number | null; firstName: string; lastName: string }[] = [
    { username: 'admin', role: Role.ADMIN, storeId: null, firstName: 'Kohii', lastName: 'Owner' },
    { username: 'clerk', role: Role.CLERK, storeId: null, firstName: 'Inventory', lastName: 'Clerk' },
    { username: 'cashier.b1', role: Role.CASHIER, storeId: b1.id, firstName: 'Cashier', lastName: 'Branch 1' },
    { username: 'cashier.b2', role: Role.CASHIER, storeId: b2.id, firstName: 'Cashier', lastName: 'Branch 2' },
  ];
  for (const { firstName, lastName, ...auth } of users) {
    // AUTH row (User) + PROFILE row (UserProfile) are separate tables.
    await prisma.user.upsert({
      where: { username: auth.username },
      update: {
        passwordHash,
        profile: { upsert: { create: { firstName, lastName }, update: {} } },
      },
      create: { ...auth, passwordHash, profile: { create: { firstName, lastName } } },
    });
  }
  const admin = await prisma.user.findUniqueOrThrow({ where: { username: 'admin' } });

  // ── Categories ──
  const categoryNames = ['Coffee', 'Non-Coffee', 'Snacks'];
  const categories: Record<string, number> = {};
  for (const name of categoryNames) {
    const c = await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
    categories[name] = c.id;
  }

  // ── Inventory items (one pooled stock) ──
  const items: { name: string; type: InventoryItemType; unit: Unit; stockQty: number; lowStockThreshold: number }[] = [
    { name: 'Espresso Beans', type: InventoryItemType.RAW_MATERIAL, unit: Unit.G, stockQty: 5000, lowStockThreshold: 1000 },
    { name: 'Fresh Milk', type: InventoryItemType.RAW_MATERIAL, unit: Unit.ML, stockQty: 10000, lowStockThreshold: 2000 },
    { name: 'Matcha Powder', type: InventoryItemType.RAW_MATERIAL, unit: Unit.G, stockQty: 1000, lowStockThreshold: 200 },
    { name: 'Chocolate Syrup', type: InventoryItemType.RAW_MATERIAL, unit: Unit.ML, stockQty: 2000, lowStockThreshold: 400 },
    { name: 'Caramel Syrup', type: InventoryItemType.RAW_MATERIAL, unit: Unit.ML, stockQty: 2000, lowStockThreshold: 400 },
    { name: 'Sugar Syrup', type: InventoryItemType.RAW_MATERIAL, unit: Unit.ML, stockQty: 3000, lowStockThreshold: 500 },
    { name: '16oz Cup', type: InventoryItemType.PACKAGING, unit: Unit.PCS, stockQty: 500, lowStockThreshold: 100 },
    { name: 'Flat Lid', type: InventoryItemType.PACKAGING, unit: Unit.PCS, stockQty: 500, lowStockThreshold: 100 },
    { name: 'Straw', type: InventoryItemType.PACKAGING, unit: Unit.PCS, stockQty: 1000, lowStockThreshold: 200 },
    { name: 'Choco Chip Cookie', type: InventoryItemType.SNACK, unit: Unit.PCS, stockQty: 50, lowStockThreshold: 10 },
    { name: 'Banana Bread', type: InventoryItemType.SNACK, unit: Unit.PCS, stockQty: 30, lowStockThreshold: 5 },
    { name: 'Bottled Water', type: InventoryItemType.SNACK, unit: Unit.PCS, stockQty: 48, lowStockThreshold: 12 },
  ];
  const inv: Record<string, number> = {};
  for (const it of items) {
    const existing = await prisma.inventoryItem.findUnique({ where: { name: it.name } });
    if (existing) {
      inv[it.name] = existing.id;
      continue;
    }
    // Opening stock goes through the ledger like any other stock change.
    const created = await prisma.inventoryItem.create({ data: it });
    await prisma.stockMovement.create({
      data: {
        inventoryItemId: created.id,
        type: 'STOCK_IN',
        qty: it.stockQty,
        balanceAfter: it.stockQty,
        userId: admin.id,
        note: 'Opening stock (seed)',
      },
    });
    inv[it.name] = created.id;
  }

  // ── Products + recipes ──
  const cupSet = { '16oz Cup': 1, 'Flat Lid': 1, Straw: 1 };
  const products: { name: string; category: string; type: ProductType; price: number; recipe: Record<string, number> }[] = [
    { name: 'Iced Americano', category: 'Coffee', type: ProductType.MADE, price: 110, recipe: { 'Espresso Beans': 18, ...cupSet } },
    { name: 'Iced Latte', category: 'Coffee', type: ProductType.MADE, price: 130, recipe: { 'Espresso Beans': 18, 'Fresh Milk': 200, ...cupSet } },
    { name: 'Iced Caramel Macchiato', category: 'Coffee', type: ProductType.MADE, price: 150, recipe: { 'Espresso Beans': 18, 'Fresh Milk': 180, 'Caramel Syrup': 30, ...cupSet } },
    { name: 'Iced Mocha', category: 'Coffee', type: ProductType.MADE, price: 145, recipe: { 'Espresso Beans': 18, 'Fresh Milk': 180, 'Chocolate Syrup': 30, ...cupSet } },
    { name: 'Iced Matcha Latte', category: 'Non-Coffee', type: ProductType.MADE, price: 140, recipe: { 'Matcha Powder': 10, 'Fresh Milk': 200, 'Sugar Syrup': 20, ...cupSet } },
    { name: 'Iced Chocolate', category: 'Non-Coffee', type: ProductType.MADE, price: 120, recipe: { 'Chocolate Syrup': 40, 'Fresh Milk': 200, ...cupSet } },
    { name: 'Choco Chip Cookie', category: 'Snacks', type: ProductType.READY_MADE, price: 60, recipe: { 'Choco Chip Cookie': 1 } },
    { name: 'Banana Bread', category: 'Snacks', type: ProductType.READY_MADE, price: 75, recipe: { 'Banana Bread': 1 } },
    { name: 'Bottled Water', category: 'Snacks', type: ProductType.READY_MADE, price: 25, recipe: { 'Bottled Water': 1 } },
  ];
  for (const p of products) {
    if (await prisma.product.findUnique({ where: { name: p.name } })) continue;
    await prisma.product.create({
      data: {
        name: p.name,
        type: p.type,
        currentPrice: p.price,
        categoryId: categories[p.category],
        recipeItems: {
          create: Object.entries(p.recipe).map(([item, qty]) => ({
            inventoryItemId: inv[item],
            qtyPerUnit: qty,
          })),
        },
        priceHistory: {
          create: { oldPrice: null, newPrice: p.price, changedById: admin.id, reason: 'Initial price (seed)' },
        },
      },
    });
  }

  console.log('Seed complete. Default password for all users:', DEFAULT_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
