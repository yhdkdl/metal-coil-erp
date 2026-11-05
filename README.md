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

## Phase 1 scope

- SQLAlchemy models and Alembic migration for users, coils, warehouses, pieces, production runs, stock movements, sales, and sale line items.
- Login/register API and frontend pages with JWT-based role checks.
- Dashboard shell and module placeholders.
- Operational production, transfers, sales, and reporting logic are deferred to Phase 2.

## Phase 2 Workflow

Receive Coil -> Start Production Run -> Add Output Pieces -> Complete Run -> View Pieces.

Coil detail shows source metadata, production totals, and every generated piece. Piece detail shows its source coil, production run, allocated cost, warehouse status, and stock movement trace.