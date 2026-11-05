SYSTEM_BLUEPRINT.md — Metal Coil Traceability & Sales ERP
What this document is: The plain-language description of what the system does, for whom, and how to verify it works. If the built system contradicts anything here, the system is wrong — not this document. Update this document first, then fix the code.

How to use it:

Before starting a phase: Read the flows that phase will touch. If any flow is unclear or wrong, fix it here first.

At the end of every phase: Test the flows affected by that phase using the "Verification" bullet under each flow.

At the end of the project: Walk through all 10 flows top to bottom. Anything that fails = a correction ticket for the coding agent.

1. Overview
The client is a steel service centre. They import steel coils, cut them on machines (slitting, cut-to-length, shearing), track each resulting piece back to its source coil, store finished pieces in a main warehouse, transfer some to a retail outlet, and sell via two channels (bulk from main, retail from outlet). They need to know, for any sold piece, which coil it came from, and for any coil, what it earned. The system must also report daily, weekly, and monthly revenue and cost.

The system is a web application — no machine integration, no offline mode. Operators use tablets on the shop floor. Sales and finance use desktops. Warehouse staff use both.

2. Actors and Roles
Role	What they do	What they can access
Admin	Everything. Sets up users, oversees all modules.	All pages, all actions
Warehouse	Receive coils, transfer pieces to outlet, view inventory	Coil receipt, coil list, piece list, transfers
Production	Start production runs, log output pieces, complete or cancel runs	Production runs, operator terminal (read-only on coils)
Sales	Create bulk sales, create retail sales, record payments, adjust prices	Sales, payments, pricing tool
Finance	View reports, exports	All reports, export CSV (read-only on operational data)
A user has exactly one role. Roles are enforced both in the UI (hidden nav links) and in the backend (every protected endpoint checks role).

3. Core Concepts (glossary)
Term	Meaning
Coil	A physical imported steel coil. Has a unique coil number, heat number, grade, dimensions, weight, and cost per kg.
Produced Piece	A physical output from cutting a coil. Has a unique piece code, dimensions, weight, grade, category, and must reference its parent coil.
Production Run	A job that starts against one coil and produces one or more pieces. Belongs to a single operator. Has a status: OPEN → COMPLETED or CANCELLED.
Output (staged)	A piece added to a run but not yet created as a ProducedPiece. Staging lets the operator correct mistakes before committing.
Warehouse	Physical location. Two types: MAIN (production warehouse) and OUTLET (retail warehouse).
Stock Movement	Immutable audit record of every physical event affecting a coil or piece. Types: RECEIPT, PRODUCTION_OUTPUT, TRANSFER, SALE, ADJUSTMENT.
Sale	A transaction selling one or more pieces to a customer. Types: BULK (from main) or RETAIL (from outlet).
Payment	Money received against a sale. A sale can have 0, 1, or many payments.
Allocated Cost	The cost attributed to a piece, computed as piece.weight_kg × coil.cost_per_kg at the moment the piece is created. Never changes after creation.
Selling Price	The asking price of a piece. Editable until the piece is sold.
Sale Price	The actual price the piece was sold for. Locked forever once the sale is created.
COGS	Cost of Goods Sold = sum of allocated_cost for pieces sold in a period.
4. End-to-End Flows
Each flow below is a scenario the system must handle. Each has a Verification bullet — the specific thing to test to confirm it works.

Flow 1 — Receiving a Coil
Who: Warehouse role.
Trigger: A physical coil arrives from a supplier.
Inputs: Coil number (unique), heat number, supplier, grade, thickness, width, total weight (kg), cost per kg.
What happens:

System computes total_cost = total_weight_kg × cost_per_kg (server-side, not client).

Creates a Coil record with status IN_STOCK.

Creates a StockMovement of type RECEIPT, to_warehouse = MAIN.

Rejects if coil_number is already used (unique constraint).
What can fail:

Duplicate coil number → 409 Conflict

Negative or zero weight/cost → 422 with field-level message
Verification:

After receipt, coil appears in /warehouse/coils with status IN_STOCK.

