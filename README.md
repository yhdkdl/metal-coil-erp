# Metal Coil Traceability & Sales ERP

Phase 2 adds coil receipt, production runs, staged output pieces, automatic cost allocation, and end-to-end traceability. Transfers, sales, and reporting remain deferred.

## Run the project

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Set DATABASE_URL (Supabase PostgreSQL) and JWT_SECRET in .env
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

The seed creates `admin@metalcoil.com` with password `Admin123!`, two warehouses, and four sample coils.

### Frontend

```powershell
cd frontend
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

Open http://localhost:3000.

The frontend defaults to `http://127.0.0.1:8000/api/v1`; if `frontend/.env.local` exists, make sure `NEXT_PUBLIC_API_URL` matches the URL where Uvicorn is running. Restart the Next.js dev server after changing it.

## Phase 1 scope

- SQLAlchemy models and Alembic migration for users, coils, warehouses, pieces, production runs, stock movements, sales, and sale line items.
- Login/register API and frontend pages with JWT-based role checks.
- Dashboard shell and module placeholders.
- Operational production, transfers, sales, and reporting logic are deferred to Phase 2.

## Phase 2 Workflow

Receive Coil -> Start Production Run -> Add Output Pieces -> Complete Run -> View Pieces.

Coil detail shows source metadata, production totals, and every generated piece. Piece detail shows its source coil, production run, allocated cost, warehouse status, and stock movement trace.

## Transferring pieces from Main to Outlet

1. Sign in as a Warehouse user and open **Transfers**.
2. Select the outlet warehouse and check one or more pieces currently in Main.
3. Confirm the transfer after reviewing the running piece count and total weight.
4. The transfer is recorded as one grouped audit event, and each piece moves to `IN_OUTLET`.
5. Open a piece to review its complete movement history, including the transfer.

## Recording a bulk sale and full payment

1. Sign in as Sales and open **Sales → New sale**.
2. Select the Bulk channel, customer, Main warehouse, and available pieces.
3. Review the server-calculated total and confirm the sale.
4. Open the sale detail and record a payment no greater than the amount due.
5. A full payment changes the sale status to `PAID`; sold pieces remain unavailable.

## Reading daily / weekly / monthly revenue

1. Sign in as Finance and open **Finance → Revenue**.
2. Select day, week, or month granularity to regroup completed, partial, and paid sales.
3. Review revenue, COGS, and gross profit; cancelled sales are excluded.
4. Use **Export CSV** to download the current table.