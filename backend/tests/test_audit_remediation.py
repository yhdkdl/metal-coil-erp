from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.v1.endpoints.production_runs import add_output, create_production_run
from app.api.v1.endpoints.sales import create_sale
from app.db.base import Base
from app.models import Coil, CoilStatus, PieceStatus, ProducedPiece, ProductionRunOutput, User, UserRole, Warehouse, WarehouseType
from app.models.sale import SaleType
from app.schemas.production_run import ProductionRunCreate, ProductionRunOutputCreate
from app.schemas.sale import SaleCreate, SaleLineItemCreate


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def test_output_quantity_expands_to_individual_staged_outputs(db):
    user = User(email="operator@example.com", hashed_password="x", full_name="Operator", role=UserRole.PRODUCTION)
    warehouse = Warehouse(name="Main", type=WarehouseType.MAIN)
    coil = Coil(
        coil_number="BATCH-1", heat_number="H-1", supplier="Supplier", grade="S235",
        thickness_mm=Decimal("1"), width_mm=Decimal("100"), total_weight_kg=Decimal("50"),
        cost_per_kg=Decimal("2"), status=CoilStatus.IN_STOCK,
    )
    db.add_all([user, warehouse, coil])
    db.commit()
    run = create_production_run(ProductionRunCreate(coil_id=coil.id, machine_type="Slitter"), db, user)
    add_output(run.id, ProductionRunOutputCreate(
        thickness_mm=Decimal("1"), width_mm=Decimal("100"), length_mm=Decimal("1000"),
        weight_kg=Decimal("10"), grade="S235", category="SHEET", quantity=5,
    ), db, user)
    assert db.query(ProductionRunOutput).filter_by(production_run_id=run.id).count() == 5


def test_sale_rejects_price_below_piece_minimum(db):
    user = User(email="sales@example.com", hashed_password="x", full_name="Sales", role=UserRole.SALES)
    warehouse = Warehouse(name="Main", type=WarehouseType.MAIN)
    coil = Coil(
        coil_number="PRICE-1", heat_number="H-1", supplier="Supplier", grade="S235",
        thickness_mm=Decimal("1"), width_mm=Decimal("100"), total_weight_kg=Decimal("10"),
        cost_per_kg=Decimal("2"), status=CoilStatus.CONSUMED,
    )
    db.add_all([user, warehouse, coil])
    db.commit()
    piece = ProducedPiece(
        piece_code="PRICE-1-001", parent_coil_id=coil.id, thickness_mm=Decimal("1"),
        width_mm=Decimal("100"), length_mm=Decimal("1000"), weight_kg=Decimal("5"),
        grade="S235", category="SHEET", allocated_cost=Decimal("10"),
        min_selling_price=Decimal("10"), status=PieceStatus.IN_MAIN,
        current_warehouse_id=warehouse.id,
    )
    db.add(piece)
    db.commit()
    with pytest.raises(HTTPException) as rejected:
        create_sale(SaleCreate(
            sale_type=SaleType.BULK, customer_name="Customer", warehouse_id=warehouse.id,
            line_items=[SaleLineItemCreate(piece_id=piece.id, sale_price=Decimal("9.99"))],
        ), db, user)
    assert rejected.value.status_code == 422
