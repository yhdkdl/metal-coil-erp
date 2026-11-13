# Metal Coil ERP Demo Workflow

Use this document to test the complete system from receiving imported material through sales and finance review.

## Demo credentials

### Administrator

- Email: `admin@metalcoil.com`
- Password: `Admin123!`
- Role: Administrator

The administrator can access all modules.

## Complete test flow

### 1. Sign in

1. Open the login screen.
2. Enter the administrator credentials above.
3. Confirm that the dashboard opens.
4. Confirm that the sidebar displays the available modules.

### 2. Receive a coil

1. Open `Warehouse > Coils`.
2. Select `Receive coil`.
3. Enter:

   - Coil number: `DEMO-2026-001`
   - Heat number: `HEAT-DEMO-001`
   - Supplier: `Demo Steel Supplier`
   - Grade: `S235JR`
   - Thickness: `1.20`
   - Width: `1250`
   - Weight: `1000`
   - Cost per kg: `1.20`

4. Confirm the total cost preview is `1200.00`.
5. Save the coil.
6. Confirm the new coil status is `IN_STOCK`.
7. Open the coil detail screen and confirm that no pieces exist yet.

### 3. Start a production run

1. Open `Production`.
2. Select `Start new run`.
3. Select `DEMO-2026-001`.
4. Select a machine type, such as `CUT_TO_LENGTH`.
5. Save the run.
6. Confirm that the run status is `OPEN`.
7. Return to the coil list and confirm the coil status is `IN_PRODUCTION`.

### 4. Add output pieces

On the operator terminal, add these three outputs:

#### Output 1

- Thickness: `1.20`
- Width: `500`
- Length: `2000`
- Weight: `400`
- Grade: `S235JR`
- Category: `SHEET`

#### Output 2

- Thickness: `1.20`
- Width: `500`
- Length: `1500`
- Weight: `350`
- Grade: `S235JR`
- Category: `SHEET`

#### Output 3

- Thickness: `1.20`
- Width: `250`
- Length: `2000`
- Weight: `250`
- Grade: `S235JR`
- Category: `STRIP`

Expected result:

- Produced weight: `1000 / 1000 kg`
- Output count: `3`
- The complete button becomes available.

### 5. Complete production

1. Select `Complete run`.
2. Confirm the operation.
3. Confirm the generated piece codes:

   - `DEMO-2026-001-001`
   - `DEMO-2026-001-002`
   - `DEMO-2026-001-003`

4. Confirm the allocated costs:

   - Piece 001: `480.00`
   - Piece 002: `420.00`
   - Piece 003: `300.00`

5. Confirm the run status is `COMPLETED`.
6. Confirm the coil status is `CONSUMED`.
7. Confirm the pieces are in the main warehouse with status `IN_MAIN`.

### 6. Set selling prices

1. Open `Sales > Pricing`.
2. Filter by grade `S235JR`.
3. Choose `Set exact selling price`.
4. Set the price to `600.00`.
5. Add reason: `Demo pricing`.
6. Apply the update.
7. Confirm that the three pieces receive a selling price.

Pricing rules:

- The selling price cannot be below the allocated cost.
- Sold pieces cannot be repriced.
- Price changes are recorded in price history.
- Sales use the configured piece price.

### 7. Test a bulk sale

1. Open `Sales > New sale`.
2. Select the `Bulk` channel.
3. Select the main warehouse.
4. Enter customer name: `Bulk Demo Customer`.
5. Select `DEMO-2026-001-001`.
6. Create the sale.
7. Confirm the sale is created as `COMPLETED`.
8. Confirm the piece status changes to `SOLD`.

### 8. Transfer pieces to the outlet

1. Open `Warehouse > Transfers`.
2. Select `DEMO-2026-001-002` and `DEMO-2026-001-003`.
3. Select the retail outlet warehouse.
4. Create the transfer.
5. Confirm both pieces move from the main warehouse to the outlet.
6. Confirm their status changes to `IN_OUTLET`.

### 9. Test a retail sale

1. Open `Sales > New sale`.
2. Select the `Retail` channel.
3. Select the retail outlet warehouse.
4. Enter customer name: `Retail Demo Customer`.
5. Select `DEMO-2026-001-002`.
6. Create the sale.
7. Confirm the piece status changes to `SOLD`.

### 10. Record a payment

1. Open the retail sale detail screen.
2. Select `Record payment`.
3. Enter the full sale amount.
4. Select `BANK_TRANSFER`.
5. Save the payment.
6. Confirm the sale status changes to `PAID`.
7. Confirm the amount due is `0.00`.

### 11. Review finance

1. Open `Finance`.
2. Select `Daily`.
3. Confirm the sales created today appear in the revenue periods.
4. Confirm the dashboard shows:

   - Revenue
   - COGS
   - Gross profit
   - Inventory valuation
   - Pieces without prices
   - Profit by coil

5. Select `Monthly` and confirm the report covers the current month.
6. Select `Yearly` and confirm the report covers the current year.
7. Open `Finance > Revenue` and verify the period rows and sale counts.
8. Open `Finance > Profit by coil` and verify revenue, COGS, and gross profit for the demo coil.

## Expected financial calculation

For each sold piece:

```text
Revenue = Selling price
COGS = Allocated cost
Gross profit = Revenue - COGS
```

For the demo prices:

```text
Piece 001 gross profit = 600.00 - 480.00 = 120.00
Piece 002 gross profit = 600.00 - 420.00 = 180.00
Total demo gross profit = 300.00
```

## Validation checks

- A coil cannot be used in two active production runs.
- A production run cannot complete without output pieces.
- Output weight cannot exceed the source coil tolerance.
- Generated piece codes are sequential per coil.
- A piece cannot be sold twice.
- Bulk sales only use main warehouse pieces.
- Retail sales only use outlet warehouse pieces.
- A sale cannot use a price below the configured minimum.
- Sold pieces cannot be repriced.
- Every receipt, production output, transfer, and sale creates a traceable stock movement.
