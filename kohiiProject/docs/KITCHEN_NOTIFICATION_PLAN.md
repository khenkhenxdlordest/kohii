# Kitchen Notification + Item Remarks — Proposal

> Kasama ng: [`DEVELOPMENT_PLAN.md`](DEVELOPMENT_PLAN.md) · [`STORE_QUESTIONS.md`](STORE_QUESTIONS.md)
> Status: **Nagawa na** (2026-10-20), kasama na ang global kitchen queue + store-filtered na "Ready/Delivered" toast — tingnan ang Phase 6.9 sa `DEVELOPMENT_PLAN.md`. Natitira pa lang ang mga tanong sa §1.

---

## 1. Problema (manual na proseso ngayon)

> [!NOTE]
> **Kumpirmahin sa interview** — hindi pa ito nakasulat sa `STORE_QUESTIONS.md`, base lang ito sa sinabi sa planning session (2026-10-20).

Dalawang store: **Alley** (may kitchen) at **Podium** (walang kitchen — "sa likod"). Base sa alam na proseso:
- Kapag may order na may meal (hal. rice meals), kailangang maipaalam sa Alley kitchen — ginagawa ito ngayon sa pamamagitan ng **oki-toki (walkie-talkie)** o **staff na pabalik-balik mula Podium papuntang Alley**.
- Ito ang gustong i-digitize: automatic na notification papunta sa kitchen side kapag may na-order na meal, kasama ang mga **remarks per item** (hal. walang catsup/mayo sa hotdog & egg, less/more sugar o bilang ng shots sa drinks).

**Dapat tanungin pa sa interview (idagdag sa `STORE_QUESTIONS.md` kapag susunod na interview):**
- Totoo bang magkahiwalay na lugar/branch ang Alley at Podium (kaya kailangan ng oki-toki), o magkalapit lang sila sa iisang establishment?
- Kung sa Podium may na-order na meal, pupunta rin ba ito sa Alley kitchen, o merong sariling simpleng prep sa Podium (hal. ready-made snacks lang doon)?
- Sino ang titingin sa kitchen display — may bagong device/tablet ba sa Alley, o gagamitin na lang ang existing na terminal?

---

## 2. Kasalukuyang estado ng system (na-verify sa code, 2026-10-20)

| Bagay | Status | Detalye |
|---|---|---|
| `OrderItem.remarks` / notes field | **Wala** | `schema.prisma` → `model OrderItem`: productName, size, qty, unitPrice, lineTotal lang. Walang free-text field |
| Kitchen page/route/component | **Wala** | Walang anumang "kitchen display" kahit saan sa frontend o backend — lahat ng "KITCHEN" hits ay `StaffPosition.KITCHEN` lang (HR/staffing: EmployeesPage, DeployStaffModal) |
| Per-item na prep/delivery status | **Wala** | `OrderStatus` (COMPLETED / VOID_REQUESTED / VOIDED) ay order-level lang. Walang status column sa `OrderItem` |
| `CategoryGroup` (RICE_MEALS/DRINKS/SNACKS) ginagamit para mag-route sa kitchen | **Wala** | Ginagamit lang ngayon para sa upsize-pricing logic, hindi para sa kitchen routing |
| Realtime infra (Socket.IO) | **Meron na, naka-wire** | `backend/src/realtime/` (gateway + service) at `frontend/src/context/RealtimeProvider.tsx` — JWT-authenticated, may room per store (`storeRoom(storeId)`) at `ADMIN_ROOM`. Events ngayon: `stock:updated`, `stock:low`, `order:created`, `shift:changed`. Order-level lang, walang per-item event |
| Login ng Kitchen staff | **Walang login talaga** (sadyang disenyo) | `User.username`/`passwordHash`/`role` ay null para sa BARISTA/KITCHEN (see `DEVELOPMENT_PLAN.md` §0, "Tatlo lang ang makakapag-login"). Hindi sila makakapag-auth sa REST o sa realtime gateway (kailangan ng valid JWT) |

**Implication ng huling row:** hindi puwedeng "mag-login ang kitchen" para makita ang notification — kailangan ng ibang approach (tingnan §3).

---

## 3. Panukalang approach

### 3a. Shared station display (hindi bagong login type)
Sa halip na bigyan ng sariling account ang Kitchen (lalabag sa "Tatlo lang ang makakapag-login" na patakaran), gawing isang **shared device/tablet sa Alley** na naka-login gamit ang existing na account (hal. isang cashier o isang dedicated "kitchen station" na cashier/clerk login), tapos bubukas lang doon ang kitchen queue view. Walang bagong role, walang bagong auth path.

