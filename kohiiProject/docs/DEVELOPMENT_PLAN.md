# Kohii Cafe — Development Structure Plan

> Kasama ng: [`SCHEMA_PLAN.md`](SCHEMA_PLAN.md) · Basehan: Chapter 1
> Stack: **NestJS 12 + Prisma 7 + PostgreSQL 17** (backend, port 3000) · **React 19 + Vite** (frontend, port 5173)

---

## 0. Mga patakaran habang nagde-develop

| Patakaran | Detalye |
|---|---|
| 🔓 **Password: plain text muna** | Sa `PASSWORD_HASHING=false` (`backend/.env`), naka-save nang plain text ang password para madaling mag-test. **Bubuksan lang ang hashing sa Phase 7, bago ang final defense.** |
| Iisang file lang ang humahawak ng password | `backend/src/common/utils/password.ts` (`hashPassword` / `verifyPassword`). **Huwag** direktang gamitin ang `bcrypt` o mag-compare ng password sa ibang file, para sa final ay isang setting lang ang papalitan. |
| Lahat ng pagbabago sa stock ay dumadaan sa `StockMovement` | Walang direktang `update` sa `stockQty` na walang kasamang movement |
| Ang presyo ay si **Admin** lang | Lahat ng pagbabago ng presyo ay may `ProductPriceHistory` at `AuditLog` |
| Soft delete | Ginagamit ang `isActive = false` sa halip na `delete` |
| Lahat ng API ay nagsisimula sa `/api` | Ipinapasa ito ng Vite proxy sa `localhost:3000` |
| Bago mag-commit | Dapat pumasa ang `npm run build` sa backend at frontend |
| **Bawal ang emoji sa UI** | Lahat ng icon ay **SVG** na nakalagay sa `frontend/src/assets/icons/`. Walang emoji sa pages, buttons, labels o messages |
| Images at logo sa `assets/` | Ang mga larawan ay nasa `assets/images/`, at ang logo ay nasa `assets/images/logo/`. Bawal ang direktang link sa larawang nasa labas ng project |
| **Bawat page at component ay may sariling folder** | Ang folder ay kapangalan ng component (PascalCase), at nasa loob nito ang `.tsx` at ang kapares nitong `.module.css`, hal. `pages/clerk/StockInPage/StockInPage.tsx` + `StockInPage.module.css`. Walang `.tsx` na nakakalat nang walang sariling folder |
| **Bawat `.tsx` ay may sariling `.module.css`** | Kapangalan ng `.tsx` ang CSS file (`StatCard.tsx` → `StatCard.module.css`, maliit na titik ang `.module.css`). **Bawal ang shared CSS** sa pagitan ng mga page o component (hal. iisang `dashboard.module.css` para sa tatlong dashboard). Ang global lang ay ang color tokens sa `index.css` |
| **Modal ay per page** | Nasa `components/modal/<role>/<PageName>/` ang mga modal, para malinaw kung saang page lang ito ginagamit at walang hindi kailangang pagkakakabit sa ibang page. Bawat modal ay may sariling folder din (`.tsx` + `.module.css`). Ang base na modal na gamit ng lahat ay nasa `components/modal/Modal/` |
| **2-click rule sa lahat ng action na may tooltip** | 1st click: lalabas ang tooltip na may label (hal. "Edit"). 2nd click: itutuloy ang aksyon (hal. bubukas ang modal). Gamitin ang `components/ui/ActionButton/`, huwag gumawa ng sariling tooltip button. Naka-portal ang tooltip kaya hindi ito napuputol ng table o modal |
| **Tatlo lang ang makakapag-login** | Owner (ADMIN), Inventory Clerk (CLERK) at Cashier (CASHIER). Ang Barista at Kitchen ay employees na walang account (`username`, `passwordHash` at `role` ay null) |
| Hiwalay na dashboard bawat role | May sariling dashboard, layout at routes ang Admin (owner), Clerk at Cashier. Hindi sila naghahati sa iisang dashboard page |

**Default accounts (seed):** `admin`, `clerk`, `cashier1`, `cashier2`. Password: `kohii123`

---

## 1. Folder structure

### Backend (`backend/`)
```
prisma/
  schema.prisma        ← database design
  migrations/          ← kasama sa git; gamit ng buong team
  seed.ts              ← sample data (stores, users, menu, stock)
src/
  main.ts              ← /api prefix, CORS
  app.module.ts        ← nakarehistro lahat ng module
  health.controller.ts ← GET /api/health
  prisma/              ← PrismaService (global)
  common/
    utils/password.ts  ← 🔓/🔒 password switch
    enums/  filters/  interceptors/
  auth/                ← login, JWT, guards, @Roles()
  users/               ← user management (admin)
  categories/  products/   ← menu + price history
  ingredients/ recipes/    ← inventory items + recipe per product
  inventory/           ← stock-in, audit, waste, movements, low-stock
  orders/              ← POS, shift, void
  reports/  dashboard/ ← sales/inventory reports, product performance
```
Bawat module ay may: `*.module.ts` · `*.controller.ts` · `*.service.ts` · `dto/`

