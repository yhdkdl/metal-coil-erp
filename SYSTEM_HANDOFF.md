# Metal Coil ERP - Agent Handoff

Updated: 2026-11-13

This document is the current implementation and deployment context for continuing work on the Metal Coil ERP repository. Read it before changing code.

## Repository and branch state

- Repository: `yhdkdl/metal-coil-erp`
- Local path: `D:\personal projects\metal-coil-erp`
- Current branch: `develop`
- Remote: `origin` -> `https://github.com/yhdkdl/metal-coil-erp.git`
- `develop` is synchronized with `origin/develop`.
- Latest pushed commit: `0a6561a Keep finance filters responsive`
- Previous feature commit: `62e9a85 Add finance sales breakdown and filters`
- Deployment merge commit: `cde524c Merge client demo deployment readiness`
- The worktree has one pre-existing uncommitted edit:
  - `DEMO_WORKFLOW.md` has its local setup/seed section removed.
  - Do not discard or overwrite this edit without explicit user approval.
- This handoff file is new and should be committed only if the next agent/user wants repository documentation committed.

## Product purpose

Metal Coil ERP is a traceability and sales system for metal coils:

1. Receive imported raw coils.
2. Start production runs against coils.
3. Stage and complete output pieces.
4. Track each piece back to its source coil and production run.
5. Move pieces between main and retail/outlet warehouses.
6. Sell pieces through bulk or retail channels.
7. Record payments.
8. Report revenue, COGS, profit, inventory valuation, sales breakdowns, and pricing.

The application has a FastAPI backend, a Next.js frontend, and a Supabase PostgreSQL database.

## Deployment

### Vercel projects

- Frontend project/domain: `https://metal-coil-erp.vercel.app`
- Backend project/domain: `https://metal-coil-api.vercel.app`
- Backend health endpoint: `https://metal-coil-api.vercel.app/health`
- Backend Swagger docs: `https://metal-coil-api.vercel.app/docs`
- Backend API base: `https://metal-coil-api.vercel.app/api/v1`

Both Vercel projects deploy from the `develop` branch:

- Frontend Root Directory: `frontend`
- Frontend framework preset: Next.js
- Backend Root Directory: `backend`
- Backend framework preset: Other

### Required environment variables

Backend Vercel:

```env
DATABASE_URL=<Supabase Transaction Pooler URL using port 6543>
JWT_SECRET=<long random secret>
JWT_ALGORITHM=HS256
FRONTEND_URL=https://metal-coil-erp.vercel.app
```

Frontend Vercel:

```env
NEXT_PUBLIC_API_URL=https://metal-coil-api.vercel.app/api/v1
```

The backend reads `DATABASE_URL` as a complete SQLAlchemy connection string. It does not parse or hardcode the host/port. Supabase Transaction Pooler port `6543` is intended for Vercel serverless use. Local development may use port `5432`.

### Backend Vercel files

- `backend/vercel.json` rewrites all routes to `/api/index`.
- `backend/api/index.py` contains `from app.main import app`.
- `backend/requirements.txt` uses `psycopg2-binary`.
- `backend/app/main.py` configures CORS with `settings.frontend_url`.
- `backend/app/db/session.py` uses `pool_pre_ping=True`, `pool_size=1`, and `max_overflow=0`.

Root `/` returning FastAPI `404 {"detail":"Not Found"}` is expected. `/health` is the deployment check.

## Backend architecture

Important directories:

- `backend/app/main.py`: FastAPI app, CORS, `/health`.
- `backend/app/core/config.py`: Pydantic settings.
- `backend/app/core/security.py`: password hashing and JWT.
- `backend/app/db/session.py`: SQLAlchemy engine/session.
- `backend/app/models/`: SQLAlchemy models.
- `backend/app/schemas/`: Pydantic request/response schemas.
- `backend/app/api/deps.py`: database and authenticated-role dependencies.
- `backend/app/api/v1/router.py`: API route registration.
- `backend/alembic/`: migrations.
- `backend/app/seed.py`: idempotent local/manual seed.

Registered API route groups:

```text
/api/v1/auth
/api/v1/users
/api/v1/coils
/api/v1/pieces
/api/v1/warehouses
/api/v1/production-runs
/api/v1/stock-movements
/api/v1/stock-transfers
/api/v1/sales
/api/v1/reports
pricing routes are registered without an extra prefix
```

## Data model

Main tables/models:

- `users`
  - roles: `ADMIN`, `PRODUCTION`, `WAREHOUSE`, `SALES`, `FINANCE`
- `warehouses`
  - types: `MAIN`, `OUTLET`
- `coils`
  - raw material, source cost, dimensions, status
- `production_runs`
  - source coil, machine type, operator, status
- `production_run_outputs`
  - staged production output rows
- `produced_pieces`
  - finished pieces generated when a run is completed
  - includes `piece_code`, `category`, dimensions, grade, costs, selling price, status, warehouse
- `stock_movements`
  - receipt, production output, transfer, sale, adjustment
- `sales`
  - customer, sale channel, total, status, creator
- `sale_line_items`
  - sold piece and sale price
- `payments`
  - payment against a sale
