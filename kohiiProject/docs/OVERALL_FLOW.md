# Kohii Cafe — Overall System Flow (Cashier, Clerk, Admin)

> Kasama ng: [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md) · [`KITCHEN_NOTIFICATION_PLAN.md`](KITCHEN_NOTIFICATION_PLAN.md)
> Para kanino: mga groupmate na gustong maintindihan kung paano gumagana ang buong system — bawat page, bawat button, bawat modal, per role. Totoong behavior ito base sa current code (2026-10-20), hindi plano o wishlist — may hiwalay na seksyon sa dulo para sa mga hindi pa tapos.

---

## 0. Bago pumasok: Login at Profile

**Login** (`/login`): username + password, may "Remember my username" checkbox, may show/hide password toggle. Pagka-login, automatic na-redirect papunta sa dashboard ng role mo: Admin/Owner → `/admin`, Clerk → `/clerk`, Cashier → `/cashier`.

**Tatlo lang ang makakapag-login:** Owner (role `ADMIN`), Inventory Clerk (`CLERK`), at Cashier (`CASHIER`). Ang Barista at Kitchen staff ay naka-rekord lang sa system (para sa pag-deploy sa store at shift), **walang account** — hindi sila puwedeng mag-login.

**Profile** (`/{role}/profile`, parehong page sa lahat ng role, nasa profile widget sa sidebar — hindi nasa listahan ng menu): 
- **Larawan**: pindutin ang avatar para lumabas ang menu — "View profile photo" (buksan ang larawan nang malaki) o "Change photo" (mag-upload ng bago, JPEG/PNG/WebP).
- **Personal details form**: First name, Middle name, Last name, Contact number, Email → **Save changes** button.
- **Account** (read-only lang): Username, Role.
- **Change password form** (hiwalay na form): Current password, New password, Confirm new password → **Update password** button.

---

## 1. CASHIER

**Sidebar:** Overview (Dashboard) · Sales (Point of Sale, Orders, Daily Sales, Kitchen Queue). Palaging may **Shift bar** sa taas ng content (open/close shift), at may **toast notification** na puwedeng lumabas kahit saang page (tingnan §1.7).

### 1.1 Dashboard (`/cashier`)
Sariling araw ng cashier lang ang ipinapakita dito (sariling orders ngayong araw).
- 3 stat card: **My Sales Today**, **My Orders Today**, **Items Sold**.
- Panel **"Sales by shift"**: AM/PM breakdown ng sariling benta.
- **Quick Actions**: 3 clickable card papunta sa Point of Sale, Orders, Daily Sales.
- Panel **"Recent orders"**: hanggang 8 pinakabagong order ngayong araw (oras, bilang ng items, paraan ng bayad, total); may "View all" link papunta sa Orders page.
- Walang mga button na nagbabago ng data dito — display/navigation lang.

### 1.2 Pag-open at pag-close ng Shift
Kailangan munang buksan ang shift bago makapag-POS — kung walang bukas na shift, lalabas ang **Open Shift** button sa halip na ang POS mismo.

- **Open Shift** → modal: isang field lang, **Opening cash** (₱) → **Open Shift** button.
- Habang bukas: ipinapakita ng Shift bar ang "Shift open since {oras} · ₱X.XX opening" + **Close Shift** button.
- **Close Shift** → modal: ipinapakita ang Opening cash at Expected cash (read-only), field na **Closing cash** (binibilang na pera), live na "Balanced / Short / Over" indicator, optional na Note → **Close Shift** button.
  - ⚠️ **Alam na quirk:** ang "Expected cash" na makikita sa form habang nagbibilang ka ay **opening cash pa lang** (hindi pa kasama ang benta ngayong shift) — may lumang comment sa code na "Walang Order creation pa" na hindi na-update noong nagawa na ang checkout. Ang TOTOONG expected cash (opening + lahat ng benta) ay kino-compute at naka-save nang tama sa backend pagka-submit — display lang sa form ang mali, hindi ang record.

### 1.3 Point of Sale (`/cashier/pos`)
- **Category tabs** sa itaas (All + bawat active category).
- **Product grid**: click ng card —
  - kung iisa lang ang presyo (hal. meals) → direktang madadagdag sa cart.
  - kung maraming size (drinks: Hot/Iced/Upsize) → lalabas ang size picker sa ibabaw ng card, pumili ng size.