### Frontend (`frontend/src/`)
```
api/          ← client.ts (fetch wrapper) + *.api.ts bawat module
context/      ← auth.context.ts, AuthProvider.tsx, StoreContext
hooks/        ← useAuth
routes/       ← AppRoutes, ProtectedRoute, RoleRoute, Admin/Clerk/CashierRoutes
types/  utils/
components/
  layout/     ← AdminLayout/, ClerkLayout/, CashierLayout/, Sidebar/, Navbar/
  ui/         ← Icon/, Button/, DataTable/, StatusBadge/, StatCard/, UserAvatar/, ...
  modal/
    Modal/    ← base na modal (dialog, animation, backdrop) na gamit ng lahat ng modal
    admin/    ← <PageName>/<ModalName>/  (hal. ProductsPage/ManageCategoriesModal/)
    clerk/
    cashier/
pages/
  auth/       ← LoginPage/
  admin/      ← AdminDashboardPage/, StoresPage/, EmployeesPage/, ProductsPage/,
                IngredientsPage/, RecipesPage/,
                InventoryOverviewPage/, SalesReportsPage/,
                InventoryReportsPage/, ProductPerformancePage/
  clerk/      ← ClerkDashboardPage/, StoreInventoryPage/, StockInPage/,
                StockAdjustmentPage/, LowStockPage/, StockMovementsPage/
  cashier/    ← CashierDashboardPage/, PosPage/, OrdersPage/, DailySalesPage/
  shared/     ← NotFoundPage/, UnauthorizedPage/, ProfilePage/
assets/
  icons/      ← SVG icons, naka-folder ayon sa gamit (login/, sidebar/, cards/, navbar/)
  images/     ← mga larawan (login/, logo/)
```

**Halimbawa ng isang page folder:**
```
pages/clerk/StockInPage/
  StockInPage.tsx
  StockInPage.module.css
```
Ang `api/`, `context/`, `hooks/`, `routes/`, `types/` at `utils/` ay walang CSS, kaya hindi na kailangang naka-folder bawat file.

---

## 2. Phases

Bawat phase: **backend endpoint → frontend page → test sa browser → commit.**

### ✅ Phase 0 — Setup (TAPOS)
- [x] Project scaffold, `.gitignore`
- [x] PostgreSQL 17 + database `KCBR`
- [x] `schema.prisma` + unang migration
- [x] Seed data
- [x] Backend ↔ Frontend connection (CORS + proxy)
- [x] Module skeletons + `/api/health`

### Phase 1 — Auth & Layouts
**Backend:** `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password`, JWT guard, `@Roles()` + RolesGuard
**Frontend:** LoginPage, AuthContext, ProtectedRoute/RoleRoute, 3 layouts + sidebar ayon sa role, redirect pagka-login (admin → `/admin`, clerk → `/clerk`, cashier → `/cashier`)
**Login page design:** pulido at pang-presentation na itsura, batay sa reference design na pipiliin ng team. Ang mga images ay nasa `assets/images/` at ang mga icon (user, password, show/hide, atbp.) ay SVG sa `assets/icons/`. Walang emoji
**Kailangang i-install:** `@nestjs/jwt`, `react-router-dom`
**Tapos na kapag:** nakakapag-login ang bawat role at hindi nila mabuksan ang page ng ibang role
- [x] Login, `me`, JWT guard, RolesGuard, LoginPage, routes at 3 layouts
- [ ] `POST /api/auth/change-password` at sapilitang pagpapalit sa unang login (`mustChangePassword`)

