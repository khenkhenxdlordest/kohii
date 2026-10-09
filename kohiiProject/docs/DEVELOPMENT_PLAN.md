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
| **Modal ay per page** | Nasa `components/modal/<role>/<PageName>/` ang mga modal, para malinaw kung saang page lang ito ginagamit at walang hindi kailangang pagkakakabit sa ibang page. Bawat modal ay may sariling folder din (`.tsx` + `.module.css`) |
| Hiwalay na dashboard bawat role | May sariling dashboard, layout at routes ang Admin (owner), Clerk at Cashier. Hindi sila naghahati sa iisang dashboard page |

**Default accounts (seed):** `admin`, `clerk`, `cashier.b1`, `cashier.b2`. Password: `kohii123`

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
  ui/         ← Icon/, StatCard/, PagePlaceholder/, StoreSwitcher/, ...
  modal/
    admin/    ← <PageName>/<ModalName>/  (hal. ProductsPage/AddProductModal/)
    clerk/
    cashier/
pages/
  auth/       ← LoginPage/
  admin/      ← AdminDashboardPage/, StoresPage/, UsersPage/, ProductsPage/,
                CategoriesPage/, IngredientsPage/, RecipesPage/,
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

### Phase 2 — Admin: Master data
- Users: listahan, gumawa, i-edit, i-deactivate o i-activate, i-reset ang password
- Stores, Categories
- Products + **price change na may history**
- Inventory items (filter: Raw Material / Packaging / Snack)
- Recipes (product → items + qty)
- AuditLog sa bawat price change o deactivate

### Phase 3 — Cashier: POS
- Open shift (opening cash)
- POS screen: menu ayon sa category → cart → bayad (Cash / GCash ref) → discount (Senior/PWD) → resibo
- **Pag-save ng order = awtomatikong pagbawas ng stock ayon sa recipe** (iisang DB transaction kasama ang `StockMovement`)
- Sales history para sa araw na iyon
- Close shift (bilang ng cash → expected vs actual)
- Void request

### Phase 4 — Clerk: Inventory
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