Coil detail page shows the RECEIPT movement.

Attempting to receive the same coil number again fails with a clear message.

Flow 2 — Starting a Production Run
Who: Production role.
Trigger: The operator is about to cut a coil.
Inputs: Coil (selected from IN_STOCK coils only), machine type (SLITTING, CUT_TO_LENGTH, SHEARING, OTHER).
What happens:

System creates a ProductionRun with status OPEN, operator = current user, started_at = now.

Coil status changes from IN_STOCK → IN_PRODUCTION.

Operator is redirected to the operator terminal for that run.
What can fail:

Selecting a coil that is not IN_STOCK (already consumed or already in another run) → 422

Starting two runs against the same coil simultaneously → second must be rejected
Verification:

Coil detail page shows status IN_PRODUCTION.

Only IN_STOCK coils appear in the "Start Run" coil dropdown.

Flow 3 — Logging Output Pieces (Operator Terminal)
Who: Production role, on a shop-floor tablet.
Trigger: Operator has produced one piece from the coil.
Inputs: Grade, category (SHEET / STRIP / SHEARED / SCRAP / RHS / CHS / PLATE), thickness (mm), width (mm), length (mm), weight (kg).
What happens:

System creates a staged ProductionRunOutput (not yet a real piece).

Running total on the terminal updates: "Produced: X / Y kg (Z%)".

If cumulative weight exceeds coil weight by more than 0.5%, the "Add Piece" action is blocked with a clear message.

Operator can delete any staged output before completing.
What can fail:

Cumulative weight exceeds coil weight × 1.005 → 422 with message "Output total (X kg) exceeds coil weight (Y kg)"

Non-positive weight or dimensions → 422
Verification:

Adding outputs updates the running total and progress bar in real time.

Attempting to add a piece that pushes the total over the coil weight is rejected.

Deleting a staged output reduces the running total correctly.

Flow 4 — Completing a Production Run
Who: Production role.
Trigger: Operator has finished cutting the coil and all outputs are staged correctly.
Inputs: None — just clicks the "Complete Run" button.
What happens (in a single transaction):

Backend verifies: run is OPEN, has ≥1 staged output, total weight ≤ coil weight × 1.005.

For each output, in creation order:

Generates piece_code = "<coil_number>-<seq:03d>" (e.g., IMP-2024-001-001).

Computes allocated_cost = output.weight_kg × coil.cost_per_kg.

Creates a ProducedPiece with parent_coil_id populated, status = IN_MAIN, current_warehouse = MAIN, selling_price = NULL.

Creates a StockMovement of type PRODUCTION_OUTPUT.

Coil status → CONSUMED.

Run status → COMPLETED, completed_at = now.

Staged outputs are deleted (replaced by real pieces).

Response includes the generated piece codes.
What can fail:

Double-click on "Complete" (network lag) → second call must return 409 Conflict (already completed). No duplicate pieces created.

Zero staged outputs → 422
Verification:

Success modal lists the generated piece codes.

Coil detail page shows status CONSUMED and lists all pieces.

Sum of piece allocated_cost equals the coil's total_cost exactly (when weights sum to coil weight).

Double-clicking "Complete" does not create a second set of pieces.

Flow 5 — Traceability (the core value of the system)
Who: Any role (read-only).
Trigger: A customer complains about a piece, or a certification request asks "which coil did this come from?"
Inputs: A piece code, or a coil number.
What happens:

On a piece's detail page, the "Source Coil" card shows the parent coil's number, heat number, supplier, and is clickable.

On a coil's detail page, the "Pieces Produced" table lists every piece from that coil.

Clicking the source coil from a piece navigates to the coil, and vice versa.
Verification:

Open a piece detail page → click "Source Coil" → arrives at that coil's page → the piece is listed under "Pieces Produced".

Reverse: open a coil → click a piece → click "Source Coil" → arrives back at the same coil.

This is the acceptance test for the entire system's core purpose.