### Phase 2 — Admin: Master data
- [x] **Employees** (dating Users): listahan, gumawa, i-edit, i-deactivate o i-activate (isa o marami), i-reset ang password (`/api/employees`). Hindi puwedeng i-deactivate o palitan ang trabaho ng sariling account
- [x] Stores: dalawang store, **Alley** (sa baba, may kitchen) at **Podium** (sa likod). Centralized: iisang menu at inventory. Dalawang table ng staff; dito nagde-deploy at naglilipat ng staff ang owner (`POST /api/stores/:id/deploy`)
- [x] Trabaho ng employee: Owner, Inventory Clerk, Cashier, Barista, Kitchen. **Tatlo lang ang may login: owner (ADMIN), clerk at cashier.** Ang barista at kitchen ay nakalista lang (walang username/password). **Kitchen sa Alley lang**
- [x] Shift ng store staff: **AM o PM** (kumpirmahin sa store)
- [x] Categories: add, edit, activate/deactivate (`/api/categories`). Walang sariling page; nasa **Manage Categories** na modal sa Products page. May menu group ang bawat category (Drinks / Rice Meals / Snacks); **Drinks lang ang may upsize**
- [x] Products + **price change na may history** (`/api/products`, `PATCH /api/products/:id/price`). Isang tab at table bawat category; Regular at Upsize na presyo
- [x] Inventory items, backend lang (`/api/inventory/items`, filter: Raw Material / Packaging / Snack / Meal, may pack size). Wala pang UI
- [ ] Recipes (product → items + qty)
- [x] AuditLog sa bawat create, edit, price change o deactivate ng category at product

### Phase 3 — Cashier: POS
- Open shift (opening cash)
- POS screen: menu ayon sa category → cart → bayad (Cash / GCash ref) → discount (Senior/PWD) → resibo
- **Pag-save ng order = awtomatikong pagbawas ng stock ayon sa recipe** (iisang DB transaction kasama ang `StockMovement`)
- Sales history para sa araw na iyon
- Close shift (bilang ng cash → expected vs actual)
- Void request

### Phase 4 — Clerk: Inventory
> **Pansamantala habang hinihintay ang sagot ng store** ([`STORE_QUESTIONS.md`](STORE_QUESTIONS.md)): binabawasan ang stock kapag **kumuha ang barista ng isang buong pack/pouch** sa inventory (`WITHDRAW`), hindi bawat benta. Puwede pa itong palitan kapag nasagot na ang mga tanong.
- [x] Backend: stock in / increment (`POST /api/inventory/items/:id/stock-in`, `{ packs }` o `{ qty }`)
- [x] Backend: withdraw / decrement (`POST /api/inventory/items/:id/withdraw`), hindi puwedeng mag-negative kahit sabay ang kuha
- [x] Backend: movement history (`GET /api/inventory/movements`) at low stock (`GET /api/inventory/low-stock`)
- [ ] UI ng Stock In, Withdraw, Low Stock at Movements
- Stock-in (bilang lang)
- Stock audit: draft → bilang → variance → finalize (awtomatikong `AUDIT_ADJUST`)
- Waste / spoilage log
- Low-stock list + stock movement history

### Phase 5 — Admin: Monitoring
- Sales history ng 2 store (filter: araw, store, cashier)
- Pag-approve ng void (ibinabalik ang stock gamit ang `VOID_RETURN`)
- Pag-review at pag-finalize ng audit
- Audit log viewer

### Phase 6 — Reports & Dashboard
- Sales report: daily / weekly / monthly, bawat store
- Inventory report: movements, variance, waste
- Product performance: best sellers, slow movers
- Dashboard cards + charts
- Print o export (PDF/CSV, optional)

### Phase 7 — 🔒 Final Defense Hardening
- [ ] **I-on ang password hashing:** `PASSWORD_HASHING=true` sa `backend/.env`
- [ ] Patakbuhin ang `npx prisma db seed` (gagawing bcrypt ang mga default account) **o** i-reset ang password ng lahat ng user mula sa admin
- [ ] Siguraduhing walang plain-text na password na natira sa `User` table (makikita sa pgAdmin; dapat nagsisimula sa `$2`)
- [ ] Palitan ang `JWT_SECRET` ng mahabang random string
- [ ] Ipatupad ang `mustChangePassword` sa unang login
- [ ] Input validation sa lahat ng DTO
- [ ] Alisin ang sample data, ilagay ang totoong menu at stock ng Kohii
- [ ] Buong test ng bawat role (UAT)

---

## 3. Mga command

| Gawain | Command (sa `backend/`) |
|---|---|
| Patakbuhin ang backend | `npm run start:dev` |
| Patakbuhin ang frontend | `npm run dev` (sa `frontend/`) |
| Pagkatapos baguhin ang `schema.prisma` | `npx prisma migrate dev --name <ano-ang-binago>` |
| I-generate ulit ang Prisma client | `npx prisma generate` |
| Lagyan ng sample data | `npx prisma db seed` |
| Tingnan ang data sa browser | `npx prisma studio` |
| Burahin lahat at simulan ulit ⚠️ | `npx prisma migrate reset` |

### Para sa bagong kasama sa team (pagkatapos mag-clone o mag-pull)
1. Sa `backend/` at `frontend/`: `npm install`
2. Kopyahin ang `backend/.env.example` → `backend/.env`, at ilagay ang sariling DB password
3. Sa `backend/`: `npx prisma migrate dev` → `npx prisma generate` → `npx prisma db seed`