### 3b. Schema changes
- `OrderItem.remarks String?` — free text, optional
- `OrderItem.prepStatus` — bagong enum, hal. `PENDING | READY | DELIVERED` (default `PENDING`, applicable lang sa items na kailangan ng prep)
- Alternative na mas simple: `OrderItem.deliveredAt DateTime?` kung pending/delivered lang talaga ang kailangan (walang separate "READY" step)

> [!IMPORTANT]
> Dapat pag-usapan muna kung per-**item** o per-**order** ang status na kailangan. Kung iisa lang ang meal sa isang order karamihan, puwedeng order-level na lang at mas simple. Kung madalas magkahalo ang meal + drinks sa isang order, kailangan talaga per-item.

### 3c. Remarks UI (POS side)
Sa halip na free-text lang, puwedeng **mga paunang-gawang chip/checkbox** bukod sa free text, para mabilis i-tap ng cashier:
- Hotdog/Egg-type items: "Walang Catsup", "Walang Mayo", "Extra Catsup", "Extra Mayo"
- Drinks: "Less Sugar", "More Sugar", "2 Shots", "3 Shots", "Walang Yelo"
- Plus isang free-text field para sa iba pang kaso

Idea lang ito, hindi pa drafted kung saan ito ilalagay sa cart UI (`CartPanel`).

### 3d. Realtime events (bagong batch, dagdag sa Phase 6.5)
| Event | Kailan | Sino nakikinig |
|---|---|---|
| `order:kitchen:new` | May na-save na order na may item na kailangan ng prep (hal. may category group na RICE_MEALS, o may flag na `needsPrep` sa Product/Category) | Alley kitchen station room |
| `order:item:statusChanged` | Pag-mark ng kitchen ng isang item bilang Ready/Delivered | Cashier (parehong store) — para alam ng Podium cashier na tapos na |

### 3e. Frontend
- Bagong page, hal. `pages/cashier/KitchenDisplayPage/` (o bagong folder sa ilalim ng Alley-only na route) — **queue view, hindi lang popup card.** Listahan ng mga order na may pending items, naka-expand ang remarks bawat item, may button na "Mark as Ready/Delivered"
- Rason kung bakit queue kaysa sa popup lang: kailangang ma-track ng kitchen ang **maraming** order nang sabay, hindi lang ma-miss ang isa dahil nawala na yung popup

---

## 4. Saan ito pumapasok sa Chapter 1 scope

Hindi explicit na nasa Chapter 1 objectives ito (POS, inventory, reports), pero sakop ito ng **"digital order/sales recording"** bilang pagpapahusay sa operational flow ng pag-order (kapalit ng manual na oki-toki/pabalik-balik). Internal lang ang gagamit (staff), kaya hindi ito lumalabag sa out-of-scope list (customer ordering, delivery, mobile app, atbp.).

**Rekomendasyon:** idagdag bilang bagong sub-phase (hal. **Phase 6.9 — Kitchen Notification**) sa `DEVELOPMENT_PLAN.md` kapag na-finalize na ang disenyo, pagkatapos ma-confirm ang mga tanong sa §1.

---

## 5. Susunod na hakbang

- [ ] Sagutin ang mga tanong sa §1 (idagdag din sa `STORE_QUESTIONS.md` bahagi C kung gagawin sa susunod na interview)
- [x] Desisyunan: per-item ang status, pero **RICE_MEALS lang** ang binabantayan — hindi na isinama ang drinks (ginagawa na mismo sa likod ng counter, walang handoff problem)
- [x] Desisyunan: preset chips + free text (§3c)
- [x] I-draft at i-apply ang schema migration (`PrepStatus` enum, `OrderItem.remarks`/`prepStatus`)
- [x] I-draft at i-build ang UI (Kitchen Queue page + remarks modal sa CartPanel)
- [x] Ilagay sa `DEVELOPMENT_PLAN.md` bilang **Phase 6.9**

> [!NOTE]
> **Na-fix na (2026-10-20):** unang bersyon ay naka-scope ang `order:kitchen:new`/kitchen-queue sa store na pinagmulan ng order — nagresulta ito sa meal order na ginawa sa Podium na hindi nakikita ng Alley. Na-test gamit ang cashier2 (Podium): lumabas ang order sa sariling "kitchen queue" ng Podium (walang tao doon na titingin), hindi sa Alley. Ginawang **global** ang kitchen queue at ang dalawang event (parehong pattern ng `stock:updated`/`stock:low`, dahil iisa rin ang kitchen para sa dalawang store, gaya ng iisang pooled inventory) — kahit saang store ginawa ang order, lahat ng CASHIER-login na nakabukas sa `/cashier/kitchen` ay makikita ito, may badge na nagpapakita kung saang store galing (ALY/PDM).
