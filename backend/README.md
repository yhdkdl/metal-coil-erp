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

Phase 2 includes coil receipt, production run staging/completion, automatic piece generation and cost allocation, and traceability. Transfers, sales, and reporting remain deferred.
