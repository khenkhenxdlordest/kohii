-- Isang bukas (OPEN) na shift lang bawat cashier/store, kahit sabay-sabay ang requests
CREATE UNIQUE INDEX "Shift_cashierId_storeId_open_key" ON "Shift" ("cashierId", "storeId") WHERE "status" = 'OPEN';