- `price_history`
  - price changes made by Finance/Admin pricing operations

Piece statuses:

```text
IN_MAIN
IN_OUTLET
SOLD
```

Sale channels:

```text
BULK -> Main warehouse
RETAIL -> Outlet warehouse
```

## Authentication and authorization

- Login returns a JWT.
- Frontend stores the access token in `localStorage` under `access_token`.
- Frontend stores the role under `user_role`.
- `frontend/lib/api.ts` sends `Authorization: Bearer <token>`.
- Backend role dependencies restrict each route.
- Demo admin credentials documented in `DEMO_WORKFLOW.md`:
  - Email: `admin@metalcoil.com`
  - Password: `Admin123!`
- Do not expose or commit real secrets.

## Existing workflow

### Receive coil

Warehouse user receives a coil. The coil begins `IN_STOCK`.

### Production

1. Production user starts a run for an available coil.
2. Coil becomes `IN_PRODUCTION`.
3. User stages output rows.
4. Each output row has:
   - thickness
   - width
   - length
   - weight
   - grade
   - backend field `category`
   - quantity
5. Completing the run creates `ProducedPiece` rows.
6. Piece codes use the source coil prefix and a three-digit sequence, for example `COIL-2026-001-001`.
7. Created pieces go to the main warehouse as `IN_MAIN`.
8. A production-output stock movement is recorded.
9. The UI label for the backend `category` field was changed to `Name` in the production output form at the user's request. The stored/reporting field is still `category`; this is intentional compatibility behavior.

### Transfers

Pieces can be moved between main and outlet warehouses. Transfer movements are recorded.

### Sales

- Bulk sales require pieces in the main warehouse.
- Retail sales require pieces in the outlet warehouse.
- A piece must have a selling price before it can be sold.
- The submitted sale price must equal the piece preset price.
- Sold pieces cannot have their price changed.
- Sale movements and sale line items are recorded.

### Pricing

Pricing page: `/sales/pricing`

Visible in the sidebar for Admin and Finance roles.

Bulk price updates can filter unsold pieces by:

- `category`
- `grade`
- `thickness_mm`
- optionally warehouse

Adjustment modes:

- `set`
- `percent`
- `absolute`

Updates create `price_history` rows. Values cannot be non-positive or below `min_selling_price`.

## Current piece filters and overview

Frontend page: `frontend/app/(dashboard)/warehouse/pieces/page.tsx`

Filters:

- Category text input
- Thickness number input

On either filter change, the page fetches:

```text
GET /api/v1/pieces/?category=<value>&thickness_mm=<value>
GET /api/v1/pieces/summary?category=<value>&thickness_mm=<value>
GET /api/v1/warehouses/
```

Backend list route:

```text
GET /api/v1/pieces/
```

Supports:

- `status`
- `coil_id`
- `warehouse_id`
- `q` for piece code
- `category`
- `thickness_mm`
- `limit`
- `offset`

Backend summary route:

```text
GET /api/v1/pieces/summary
```

Groups by `ProducedPiece.category` and `ProducedPiece.thickness_mm` and returns:

- `category`
- `thickness_mm`
- `total_pieces`
- `in_stock_pieces`
- `in_main`
- `in_outlet`
- `sold`

The Pieces page displays those values in a stock overview table.

## Owner dashboard and today's production

Frontend page: `frontend/app/page.tsx`

The main Overview dashboard now fetches today's production summary:

```text
GET /api/v1/pieces/summary?produced_on=YYYY-MM-DD
```

The backend filters by UTC day:

```python
start = datetime.combine(produced_on, time.min, tzinfo=timezone.utc)
end = start + timedelta(days=1)
ProducedPiece.created_at >= start
ProducedPiece.created_at < end
```

The dashboard displays:

- Name/category
- Thickness
- Pieces produced today
- Still in stock
- Sold

The dashboard's “Name” label maps to the persisted `category` field.

Important: the current date calculation in the browser uses `new Date().toISOString().slice(0, 10)`, so it is UTC-based. If the owner needs a local business timezone, change this deliberately and update the backend date interpretation consistently.

## Finance logic and filters

Frontend pages:

- `frontend/app/(dashboard)/finance/page.tsx`
- `frontend/app/(dashboard)/finance/revenue/page.tsx`

### Finance overview page

Period selector:

- Daily
- Monthly
- Yearly

The selected period builds `from` and `to` dates in the frontend.

The Finance page currently filters by:

- Piece category
- Customer

Every filter change requests:

```text
GET /api/v1/reports/revenue
GET /api/v1/reports/profit-by-coil
GET /api/v1/reports/inventory-valuation
GET /api/v1/reports/sales-breakdown
```

The Finance page no longer clears the current report when a filter changes. It keeps existing results visible and shows a small `Updating results...` message until the new requests complete.

### Revenue report

Route:

```text
GET /api/v1/reports/revenue
```

Query parameters:

- `from`
- `to`
- `granularity`: `day`, `week`, `month`, `year`
- `channel`: `BULK`, `RETAIL`, or `both`
- `warehouse_id`
- `category`
- `customer`

The query joins:

```text
Sale -> SaleLineItem -> ProducedPiece
```