Flow 6 — Transferring Pieces to the Outlet
Who: Warehouse role.
Trigger: The outlet needs stock.
Inputs: One or more pieces currently in IN_MAIN, target outlet warehouse, optional note.
What happens:

For each piece: creates a StockMovement of type TRANSFER with from = MAIN, to = OUTLET, sharing a transfer_group_id.

Piece status → IN_OUTLET, current_warehouse = OUTLET.

All pieces in one transfer are updated atomically.
What can fail:

Piece is not in IN_MAIN (already sold, already in outlet) → 422, entire transfer rolls back

Target warehouse is not of type OUTLET → 422

Double-click on submit → second call returns 409
Verification:

After transfer, the pieces appear in /warehouse/pieces with location "Outlet".

Piece detail page's "Movement History" shows a TRANSFER row.

Attempting to transfer a piece already in outlet fails.

Flow 7 — Recording a Bulk Sale
Who: Sales role.
Trigger: A large customer buys multiple pieces from the main warehouse.
Inputs: Customer name, one or more IN_MAIN pieces, a sale price per piece.
What happens:

Backend validates: every piece exists, is IN_MAIN, is in the selected warehouse, and sale_price > 0.

Creates Sale (type BULK, status COMPLETED), SaleLineItem per piece, StockMovement of type SALE per piece.

Each piece → status SOLD.

Sale total_amount = sum of sale_price across line items.
What can fail:

Piece is not IN_MAIN (already sold, in outlet) → 422

Duplicate piece in line items → 422

sale_price is zero or negative → 422
Verification:

Sale detail page shows all line items, total amount, and amount due.

Sold pieces no longer appear in the "available for sale" list.

Attempting to sell the same piece again fails.

Flow 8 — Recording a Retail Sale
Who: Sales role at the outlet.
Trigger: A walk-in customer buys one or more pieces from the outlet.
Inputs: Customer name, one or more IN_OUTLET pieces, a sale price per piece.
What happens: Same as Flow 7, but only IN_OUTLET pieces are allowed, and sale_type = RETAIL.
Verification:

Same tests as Flow 7, but with outlet pieces.

A RETAIL sale with an IN_MAIN piece fails with a clear message.

A BULK sale with an IN_OUTLET piece fails with a clear message.

Flow 9 — Recording Payments
Who: Sales or Finance role.
Trigger: A customer pays (fully or partially) for a sale.
Inputs: Amount, method (CASH, BANK_TRANSFER, CHEQUE, OTHER), optional reference.
What happens:

Backend validates: amount > 0, amount ≤ amount_due.

Creates Payment record.

Recomputes sale status:

amount_paid == 0 → COMPLETED

0 < amount_paid < total → PARTIAL

amount_paid == total → PAID
What can fail:

amount > amount_due → 422

Sale is already PAID or CANCELLED → 409
Verification:

Partial payment updates sale status to PARTIAL, amount_due decreases.

Full payment updates sale status to PAID.

Overpayment is rejected.

Double-clicking "Record Payment" doesn't record twice.

Flow 10 — Reading Financial Reports
Who: Finance or Admin role.
Trigger: End of day / week / month. Client wants to see revenue and profit.
Inputs: Date range, granularity (day / week / month), optional channel filter (bulk / retail / both).
What happens:

Revenue = sum of sale_price across all non-cancelled sales in the period.

COGS = sum of allocated_cost across all pieces sold in the period.

Gross Profit = Revenue − COGS.

Report shows each period as a row, plus totals.

Additional reports:

Profit by coil: For each coil, revenue from its pieces vs the coil's cost → which coils are profitable.

Inventory valuation: Current value of all unsold pieces, by warehouse (cost basis and list-price basis).

Verification:

Manually compute revenue for a known period → matches the report exactly.

CANCELLED sales are excluded from all totals.

Revenue − COGS = Gross Profit in every row.

Bulk-only filter equals the sum of bulk sales only; retail-only equals retail sales only.

5. Cross-Cutting Behaviors
These must be true everywhere.

Authentication
Every page (except /login and /register) requires a valid JWT.

Expired tokens redirect to /login.

