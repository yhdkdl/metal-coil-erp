# Metal Coil Traceability & Sales ERP

Phase 1 provides the monorepo foundation, PostgreSQL schema, JWT authentication, role-aware navigation, and a working Next.js UI shell. Production, warehouse operations, sales, and reporting workflows are deferred to Phase 2.

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

The seed creates `admin@metalcoil.local` with password `Admin123!`, two warehouses, and three sample coils.

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