It includes sale statuses:

```text
COMPLETED, PARTIAL, PAID
```

Revenue is summed from sale line item prices. COGS is summed from piece allocated costs. Gross profit is revenue minus COGS.

### Sales breakdown

Route:

```text
GET /api/v1/reports/sales-breakdown
```

Query parameters:

- `from`
- `to`
- `category`
- `customer`
- `channel`

The query joins `Sale`, `SaleLineItem`, and `ProducedPiece`, then groups by:

```text
piece.category
piece.thickness_mm
sale.customer_name
sale.sale_type
```

Each row returns:

- `category`
- `thickness_mm`
- `customer`
- `sale_type`
- `pieces_sold`
- `revenue`
- `cogs`
- `gross_profit`

The Finance overview renders this as:

```text
Sales by category, thickness, and customer
```

This is the table the owner should use to see which type/name and thickness generated money, and which customer bought it.

### Profit by coil

Route:

```text
GET /api/v1/reports/profit-by-coil
```

Supports `from`, `to`, `category`, and `customer`. It reports sold/unsold pieces, revenue, COGS, and profit per source coil.

### Inventory valuation

Route:

```text
GET /api/v1/reports/inventory-valuation
```

Reports unsold pieces by warehouse, cost value, list value, and missing selling-price count.

## Sales page filters

Frontend page: `frontend/app/(dashboard)/sales/page.tsx`

The page has:

- Customer/name text filter
- Piece category text filter

It requests:

```text
GET /api/v1/sales/?customer=<value>&category=<value>
```

Backend sales listing supports:

- `from`
- `to`
- `channel`
- `status`
- `customer`
- `category`
- `limit`
- `offset`

Category filtering joins sales to sale line items and produced pieces, then uses `distinct()` so a sale is shown once even when multiple matching line items exist.

## Frontend API client

File: `frontend/lib/api.ts`

- Base URL is `process.env.NEXT_PUBLIC_API_URL`.
- There is no localhost fallback.
- Missing API URL throws an explicit `ApiError`.
- GET responses are cached for 15 seconds and deduplicated while requests are in flight.
- Any non-GET invalidates the GET cache.

Relevant client methods:

```text
api.listPieces()
api.getPieceSummary()
api.getRevenueReport()
api.getSalesBreakdown()
api.getProfitByCoil()
api.listSales()
api.bulkPriceUpdate()
```

## Validation commands

Backend tests:

```powershell
cd "D:\personal projects\metal-coil-erp\backend"
.\.venv\Scripts\python.exe -m pytest -q
```

Expected current result: `15 passed`.

Frontend production build:

```powershell
cd "D:\personal projects\metal-coil-erp\frontend"
npm run build
```

Both passed after the latest Finance filter responsiveness change.

## Database seeding/reset

`backend/app/seed.py` is idempotent. It creates:

- `admin@metalcoil.com` if missing
- Main Production Warehouse
- Retail Outlet
- Four sample coils

To seed Supabase manually from a local checkout, temporarily set local `backend/.env` to the Supabase Transaction Pooler URL and run:

```powershell
cd "D:\personal projects\metal-coil-erp\backend"
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.seed
```

Do not commit `backend/.env`.

To reset business data while preserving the admin, the previously supplied Supabase SQL deletes:

```text
payments
sale_line_items
price_history
stock_movements
produced_pieces
production_run_outputs
production_runs
sales
coils
warehouses
all users except admin@metalcoil.com
```

Do not use `TRUNCATE ... CASCADE` when preserving the admin.

## Recent implementation history

1. Phase 1: foundation, schema, auth, dashboard shell.
2. Phase 2: inbound production and traceability.
3. Phase 3: warehouse transfers and movement history.
4. Phase 4: sales and payments.
5. Phase 5: reporting.
6. Audit remediation and query indexes.
7. Client demo deployment readiness:
   - Vercel backend entrypoint
   - Vercel rewrite
   - required production settings
   - psycopg2 binary
   - serverless SQLAlchemy pooling
   - frontend production API URL requirement
8. Finance and inventory enhancements:
   - category/thickness piece filters
   - stock summary by category/thickness
   - owner dashboard today's production
   - pricing sidebar/page behavior
   - finance category/customer filters
   - sales breakdown by category/thickness/customer/channel
   - sales customer/category filters
   - non-blocking Finance filter refresh

## Known caveats and next-agent guidance

- The backend and frontend are deployed from `develop`; pushing a valid commit triggers Vercel deployments.
- No migration is required for the current reporting/filter changes because they use existing columns/tables.
- The `DEMO_WORKFLOW.md` deletion of its local setup section is pre-existing and currently uncommitted. Preserve it unless explicitly asked otherwise.
- Keep changes surgical. Do not revert Phase 6 work.
- If adding more report filters, update all four layers:
  1. backend endpoint query parameters and joins
  2. response schema
  3. frontend TypeScript type
  4. `frontend/lib/api.ts` method and UI state/request
- If adding a new summary to the dashboard, decide whether its date boundary should be UTC or the client's/local business timezone.
- Verify both `npm run build` and `pytest -q` before pushing.
