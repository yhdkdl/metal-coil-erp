from decimal import Decimal
from sqlalchemy import select
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Coil, CoilStatus, User, UserRole, Warehouse, WarehouseType

def seed():
    with SessionLocal() as db:
        admin = db.scalar(select(User).where(User.email == "admin@metalcoil.com"))
        if not admin:
            db.add(User(email="admin@metalcoil.local", hashed_password=hash_password("Admin123!"), full_name="System Administrator", role=UserRole.ADMIN))
        main = db.scalar(select(Warehouse).where(Warehouse.type == WarehouseType.MAIN))
        outlet = db.scalar(select(Warehouse).where(Warehouse.type == WarehouseType.OUTLET))
        if not main:
            db.add(Warehouse(name="Main Production Warehouse", type=WarehouseType.MAIN))
        if not outlet:
            db.add(Warehouse(name="Retail Outlet", type=WarehouseType.OUTLET))
        samples = [("COIL-2026-001", "H-88421", "ArcelorMittal", "S235JR", "1.20", "1250", "24500", "1.08"), ("COIL-2026-002", "H-88422", "Tata Steel", "DX51D", "0.80", "1000", "18200", "1.24"), ("COIL-2026-003", "H-88423", "SSAB", "S355MC", "2.00", "1500", "31200", "1.16")]
        for number, heat, supplier, grade, thickness, width, weight, cost in samples:
            if not db.scalar(select(Coil).where(Coil.coil_number == number)):
                db.add(Coil(coil_number=number, heat_number=heat, supplier=supplier, grade=grade, thickness_mm=Decimal(thickness), width_mm=Decimal(width), total_weight_kg=Decimal(weight), cost_per_kg=Decimal(cost), status=CoilStatus.IN_STOCK))
        db.commit()
        print("Seed complete. Admin: admin@metalcoil.com / Admin123!")

if __name__ == "__main__":
    seed()