Deleting a user invalidates their tokens immediately (admin action).

Role enforcement
Backend: every protected endpoint checks the user's role, not just the frontend.

A Sales user calling POST /coils (warehouse action) receives 403, even if they bypass the UI.

Error messages
Every API error returns a structure the frontend can display as text (never [object Object]).

Validation errors (422) show which field failed and why.

Business-rule violations (409, 422) show a human-readable message.

Idempotency
Any endpoint that creates a side effect (complete run, create sale, record payment, transfer) rejects a duplicate call.

"Duplicate" means: the same resource is already in the target state, or the request includes an idempotency key that was already processed.

Money
All monetary amounts stored as Decimal on the backend.

All monetary amounts serialized as strings in API responses ("128.50", not 128.5).

All monetary amounts displayed with 2 decimal places and thousands separators in the UI.

6. Data Invariants (must always be true)
These are the properties the system must guarantee. If any is ever false, there is a bug.

Every produced piece has exactly one parent coil. No piece exists without a parent_coil_id.

A coil's pieces' total weight ≤ the coil's own weight (with 0.5% tolerance for measurement).

A piece's allocated_cost never changes after creation. Selling price can change, but cost is locked.

A piece's sale price is locked once the sale is created. Cancelled sales restore the piece, but the original sale price is preserved in the cancelled record.

A sold piece cannot be transferred, re-sold, or moved. It is SOLD forever unless the sale is cancelled.

Revenue − COGS = Gross Profit, always. This must hold for every period, every filter, every report.

Every stock movement has a type and appears in the piece's history. There are no "silent" changes to piece location or status.

CANCELLED sales have zero effect on revenue, COGS, and profit. They appear in lists for audit, but never in financial totals.

7. Deferred / Open Questions for the Client
These were intentionally not built in Phases 1–6. Flag them at delivery.

Scrap pieces: Currently treated as normal pieces with category = SCRAP. The client may want scrap value tracked separately or excluded from sellable inventory.

Machine integration: The system is operator-driven. Real-time machine data (weights, cycle times) is a future MES-level feature.

Returns and refunds: There is no return flow. Cancelling an unpaid sale restores pieces, but paid sales cannot be reversed. A future phase would add refunds and credit notes.

Multi-currency: All amounts are single-currency. Multi-currency would require a currency field and exchange rate tracking.

Customer records: Sales capture a customer name only, not a customer entity. A future phase could add a proper customer table with contact info and history.

Coil-level certifications: Heat numbers are tracked but there is no attachment of mill certificates or test reports to coils. A future phase could add document uploads.

8. How to verify the whole system
When all phases are complete, this is the end-to-end walkthrough. If every step succeeds with the expected result, the system is ready for handoff.

Log in as admin → land on dashboard.

Receive a coil (COIL-DEMO-001, 5000 kg, $0.85/kg) → coil appears with status IN_STOCK.

Start a production run against that coil → coil status becomes IN_PRODUCTION.

Add three outputs totaling 5000 kg (e.g., 2000 + 1500 + 1500) → running total shows 100%, progress bar green.

Complete the run → success modal shows three piece codes (COIL-DEMO-001-001, -002, -003).

Open the coil detail page → status is CONSUMED, all three pieces listed with allocated costs summing to $4250.

Click piece 2 → "Source Coil" card shows COIL-DEMO-001 → click it → arrives back at the coil page.

Transfer piece 3 to outlet → piece location becomes "Outlet" in the piece list.

Create a bulk sale with pieces 1 and 2 → sale status COMPLETED.

Create a retail sale with piece 3 → sale status COMPLETED.

Record full payment on the bulk sale → status PAID.

Record partial payment on the retail sale → status PARTIAL.

Open the revenue report for today → shows 2 sales, revenue = sum of sale prices, COGS = sum of allocated costs, gross profit positive.

Attempt to transfer piece 1 (now sold) → rejected with a clear message.

Cancel the retail sale (blocked because it has a payment) → rejected with a clear message.

If all 15 pass, the system does what it was built to do.

