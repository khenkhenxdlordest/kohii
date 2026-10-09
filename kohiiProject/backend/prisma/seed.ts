// Seed: stores, default users, categories, inventory items, products + recipes.
// Run: npx prisma db seed   (safe to re-run — uses upsert)
import 'dotenv/config';
import { hashPassword } from '../src/common/utils/password.js';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  CategoryGroup,
  InventoryItemType,
  ProductSize,
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
    'Special Drinks': CategoryGroup.DRINKS,
    'Non-Coffee': CategoryGroup.DRINKS,
    'Hojicha & Matcha': CategoryGroup.DRINKS,
    'Rice Meals': CategoryGroup.RICE_MEALS,
    Snacks: CategoryGroup.SNACKS,
  };
  const categories: Record<string, number> = {};
  for (const [name, group] of Object.entries(categoryGroups)) {
    const c = await prisma.category.upsert({ where: { name }, update: { group }, create: { name, group } });
    categories[name] = c.id;
  }

  // ── Inventory items (iisang stock para sa Alley at Podium) ──
  // Mula sa interview noong 10/09/2026 (docs/october92026). Ang may "kumpirmahin" ay hindi pa alam ang eksaktong laki.
  type SeedPack = { label: string; size: number };
  const items: {
    name: string;
    type: InventoryItemType;
    unit: Unit;
    stockQty: number;
    lowStockThreshold: number;
    packs?: SeedPack[];
  }[] = [
    // Coffee bar
    { name: 'Espresso Beans', type: InventoryItemType.RAW_MATERIAL, unit: Unit.G, stockQty: 5000, lowStockThreshold: 1000, packs: [{ label: 'Pack', size: 1000 }] },
    { name: 'Fresh Milk', type: InventoryItemType.RAW_MATERIAL, unit: Unit.ML, stockQty: 10000, lowStockThreshold: 2000, packs: [{ label: 'Pack', size: 1000 }] }, // farm fresh; kumpirmahin ang laki
    { name: 'Condensed Milk', type: InventoryItemType.RAW_MATERIAL, unit: Unit.G, stockQty: 3600, lowStockThreshold: 1200, packs: [{ label: 'Pack', size: 1200 }] },
    { name: 'Matcha Powder', type: InventoryItemType.RAW_MATERIAL, unit: Unit.G, stockQty: 1000, lowStockThreshold: 200, packs: [{ label: 'Pack', size: 200 }] },
    { name: 'Chocolate Lava', type: InventoryItemType.RAW_MATERIAL, unit: Unit.G, stockQty: 1500, lowStockThreshold: 500, packs: [{ label: 'Pack', size: 500 }] },
    { name: 'Chocolate Syrup', type: InventoryItemType.RAW_MATERIAL, unit: Unit.ML, stockQty: 2000, lowStockThreshold: 1000, packs: [{ label: 'Bottle', size: 1000 }] },
    { name: 'Caramel Syrup', type: InventoryItemType.RAW_MATERIAL, unit: Unit.ML, stockQty: 2000, lowStockThreshold: 1000, packs: [{ label: 'Bottle', size: 1000 }] },
    { name: 'Sugar Syrup', type: InventoryItemType.RAW_MATERIAL, unit: Unit.ML, stockQty: 3000, lowStockThreshold: 1000, packs: [{ label: 'Bottle', size: 1000 }] },
    // Packaging: 12oz (hot), 16oz (iced), 22oz
    { name: '12oz Hot Cup', type: InventoryItemType.PACKAGING, unit: Unit.PCS, stockQty: 200, lowStockThreshold: 50, packs: [{ label: 'Pack', size: 50 }] }, // kumpirmahin ilan bawat balot
    { name: '16oz Cup', type: InventoryItemType.PACKAGING, unit: Unit.PCS, stockQty: 500, lowStockThreshold: 100, packs: [{ label: 'Pack', size: 50 }] },
    { name: '22oz Cup', type: InventoryItemType.PACKAGING, unit: Unit.PCS, stockQty: 200, lowStockThreshold: 50, packs: [{ label: 'Pack', size: 50 }] },
    { name: '12oz Hot Lid', type: InventoryItemType.PACKAGING, unit: Unit.PCS, stockQty: 200, lowStockThreshold: 50, packs: [{ label: 'Pack', size: 50 }] },
    { name: 'Flat Lid', type: InventoryItemType.PACKAGING, unit: Unit.PCS, stockQty: 500, lowStockThreshold: 100, packs: [{ label: 'Pack', size: 50 }] }, // 16oz
    { name: '22oz Lid', type: InventoryItemType.PACKAGING, unit: Unit.PCS, stockQty: 200, lowStockThreshold: 50, packs: [{ label: 'Pack', size: 50 }] },
    { name: 'Straw', type: InventoryItemType.PACKAGING, unit: Unit.PCS, stockQty: 1000, lowStockThreshold: 200, packs: [{ label: 'Plastic', size: 100 }] },
    { name: 'Tissue', type: InventoryItemType.PACKAGING, unit: Unit.PCS, stockQty: 600, lowStockThreshold: 150, packs: [{ label: 'Pack', size: 150 }] }, // pulls
    // Kitchen (Alley)
    { name: 'Rice', type: InventoryItemType.MEAL, unit: Unit.G, stockQty: 10000, lowStockThreshold: 3000, packs: [{ label: 'Sack', size: 25000 }, { label: 'Kilo', size: 1000 }] }, // tantya; puwedeng per sako o per kilo
    { name: 'Cooking Oil', type: InventoryItemType.MEAL, unit: Unit.ML, stockQty: 2000, lowStockThreshold: 500, packs: [{ label: 'Pack', size: 1000 }, { label: 'Bottle', size: 500 }] }, // kumpirmahin ang laki
    { name: 'Ketchup', type: InventoryItemType.MEAL, unit: Unit.PCS, stockQty: 6, lowStockThreshold: 2, packs: [{ label: 'Pack', size: 1 }] },
    { name: 'Mayonnaise', type: InventoryItemType.MEAL, unit: Unit.PCS, stockQty: 6, lowStockThreshold: 2, packs: [{ label: 'Pack', size: 1 }] },
    { name: 'Eggs', type: InventoryItemType.MEAL, unit: Unit.PCS, stockQty: 60, lowStockThreshold: 15, packs: [{ label: 'Tray', size: 30 }] },
    { name: 'Hotdog', type: InventoryItemType.MEAL, unit: Unit.PCS, stockQty: 40, lowStockThreshold: 10, packs: [{ label: 'Pack', size: 10 }] },
    { name: 'Corned Beef', type: InventoryItemType.MEAL, unit: Unit.PCS, stockQty: 12, lowStockThreshold: 4, packs: [{ label: 'Can', size: 1 }] },
    { name: 'Spam', type: InventoryItemType.MEAL, unit: Unit.PCS, stockQty: 12, lowStockThreshold: 4, packs: [{ label: 'Can', size: 1 }] },
    { name: 'Frozen Fries', type: InventoryItemType.MEAL, unit: Unit.G, stockQty: 5000, lowStockThreshold: 1000, packs: [{ label: 'Pack', size: 1000 }] },
    // Snacks / ready to serve
    { name: 'Tiramisu', type: InventoryItemType.SNACK, unit: Unit.PCS, stockQty: 12, lowStockThreshold: 4 },
    { name: 'Nachos', type: InventoryItemType.SNACK, unit: Unit.G, stockQty: 2000, lowStockThreshold: 500, packs: [{ label: 'Pack', size: 500 }] },
    { name: 'Choco Chip Cookie', type: InventoryItemType.SNACK, unit: Unit.PCS, stockQty: 50, lowStockThreshold: 10 },
    { name: 'Banana Bread', type: InventoryItemType.SNACK, unit: Unit.PCS, stockQty: 30, lowStockThreshold: 5 },
    { name: 'Bottled Water', type: InventoryItemType.SNACK, unit: Unit.PCS, stockQty: 48, lowStockThreshold: 12 },
    { name: 'Calbee Honey Butter Chips', type: InventoryItemType.SNACK, unit: Unit.PCS, stockQty: 24, lowStockThreshold: 6 },
  ];
  const inv: Record<string, number> = {};
  for (const { packs = [], ...it } of items) {
    let item = await prisma.inventoryItem.findUnique({ where: { name: it.name } });
    if (!item) {
      item = await prisma.inventoryItem.create({ data: it });
      // Opening stock goes through the ledger like any other stock change.
      await prisma.stockMovement.create({
        data: {
          inventoryItemId: item.id,
          type: 'STOCK_IN',
          qty: it.stockQty,
          balanceAfter: it.stockQty,
          userId: admin.id,
          note: 'Opening stock (seed)',
        },
      });
    }
    // Idinadagdag ang mga lalagyan na wala pa (hindi binabago ang mga dati na)
    for (const [index, pack] of packs.entries()) {
      await prisma.inventoryPack.upsert({
        where: { inventoryItemId_label: { inventoryItemId: item.id, label: pack.label } },
        update: {},
        create: { inventoryItemId: item.id, label: pack.label, size: pack.size, isDefault: index === 0 },
      });
    }
    inv[it.name] = item.id;
  }

  // ── Menu (mula sa docs/october92026/menu.png) ──
  // Drinks: Hot (12oz), Iced (16oz), Upsize (22oz; wala pa sa menu). Food: isang presyo (REGULAR).
  // Ang Coconut Matcha ay wala rito kasi natakpan ang presyo sa larawan.
  type MenuItem = { name: string; category: string; prices: Partial<Record<ProductSize, number>> };
  const hotIced = (hot: number | null, iced: number | null) => ({
    ...(hot !== null ? { HOT: hot } : {}),
    ...(iced !== null ? { ICED: iced } : {}),
  });
  const menu: MenuItem[] = [
    // Coffee (Hot 12oz / Iced 16oz)
    { name: 'Signature Americano', category: 'Coffee', prices: hotIced(100, 100) },
    { name: 'Orange Americano', category: 'Coffee', prices: hotIced(null, 120) },
    { name: 'Cafe Latte', category: 'Coffee', prices: hotIced(120, 120) },
    { name: 'Seasalt Latte', category: 'Coffee', prices: hotIced(130, 130) },
    { name: 'Vietnamese Latte', category: 'Coffee', prices: hotIced(130, 130) },
    { name: 'Spanish Latte', category: 'Coffee', prices: hotIced(130, 130) },
    { name: 'Caramel Macchiato', category: 'Coffee', prices: hotIced(140, 140) },
    { name: 'White Chocolate Latte', category: 'Coffee', prices: hotIced(140, 140) },
    { name: 'Mocha Latte', category: 'Coffee', prices: hotIced(140, 140) },
    { name: 'Peppermint Mocha', category: 'Coffee', prices: hotIced(150, 150) },
    // Special drinks
    { name: 'Salted Cream Coffee', category: 'Special Drinks', prices: hotIced(150, 150) },
    { name: 'Nutella Latte', category: 'Special Drinks', prices: hotIced(150, 150) },
    { name: 'Biscoff Latte', category: 'Special Drinks', prices: hotIced(150, 150) },
    { name: 'Earl Grey Latte', category: 'Special Drinks', prices: hotIced(null, 150) },
    // Non coffee
    { name: 'Signature Hot Choco de Batirol', category: 'Non-Coffee', prices: hotIced(140, null) },
    { name: 'Orange Juice', category: 'Non-Coffee', prices: hotIced(null, 80) },
    { name: 'Kalamansi Juice', category: 'Non-Coffee', prices: hotIced(null, 80) },
    { name: 'Mango Juice', category: 'Non-Coffee', prices: hotIced(null, 100) },
    { name: 'Strawberry Latte', category: 'Non-Coffee', prices: hotIced(null, 120) },
    { name: 'Blueberry Latte', category: 'Non-Coffee', prices: hotIced(null, 120) },
    { name: 'Chocolate Lava', category: 'Non-Coffee', prices: hotIced(null, 120) },
    { name: 'Pink Guava Soda', category: 'Non-Coffee', prices: hotIced(null, 100) },
    { name: 'Blueberry Soda', category: 'Non-Coffee', prices: hotIced(null, 80) },
    { name: 'Strawberry Soda', category: 'Non-Coffee', prices: hotIced(null, 80) },
    // Hojicha & Matcha (isang presyo sa menu; Iced muna, kumpirmahin kung may Hot)
    { name: 'Hojicha Oat Latte', category: 'Hojicha & Matcha', prices: hotIced(null, 150) },
    { name: 'Hojicha Earl Grey', category: 'Hojicha & Matcha', prices: hotIced(null, 160) },
    { name: 'Hojicha Vanilla Latte', category: 'Hojicha & Matcha', prices: hotIced(null, 160) },
    { name: 'Matcha Latte', category: 'Hojicha & Matcha', prices: hotIced(null, 130) },
    { name: 'Earl Grey Matcha', category: 'Hojicha & Matcha', prices: hotIced(null, 150) },
    // Snacks / sandwiches
    { name: 'Fries', category: 'Snacks', prices: { REGULAR: 80 } },
    { name: 'Cheesy Nachos', category: 'Snacks', prices: { REGULAR: 80 } },
    { name: 'Grilled Cheese Sandwich', category: 'Snacks', prices: { REGULAR: 140 } },
    { name: 'Cheesy Hotdog Sandwich', category: 'Snacks', prices: { REGULAR: 100 } },
    { name: 'Spam & Egg Sandwich', category: 'Snacks', prices: { REGULAR: 120 } },
    { name: 'Corned Beef Sandwich', category: 'Snacks', prices: { REGULAR: 120 } },
    { name: 'Overload Sandwich', category: 'Snacks', prices: { REGULAR: 180 } },
    // Rice meals
    { name: 'Corned Beef & Egg Meal', category: 'Rice Meals', prices: { REGULAR: 140 } },
    { name: 'Spam & Egg Meal', category: 'Rice Meals', prices: { REGULAR: 140 } },
    { name: 'Hotdog & Egg Meal', category: 'Rice Meals', prices: { REGULAR: 100 } },
    { name: 'Combo Corned Beef & Spam', category: 'Rice Meals', prices: { REGULAR: 220 } },
    { name: 'Combo Spam & Hotdog', category: 'Rice Meals', prices: { REGULAR: 200 } },
  ];
  for (const item of menu) {
    if (await prisma.product.findUnique({ where: { name: item.name } })) continue;
    const prices = Object.entries(item.prices).map(([size, price]) => ({ size: size as ProductSize, price: price! }));
    await prisma.product.create({
      data: {
        name: item.name,
        type: ProductType.MADE,
        categoryId: categories[item.category],
        prices: { create: prices },
        priceHistory: {
          create: prices.map((p) => ({
            size: p.size,
            oldPrice: null,
            newPrice: p.price,
            changedById: admin.id,
            reason: 'Initial price (menu)',
          })),
        },
      },
    });
  }

  // Ang mga sample na produkto na wala sa totoong menu ay ide-deactivate (hindi buburahin)
  await prisma.product.updateMany({
    where: { name: { notIn: menu.map((m) => m.name) }, isActive: true },
    data: { isActive: false },
  });
  console.log('Seed complete. Default password for all users:', DEFAULT_PASSWORD);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
