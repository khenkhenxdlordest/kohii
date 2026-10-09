// Seed: stores, default users, categories, inventory items, products + recipes.
// Run: npx prisma db seed   (safe to re-run — uses upsert)
import 'dotenv/config';
import { hashPassword } from '../src/common/utils/password.js';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  CategoryGroup,
  InventoryItemType,
  ProductType,
  Role,
  StaffPosition,
  Unit,
} from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEFAULT_PASSWORD = 'kohii123'; // must be changed on first login

async function main() {
  // ── Stores ──
  const alley = await prisma.store.upsert({
    where: { code: 'ALY' },
    update: {},
    create: { code: 'ALY', name: 'Alley', hasKitchen: true },
  });
  const podium = await prisma.store.upsert({
    where: { code: 'PDM' },
    update: {},
    create: { code: 'PDM', name: 'Podium', hasKitchen: false },
  });

  // ── Users ──
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const users: {
    username: string;
    role: Role;
    storeId: number | null;
    position?: StaffPosition;
    firstName: string;
    lastName: string;
  }[] = [
    { username: 'admin', role: Role.ADMIN, storeId: null, firstName: 'Kohii', lastName: 'Owner' },
    { username: 'clerk', role: Role.CLERK, storeId: null, firstName: 'Inventory', lastName: 'Clerk' },
    { username: 'cashier1', role: Role.CASHIER, storeId: alley.id, position: StaffPosition.CASHIER, firstName: 'Cashier', lastName: 'Alley' },
    { username: 'cashier2', role: Role.CASHIER, storeId: podium.id, position: StaffPosition.CASHIER, firstName: 'Cashier', lastName: 'Podium' },
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
  // Drinks lang ang puwedeng may upsize
  const categoryGroups: Record<string, CategoryGroup> = {
    Coffee: CategoryGroup.DRINKS,
    'Non-Coffee': CategoryGroup.DRINKS,
    'Rice Meals': CategoryGroup.RICE_MEALS,
    Snacks: CategoryGroup.SNACKS,
  };
  const categories: Record<string, number> = {};
  for (const [name, group] of Object.entries(categoryGroups)) {
    const c = await prisma.category.upsert({ where: { name }, update: { group }, create: { name, group } });
    categories[name] = c.id;
  }

  // ── Inventory items (one pooled stock) ──
  // packSize/packLabel: sample lang; kumpirmahin sa store (docs/STORE_QUESTIONS.md)
  const items: {
    name: string;
    type: InventoryItemType;
    unit: Unit;
    stockQty: number;
    lowStockThreshold: number;
    packSize?: number;
    packLabel?: string;
  }[] = [
    { name: 'Espresso Beans', type: InventoryItemType.RAW_MATERIAL, unit: Unit.G, stockQty: 5000, lowStockThreshold: 1000, packSize: 1000, packLabel: 'bag' },
    { name: 'Fresh Milk', type: InventoryItemType.RAW_MATERIAL, unit: Unit.ML, stockQty: 10000, lowStockThreshold: 2000, packSize: 1000, packLabel: 'pouch' },
    { name: 'Matcha Powder', type: InventoryItemType.RAW_MATERIAL, unit: Unit.G, stockQty: 1000, lowStockThreshold: 200, packSize: 500, packLabel: 'pouch' },
    { name: 'Chocolate Syrup', type: InventoryItemType.RAW_MATERIAL, unit: Unit.ML, stockQty: 2000, lowStockThreshold: 400, packSize: 1000, packLabel: 'bottle' },
    { name: 'Caramel Syrup', type: InventoryItemType.RAW_MATERIAL, unit: Unit.ML, stockQty: 2000, lowStockThreshold: 400, packSize: 1000, packLabel: 'bottle' },
    { name: 'Sugar Syrup', type: InventoryItemType.RAW_MATERIAL, unit: Unit.ML, stockQty: 3000, lowStockThreshold: 500, packSize: 1000, packLabel: 'bottle' },
    { name: '16oz Cup', type: InventoryItemType.PACKAGING, unit: Unit.PCS, stockQty: 500, lowStockThreshold: 100 },
    { name: 'Flat Lid', type: InventoryItemType.PACKAGING, unit: Unit.PCS, stockQty: 500, lowStockThreshold: 100 },
    { name: 'Straw', type: InventoryItemType.PACKAGING, unit: Unit.PCS, stockQty: 1000, lowStockThreshold: 200 },
    { name: 'Choco Chip Cookie', type: InventoryItemType.SNACK, unit: Unit.PCS, stockQty: 50, lowStockThreshold: 10 },
    { name: 'Banana Bread', type: InventoryItemType.SNACK, unit: Unit.PCS, stockQty: 30, lowStockThreshold: 5 },
    { name: 'Bottled Water', type: InventoryItemType.SNACK, unit: Unit.PCS, stockQty: 48, lowStockThreshold: 12 },
    { name: 'Calbee Honey Butter Chips', type: InventoryItemType.SNACK, unit: Unit.PCS, stockQty: 24, lowStockThreshold: 6 },
    { name: 'Nachos', type: InventoryItemType.SNACK, unit: Unit.G, stockQty: 2000, lowStockThreshold: 500, packSize: 500, packLabel: 'pack' },
    // Meals: sample lang hangga't wala pa ang totoong menu
    { name: 'Hotdog', type: InventoryItemType.MEAL, unit: Unit.PCS, stockQty: 40, lowStockThreshold: 10, packSize: 10, packLabel: 'pack' },
    { name: 'Corned Beef', type: InventoryItemType.MEAL, unit: Unit.PCS, stockQty: 12, lowStockThreshold: 4, packSize: 1, packLabel: 'can' },
    { name: 'Spam', type: InventoryItemType.MEAL, unit: Unit.PCS, stockQty: 12, lowStockThreshold: 4, packSize: 1, packLabel: 'can' },
    { name: 'Frozen Fries', type: InventoryItemType.MEAL, unit: Unit.G, stockQty: 5000, lowStockThreshold: 1000, packSize: 1000, packLabel: 'pack' },
  ];
  const inv: Record<string, number> = {};
  for (const it of items) {
    const existing = await prisma.inventoryItem.findUnique({ where: { name: it.name } });
    if (existing) {
      // Idagdag ang pack size sa lumang item kung wala pa
      if (it.packSize && !existing.packSize) {
        await prisma.inventoryItem.update({ where: { id: existing.id }, data: { packSize: it.packSize, packLabel: it.packLabel } });
      }
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
