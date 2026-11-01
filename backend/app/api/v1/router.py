from fastapi import APIRouter
from app.api.v1.endpoints import auth, coils, pieces, production_runs, stock_movements, users, warehouses

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(coils.router, prefix="/coils", tags=["coils"])
api_router.include_router(pieces.router, prefix="/pieces", tags=["pieces"])
api_router.include_router(warehouses.router, prefix="/warehouses", tags=["warehouses"])
api_router.include_router(production_runs.router, prefix="/production-runs", tags=["production-runs"])
api_router.include_router(stock_movements.router, prefix="/stock-movements", tags=["stock-movements"])

