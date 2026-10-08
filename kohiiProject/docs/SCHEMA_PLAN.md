# Kohii Cafe — Schema Plan (DRAFT)

> Status: **para pag-usapan pa**. Wala pang `schema.prisma`. Babaguhin ito habang tumatagal.
> Basehan: Chapter 1 (`frontend/txt/chapter1.txt`) + mga desisyon ng team.

---

## 1. Mga napagkasunduan na

| Desisyon | Detalye |
|---|---|
| Users | **Admin (Owner)**, **Clerk**, **Cashier** |
| Stores | **2 branch** ng Kohii Cafe |
| Inventory | **Iisang stock** para sa dalawang store. Walang stock bawat store at walang transfer. |
| Sales | Naka-tag kung saang store nabenta, para sa reports bawat branch |
| Stock-in | **Bilang lang (manual count)**, walang barcode scanner |
| Presyo | **Si admin lang** ang nagtatakda, may **price history** |

---

## 2. Dalawang uri ng ibinebenta

Dalawa ang klase ng item sa café, at **magkaiba ang paraan ng pagbawas ng stock nila**.

| Uri | Halimbawa | Paano nababawasan ang stock |
|---|---|---|
| **Gawang inumin / pagkain** (`MADE`) | Latte, Matcha, Iced Coffee | Sa pamamagitan ng **recipe**: 1 Latte = 18g beans + 200ml milk + 1 cup + 1 lid |
| **Snack na binibili at ibinebenta ulit** (`READY_MADE`) | Cookies, Chips, Bottled water | **Ang mismong item ang binabawasan**: 1 benta = −1 pc |

### Disenyo: isang listahan ng lahat ng may stock (`InventoryItem`)

Hindi natin gagawing magkahiwalay na table ang raw materials at snacks. Iisang table lang na may `type`:

| `InventoryItem.type` | Halimbawa | Unit |
|---|---|---|
| `RAW_MATERIAL` | Coffee beans, gatas, syrup, sugar | g / ml / pcs |
| `PACKAGING` | Cups, lids, straws, sleeves | pcs |
| `SNACK` | Cookies, chips, bottled water | pcs |

**Bakit iisa lang?** Para ang **stock-in, audit, low-stock alert, waste, at reports ay iisang proseso lang** para sa lahat. Ang snack ay isang `Product` na may "recipe" na **1 pc ng sarili nitong `InventoryItem`**. Dahil dito, pareho ang code ng pagbawas ng stock para sa latte at sa cookie.

```
Product: "Choco Chip Cookie" (READY_MADE)
  └─ RecipeItem: 1 pc → InventoryItem "Choco Chip Cookie" (SNACK)

Product: "Iced Latte 16oz" (MADE)
  ├─ RecipeItem: 18 g   → "Espresso Beans"  (RAW_MATERIAL)
  ├─ RecipeItem: 200 ml → "Fresh Milk"      (RAW_MATERIAL)
  ├─ RecipeItem: 1 pc   → "16oz Cup"        (PACKAGING)
  └─ RecipeItem: 1 pc   → "Flat Lid"        (PACKAGING)
```

Sa Inventory page, puwedeng **i-filter ayon sa type** (Raw Materials / Packaging / Snacks) para hiwalay silang makita.

---

## 3. Gawain bawat role

### Cashier (sariling store lang)
- Gumagawa ng sale (POS)
- Nakikita ang sariling sales history para sa araw na iyon
- **Shift / cash drawer**: opening cash → closing count → nakikita ang expected vs actual
- **Void request**: hindi direktang nakakabura; ang admin ang nag-a-approve
- Tuloy-tuloy na receipt number bawat store (`B1-000123`)

### Clerk
- **Stock-in** sa pamamagitan ng bilang (petsa, supplier na optional, note, mga item at qty)
- **Stock audit / physical count**: bibilangin ang aktuwal → kukuwentahin ng system ang variance → kapag na-finalize, awtomatikong may adjustment
- **Waste / spoilage** logging
- Nakikita ang low-stock list at ang stock movement history

