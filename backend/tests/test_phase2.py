from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.models import Coil, CoilStatus, MovementType, ProducedPiece, ProductionRunOutput, StockMovement, User, UserRole, Warehouse, WarehouseType, PieceStatus
from app.schemas.coil import CoilRead
from app.schemas.production_run import ProductionRunCreate, ProductionRunOutputCreate
from app.api.v1.endpoints.production_runs import (
    add_output,
    cancel_production_run,
    complete_production_run,
    create_production_run,
)
from app.api.v1.endpoints.stock_transfers import create_stock_transfer
from app.schemas.stock_transfer import StockTransferCreate


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


def test_completion_requires_at_least_one_output(db):
    user, _, coil = setup_data(db)
    run = create_production_run(ProductionRunCreate(coil_id=coil.id, machine_type="Slitter"), db, user)

    with pytest.raises(HTTPException, match="At least one output is required"):
        complete_production_run(run.id, db, user)


def test_output_weight_and_dimensions_must_be_positive():
    with pytest.raises(ValueError):
        ProductionRunOutputCreate(
            thickness_mm=Decimal("0"), width_mm=Decimal("100"),
            length_mm=Decimal("2000"), weight_kg=Decimal("10"),
            grade="S235", category="Sheet",
        )


def create_piece(db, coil, warehouse, code, status=PieceStatus.IN_MAIN):
    piece = ProducedPiece(
        piece_code=code, parent_coil_id=coil.id, thickness_mm=Decimal("1"),
        width_mm=Decimal("100"), length_mm=Decimal("1000"), weight_kg=Decimal("10"),
        grade="S235", category="SHEET", allocated_cost=Decimal("10"),
        status=status, current_warehouse_id=warehouse.id,
    )
    db.add(piece)
    db.commit()
    return piece


def test_transfer_moves_pieces_with_shared_group_and_is_idempotent(db):
    user, main, coil = setup_data(db)
    outlet = Warehouse(name="Outlet", type=WarehouseType.OUTLET)
    db.add(outlet)
    db.commit()
    pieces = [create_piece(db, coil, main, f"C-1-00{index}") for index in range(1, 4)]

    result = create_stock_transfer(
        StockTransferCreate(piece_ids=[piece.id for piece in pieces], to_warehouse_id=outlet.id),
        db, user,
    )

    assert result.moved_count == 3
    movements = db.query(StockMovement).filter(StockMovement.movement_type == MovementType.TRANSFER).all()
    assert len(movements) == 3
    assert len({movement.transfer_group_id for movement in movements}) == 1
    assert all(piece.status == PieceStatus.IN_OUTLET for piece in pieces)
    with pytest.raises(HTTPException) as duplicate:
        create_stock_transfer(
            StockTransferCreate(piece_ids=[piece.id for piece in pieces], to_warehouse_id=outlet.id),
            db, user,
        )
    assert duplicate.value.status_code == 409


def test_transfer_rolls_back_when_one_piece_is_invalid(db):
    user, main, coil = setup_data(db)
    outlet = Warehouse(name="Outlet", type=WarehouseType.OUTLET)
    db.add(outlet)
    db.commit()
    valid = create_piece(db, coil, main, "C-1-001")
    sold = create_piece(db, coil, main, "C-1-002", PieceStatus.SOLD)

    with pytest.raises(HTTPException) as rejected:
        create_stock_transfer(
            StockTransferCreate(piece_ids=[valid.id, sold.id], to_warehouse_id=outlet.id),
            db, user,
        )
    assert rejected.value.status_code == 422
    db.refresh(valid)
    assert valid.status == PieceStatus.IN_MAIN
    assert db.query(StockMovement).filter(StockMovement.movement_type == MovementType.TRANSFER).count() == 0