- **Cart panel** (kanan):
  - Bawat linya: icon, pangalan, size, **stepper** (−/+) para sa qty, **pencil icon** para sa Remarks (buksan ang modal), presyo, **X** para tanggalin.
  - **Remarks modal**: preset chips depende sa kategorya (meals: *Walang Catsup, Walang Mayo, Extra Catsup, Extra Mayo*; drinks: *Less Sugar, More Sugar, 2 Shots, 3 Shots, Walang Yelo*) + free-text na "Other notes" → **Save**.
  - **Clear** (tatanggalin lahat ng laman ng cart).
  - Subtotal row.
  - **Discount row** → **Discount modal** (None / Senior Citizen 20% / PWD 20% / Custom %, may live preview ng halaga) → **Apply**.
  - Total row.
  - **Payment method** buttons: Cash / GCash / Maya / Bank Transfer (pumili ng isa).
  - **Reset Selection** / **Continue**.
- Pagka-Continue → **Payment panel**:
  - Cash: Amount tendered field + quick buttons (₱50/100/500/1000/Exact) + live Change/Short → **Complete sale**.
  - Hindi cash: Reference number field → **Complete sale**.
  - "Back to order" link para bumalik sa cart.
- Pagkatapos: **Sale complete** screen (resibo #, total) + **New order** button.

### 1.4 Orders (`/cashier/orders`)
Listahan lang ng sariling orders ng cashier sa huling 30 araw — search box, 5 column (Date & Time, Items, Payment, Discount, Total), **walang row action** (walang void button dito — tingnan §1.8).

### 1.5 Daily Sales (`/cashier/daily-sales`)
Buong benta ng **store** (hindi lang sariling benta), huling 90 araw, may date range filter (default: ngayong araw), search box, at **Export** button (Excel o PDF — parehong modal na ginagamit din ng Admin sa Sales Reports).

### 1.6 Kitchen Queue (`/cashier/kitchen`)
Listahan ng mga **meal order** (RICE_MEALS lang — drinks hindi kasama dahil ginagawa agad sa likod ng counter) na hindi pa Delivered. **Global ito** — makikita ng kahit sinong cashier (Alley man o Podium) ang parehong listahan, dahil iisang kitchen (Alley) ang naghahanda para sa dalawang branch.
- Bawat card: resibo # + **badge kung saang store galing** (ALY/PDM) + oras.
- Bawat item: qty × pangalan (size), remarks (italic kung meron), status tag (**PENDING → READY → DELIVERED**).
- **Mark Ready** button (kung PENDING pa) → **Mark Delivered** button (kung READY na). Mawawala ang order sa listahan kapag naging Delivered na lahat ng meal item nito.
- Live ang pag-update — walang kailangang i-refresh.

### 1.7 Kitchen notification (kahit saang page ng Cashier)
May lumalabas na **toast** sa itaas-kanan ng screen (hindi lang sa Kitchen Queue page — kahit nasa POS o Dashboard ka) kapag naging **Ready** o **Delivered** ang isang meal item **ng sariling store mo**: "Ready to serve: {item} ({resibo})" / "Delivered: {item} ({resibo})". Nawawala mag-isa pagkalipas ng ~7 segundo, o puwedeng isara agad gamit ang X.

### 1.8 Hindi pa ginagawa (Cashier)
- **Void request**: may `voidReason`, `voidRequestedAt`, `VOID_REQUESTED`/`VOIDED` status sa database schema, pero **walang backend endpoint at walang button kahit saan** sa buong app. Plano pa lang ito (sino man ang gagawa, i-check muna kung meron nang ginagawang progress bago magsimula).

---

## 2. CLERK (Inventory)

**Sidebar:** Overview (Dashboard) · Inventory (Store Inventory, Stock In, Stock Adjustment, Low Stock, Stock Movements).

### 2.1 Dashboard (`/clerk`)
4 stat card: Low Stock, Out of Stock, Stock In Today, Ingredients Tracked. Dalawang panel: **"Low stock items"** (top 5 + "View all →" papunta sa Low Stock page) at **"Recent stock movements"** (top 5 + "View all →" papunta sa Stock Movements page).

### 2.2 Store Inventory (`/clerk/inventory`)
- Type tabs: Coffee Bar / Kitchen / Packaging / Snacks (may bilang ng item at "attention" badge kung may low/out doon).
- Search + filter (All / Low and out).
- 4 stat card: Items, Low stock, Out of stock, Stock in today.
- Table: Item (+ lalagyan nito, hal. "Bottle 1 L"), On hand, Low at, Status.
- Row actions: **Stock In**, **Withdraw**, **Log Waste**, **History** (parehong modal na ginagamit din sa Stock In, Low Stock at Stock Adjustment pages — tingnan sa ibaba).
- **Wala rito** ang Add item / Edit item / Deactivate — Admin-only iyon (`/admin/inventory`).

**Stock action modal** (gamit ng Stock In/Withdraw/Waste):
- Stock in lang: Source (Supplier delivery / Emergency purchase) segmented control.
- Quantity: pumili kung ilang lalagyan (hal. "2 × Bottle") o "Exact amount" — may live na preview ("+2 L → 4 L", o "not enough stock" kung sosobra sa babawasin).
- Stock in lang: Supplier/"Bought from" (optional) + Amount paid (required kung Emergency).
- Waste lang: Reason radios (Spoiled / Expired / Spilled / Damaged / Other).
- Note (optional) → submit button (pangalan depende sa action: "Stock in" / "Withdraw" / "Log waste").

**History modal**: timeline ng lahat ng galaw ng isang item — uri, +/− dami, petsa, sino, saang store, supplier/halaga kung meron, note, balance pagkatapos.

### 2.3 Stock In (`/clerk/stock-in`)
Mas simpleng bersyon, para sa pagtanggap ng delivery: search + table (Item, On hand) na may **Stock In** action lang, plus "Recently stocked in" list (huling 10).

### 2.4 Low Stock (`/clerk/low-stock`)
Stat card (Low stock / Out of stock), table na nakaayos pinaka-kritikal muna (Out bago Low), **Stock In** action lang. Pag walang laman: "All stocked up."

### 2.5 Stock Movements (`/clerk/movements`)
Buong ledger — type tabs (All / Stock In / Withdraw / Waste / Sale / Count adjustment / Void return), search, columns: Date, Item, Type, Qty (+/−), Balance after, Store, By, Note. **Read-only**, walang row action.

### 2.6 Stock Adjustment (`/clerk/stock-adjustment`)
Dalawang tab:
- **Waste & Spoilage** (totoo, naka-connect sa backend): table + **Log Waste** action (parehong modal sa §2.2), "Recent waste" list sa ibaba.
- **Stock Count** (⚠️ **mock/local lang — walang backend pa**, may palaging-nakalagay na "Draft mode — hindi pa naka-connect sa backend" na label): **Start count** → lalabas lahat ng item na may editable na "Counted qty" field bawat isa, may live na **Variance** column (kulay berde/pula depende kung sobra o kulang) → **Finalize count** (tatanggalin ang draft + lalabas ang mensaheng "naka-save lang lokal, walang backend pa"). Walang talagang na-save kahit saan.

---

## 3. ADMIN (Owner)

**Sidebar:** Overview (Dashboard) · Menu (Products, Recipes) · Monitoring (Inventory Overview, Sales Reports, Inventory Reports, Product Performance, Audit Log) · Management (Stores, Employees).

### 3.1 Dashboard (`/admin`) — "Owner Dashboard"
- 4 stat card: **Sales Today** at **Orders Today** (dalawang store, may % change kumpara kahapon), **Low Stock**, **Out of Stock**.
- Panel **"Sales by store"** — bawat row ay link papunta sa Stores page.
- Panel **"Top products"** (top 5 ngayong araw) — bawat row ay link papunta sa Product Performance.
- **Quick Actions**: 6 tile papunta sa Products, Inventory, Stores, Employees, Sales Reports, Product Performance.
- Panel **"Recent activity"**: huling 20 audit log entry, may "View all" papunta sa Audit Log.

### 3.2 Products (`/admin/products`)
Isang table bawat category, puwedeng i-reorder (drag handle o up/down arrow — **sa device lang naka-save ito, hindi sa server**).
- **Manage Categories** button → modal: listahan ng categories, **Add Category**, bawat isa may Edit/Deactivate-Activate. Pag-add/edit: pangalan + menu group (Drinks/Rice Meals/Snacks).
- **Add product** button (at "Add" sa bawat category section) → **Product form modal**: pangalan, larawan (may automatic na AI background removal kapag nag-upload), category, presyo bawat size (**bagong product lang** — sa pag-edit, "Change price" na lang ang gamitin), Type (Made to order / Ready made).
- Search, Status filter (Active/Inactive/All), "Show first" na mga pill para iakyat ang isang category sa taas.
- Per-product row actions: **Edit**, **Change price**, **Deactivate/Activate**.
- **Change price modal**: size tabs (para sa drinks), bagong presyo, dahilan (optional), **Remove {size}** button (kung ligtas tanggalin), at live na **Price history** timeline sa ibaba.

### 3.3 Recipes (`/admin/recipes`)
⚠️ **Hindi pa ginawa — "Coming soon" placeholder pa lang.** Dito dapat ikokonekta ang product sa mga ingredient (InventoryItem) + dami bawat unit, para awtomatikong bumawas ang stock pag may benta — wala pa itong UI.

### 3.4 Inventory Overview (`/admin/inventory`)
Parehong page/istilo ng Clerk's Store Inventory, pero may dagdag na **Admin-only**: **Add item** button, **Edit** action, **Deactivate/Activate** action (buong CRUD ng item + lalagyan nito). "Emergency purchases" ang ika-4 na stat card (sa halip na "Stock in today").

### 3.5 Sales Reports (`/admin/reports/sales`)
Chart ng benta bawat araw, store filter (All + bawat store), date range filter, search, table (Date, Store, Cashier, Items, Payment, Discount, Total), at **Export** (Excel `.xlsx` o PDF via print dialog — parehong export na makikita rin sa Cashier's Daily Sales).

### 3.6 Inventory Reports (`/admin/reports/inventory`)
Mga card ng **waste bawat dahilan** (Spoiled/Expired/Spilled/Damaged/Other) may estimated cost bawat isa, saka buong ledger ng movements (type filter, search). **Read-only.**

### 3.7 Product Performance (`/admin/reports/products`)
Isang listahan lang, nakaayos mula sa pinakamabenta papuntang pinakamabagal (hindi dalawang hiwalay na tab), may category filter, search, bilang ng naibenta + kita + % trend kumpara noong nakaraang buwan. Row action: **Price history** (read-only timeline modal).

### 3.8 Audit Log (`/admin/audit-log`)
System-wide na log ng lahat ng pagbabago (price change, deactivate, atbp.) — entity filter, date range, search. **Read-only.**

### 3.9 Stores (`/admin/stores`)
Bawat store (Alley "with kitchen" / Podium "no kitchen"):
- **"Today's sales" card** (clickable) → **Store Sales modal**: total, bilang ng order, average, breakdown bawat shift.
- Staff count chips bawat position.
- **Deploy staff** button → **Deploy Staff modal**: hanapin/piliin ang staff (checkbox), itakda ang shift (No shift/AM/PM) bawat napili → "Deploy N to {store}". Naka-block ang Kitchen staff sa store na walang kitchen.
- Table ng kasalukuyang naka-deploy na staff — row actions: **Change shift** (muling buksan ang Deploy modal para doon lang sa isang staff), **Move to {ibang store}** (direktang gagana, walang modal).

### 3.10 Employees (`/admin/employees`)
- **Add employee** button → **Employee form modal**: personal details, **Job** (Admin/Clerk/Cashier/Barista/Kitchen — may hint bawat isa, naka-disable kapag sariling account mo ang ineedit), Store + Shift (store-staff jobs lang), Login section (username + temporary password na may "New" button para bumuo ng random password) — lalabas lang kung kailangan ng login ang napiling job.
- 4 stat card (Total Employees, Cashiers, Baristas, Kitchen), job filter chips, search, status filter (All/Active/Deactivated).
- Table may **bulk selection** (checkbox bawat row) — lalabas ang floating bar sa ibaba kapag may napili: **Activate (N)** / **Deactivate (N)**.
- Per-row actions: **Edit**, **Reset password** (kung may login), **Deactivate/Activate**.
- **Deactivate** = soft-deactivate lang — nananatili ang history, puwedeng i-activate ulit anumang oras.

---

## 4. Mga bagay na gumagana sa likod (lahat ng role)

- **Realtime (Socket.IO)**: nagre-refresh ang kaukulang page nang awtomatiko, walang manual reload, kapag may:
  - `order:created` — bagong benta (Admin monitoring + sariling store)
  - `shift:changed` — nag-open/close ng shift
  - `stock:updated` / `stock:low` — nagbago ang stock (global, dahil centralized ang inventory)
  - `order:kitchen:new` / `order:item:statusChanged` — bagong meal order papunta sa kitchen, o nagbago ang Ready/Delivered status (global, dahil iisang kitchen)
- **Centralized inventory**: iisang stock lang para sa Alley at Podium — hindi hiwalay bawat branch, pero naitatala pa rin kung saang store ginamit (via `storeId` sa StockMovement).
- **Password**: naka-off pa ang hashing sa development (`PASSWORD_HASHING=false`), plain text muna — babaguhin na lang sa Phase 7 bago ang defense. `mustChangePassword` ay naka-tag lang sa Employees list, hindi na ito pinipilit i-gate.

---

## 5. Buod: ano ang hindi pa totoong gumagana

| Feature | Kung saan | Status |
|---|---|---|
| Void request (cashier humihingi ng void, admin nag-a-approve) | Orders page, atbp. | Wala pa — schema/enum lang, walang backend endpoint, walang button |
| Recipes (product → ingredients + dami) | `/admin/recipes` | "Coming soon" placeholder pa lang |
| Stock Count / Audit (draft → bilang → variance → finalize) | `/clerk/stock-adjustment` (Stock Count tab) | Mock/local state lang, walang backend (`StockAudit` wala pang service/controller) |
| "Expected cash" preview sa Close Shift modal | Cashier shift bar | Mali ang ipinapakita habang nagbibilang (opening cash lang, wala pang sales) — tama naman ang na-save sa totoong record |
