# Metal Coil ERP backend

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# Set DATABASE_URL and JWT_SECRET in .env
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

Phase 1 includes the schema, JWT authentication endpoints, role dependencies, and seed data. Production, sales, and reporting workflows are intentionally deferred to Phase 2.
