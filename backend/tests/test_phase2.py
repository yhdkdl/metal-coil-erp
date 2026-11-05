from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models import Coil, CoilStatus, ProductionRunOutput, User, UserRole, Warehouse, WarehouseType
from app.schemas.coil import CoilRead
from app.schemas.production_run import ProductionRunCreate, ProductionRunOutputCreate
from app.api.v1.endpoints.production_runs import (
    add_output,
    cancel_production_run,
    complete_production_run,
    create_production_run,
)


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def setup_data(db):
    user = User(email="operator@example.com", hashed_password="x", full_name="Operator", role=UserRole.PRODUCTION)
    warehouse = Warehouse(name="Main", type=WarehouseType.MAIN)
    coil = Coil(
        coil_number="C-1", heat_number="H-1", supplier="Supplier", grade="S235",
        thickness_mm=Decimal("1.2"), width_mm=Decimal("1000"), total_weight_kg=Decimal("100"),
        cost_per_kg=Decimal("1.00"), status=CoilStatus.IN_STOCK,
    )
    db.add_all([user, warehouse, coil])
    db.commit()
    return user, warehouse, coil


def test_decimal_values_are_serialized_as_strings(db):
    _, _, coil = setup_data(db)
    result = CoilRead.model_validate(coil).model_dump(mode="json")
    assert result["total_weight_kg"] == "100.000"


def test_production_run_output_and_completion(db):
    user, warehouse, coil = setup_data(db)
    run = create_production_run(ProductionRunCreate(coil_id=coil.id, machine_type="Slitter"), db, user)
    for weight in ("40", "35", "25"):
        add_output(run.id, ProductionRunOutputCreate(
            thickness_mm=Decimal("1.2"), width_mm=Decimal("100"),
            length_mm=Decimal("2000"), weight_kg=Decimal(weight), grade="S235",
            category="Sheet",
        ), db, user)
    completed = complete_production_run(run.id, db, user)
    assert [piece.piece_code for piece in completed] == ["C-1-001", "C-1-002", "C-1-003"]
    assert [piece.allocated_cost for piece in completed] == [Decimal("40.00"), Decimal("35.00"), Decimal("25.00")]
    assert db.get(Coil, coil.id).status == CoilStatus.CONSUMED
    assert db.query(ProductionRunOutput).count() == 0


def test_cancellation_releases_coil(db):
    user, _, coil = setup_data(db)
    run = create_production_run(ProductionRunCreate(coil_id=coil.id, machine_type="Slitter"), db, user)
    cancelled = cancel_production_run(run.id, db, user)
    assert cancelled.status.value == "CANCELLED"
    assert db.get(Coil, coil.id).status == CoilStatus.IN_STOCK