### Admin (Owner)
- **Presyo**: si admin lang ang nagtatakda, at naitatala ang price history
- **User management**: gumawa, i-deactivate o i-activate, i-reset ang password, palitan ang role at store
- **Sales history ng dalawang store**, puwedeng i-filter ayon sa araw, store, o cashier
- Products, categories, inventory items, at recipes
- Pag-approve ng void at pag-review ng resulta ng audit
- Dashboard: best sellers, product performance, sales bawat store
- **Audit log**: nakatala kung sino ang gumawa ng ano at kailan

### Lahat
- Puwedeng palitan ang sariling password; pinipilit itong palitan sa unang login
- Soft delete: dine-deactivate lang ang product o user, hindi binubura, para hindi masira ang mga lumang report

---

## 4. Draft na mga table

| Model | Mahahalagang field |
|---|---|
| `Store` | name, code (`B1`, `B2`), receiptCounter |
| `User` | username, passwordHash, role, storeId?, isActive, mustChangePassword, lastLoginAt |
| `Category` | name, isActive |
| `Product` | name, categoryId, **type** (`MADE` / `READY_MADE`), currentPrice, isActive |
| `ProductPriceHistory` | productId, oldPrice, newPrice, changedById, changedAt |
| `InventoryItem` | name, **type** (`RAW_MATERIAL` / `PACKAGING` / `SNACK`), unit, **stockQty**, lowStockThreshold, isActive |
| `RecipeItem` | productId, inventoryItemId, qtyPerUnit |
| `Shift` | cashierId, storeId, openingCash, closingCash, expectedCash, openedAt, closedAt |
| `Order` | receiptNo, storeId, cashierId, shiftId, total, paymentMethod, status (`COMPLETED` / `VOID_REQUESTED` / `VOIDED`), voidReason, voidApprovedById |
| `OrderItem` | orderId, productId, qty, unitPrice (presyo noong oras ng benta) |
| `StockIn` / `StockInItem` | clerkId, supplier?, note, receivedAt / inventoryItemId, qty |
| `StockAudit` / `StockAuditItem` | clerkId, status (`DRAFT` / `FINALIZED`) / inventoryItemId, systemQty, countedQty, variance |
| `StockMovement` | inventoryItemId, type (`SALE` / `STOCK_IN` / `AUDIT_ADJUST` / `WASTE` / `VOID_RETURN`), qty (+/−), balanceAfter, userId, storeId?, orderId? / stockInId? / auditId? |
| `AuditLog` | userId, action, entity, entityId, before, after, createdAt |

**Pinakamahalagang patakaran:** dumadaan sa `StockMovement` ang **lahat** ng pagbabago sa `stockQty`. Galing dito ang inventory reports at dito natutunton ang discrepancy.

---

## 5. Kailangan pang pag-usapan

- [ ] **Size o add-ons** (S/M/L, extra shot)? Kung meron → kailangan ng `ProductVariant`, at magkakaroon ng sariling recipe ang bawat size
- [ ] **Bayad**: cash lang, o may GCash din bilang tala lang? (Wala sa scope ang online payment processing)
- [ ] **Clerk**: isa ba para sa dalawang store, o may clerk ang bawat store?
- [ ] **Discount** (Senior/PWD 20%)?
- [ ] **Cost ng inventory item** para sa profit report? (Optional, wala sa Chapter 1)
- [ ] Kailan ibabawas ang stock: sa pag-save ng order (mungkahi: **oo, agad-agad**)
- [ ] Puwede bang maging negatibo ang stock kapag may benta pero kulang ang naitalang stock? (mungkahi: **puwede pero may babala**, para hindi maipit ang cashier)

---

## 6. Wala sa scope (ayon sa Chapter 1)

Online ordering ng customer · online payment processing · delivery tracking · mobile app · predictive analytics · awtomatikong pag-order sa supplier · integration sa POS hardware · paggamit ng ibang café o negosyo
