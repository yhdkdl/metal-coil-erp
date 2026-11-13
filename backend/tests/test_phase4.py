from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.v1.endpoints.sales import cancel_sale, create_sale, record_payment
from app.db.base import Base
from app.models import (
    Coil, CoilStatus, MovementType, Payment, PaymentMethod, PieceStatus,
    ProducedPiece, Sale, SaleStatus, StockMovement, User, UserRole, Warehouse, WarehouseType,
)
from app.schemas.sale import PaymentCreate, SaleCreate, SaleLineItemCreate
from app.models.sale import SaleType


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def setup_sale_data(db):
    user = User(email="sales@example.com", hashed_password="x", full_name="Sales", role=UserRole.SALES)
    main = Warehouse(name="Main", type=WarehouseType.MAIN)
    outlet = Warehouse(name="Outlet", type=WarehouseType.OUTLET)
    coil = Coil(
        coil_number="SALE-COIL", heat_number="H-1", supplier="Supplier", grade="S235",
        thickness_mm=Decimal("1"), width_mm=Decimal("1000"), total_weight_kg=Decimal("100"),
        cost_per_kg=Decimal("1"), status=CoilStatus.CONSUMED,
    )
    db.add_all([user, main, outlet, coil])
    db.commit()
    pieces = []
    for index, warehouse, piece_status in (
        (1, main, PieceStatus.IN_MAIN),
        (2, main, PieceStatus.IN_MAIN),
        (3, outlet, PieceStatus.IN_OUTLET),
    ):
        piece = ProducedPiece(
            piece_code=f"SALE-{index:03d}", parent_coil_id=coil.id,
            thickness_mm=Decimal("1"), width_mm=Decimal("100"), length_mm=Decimal("1000"),
            weight_kg=Decimal("10"), grade="S235", category="SHEET",
            allocated_cost=Decimal("10"), status=piece_status, current_warehouse_id=warehouse.id,
        )
        db.add(piece)
        pieces.append(piece)
    db.commit()
    return user, main, outlet, pieces


def test_bulk_sale_marks_pieces_sold_and_creates_movements(db):
    user, main, _, pieces = setup_sale_data(db)
    pieces[0].selling_price = Decimal("12.50")
    pieces[1].selling_price = Decimal("20.00")
    db.commit()
    sale = create_sale(SaleCreate(
        sale_type=SaleType.BULK, customer_name="Customer", warehouse_id=main.id,
        line_items=[SaleLineItemCreate(piece_id=pieces[0].id, sale_price=Decimal("12.50")),
                    SaleLineItemCreate(piece_id=pieces[1].id, sale_price=Decimal("20.00"))],
    ), db, user)
    assert sale["total_amount"] == "32.50"
    assert all(piece.status == PieceStatus.SOLD for piece in pieces[:2])
    assert db.query(Payment).count() == 0
    assert db.query(Payment).count() == 0
    assert db.query(StockMovement).filter_by(movement_type=MovementType.SALE).count() == 2


def test_wrong_channel_and_duplicate_piece_are_rejected(db):
    user, main, outlet, pieces = setup_sale_data(db)
    with pytest.raises(HTTPException) as wrong_channel:
        create_sale(SaleCreate(
            sale_type=SaleType.RETAIL, customer_name="Customer", warehouse_id=outlet.id,
            line_items=[SaleLineItemCreate(piece_id=pieces[0].id, sale_price=Decimal("10"))],
        ), db, user)
    assert wrong_channel.value.status_code == 422
    with pytest.raises(HTTPException) as duplicate:
        create_sale(SaleCreate(
            sale_type=SaleType.BULK, customer_name="Customer", warehouse_id=main.id,
            line_items=[SaleLineItemCreate(piece_id=pieces[0].id, sale_price=Decimal("10")),
                        SaleLineItemCreate(piece_id=pieces[0].id, sale_price=Decimal("11"))],
        ), db, user)
    assert duplicate.value.status_code == 422


def test_payment_progression_and_cancel_restore(db):
    user, main, _, pieces = setup_sale_data(db)
    pieces[0].selling_price = Decimal("30")
    pieces[1].selling_price = Decimal("15")
    db.commit()
    sale = create_sale(SaleCreate(
        sale_type=SaleType.BULK, customer_name="Customer", warehouse_id=main.id,
        line_items=[SaleLineItemCreate(piece_id=pieces[0].id, sale_price=Decimal("30"))],
    ), db, user)
    record_payment(sale["id"], PaymentCreate(amount=Decimal("10"), method=PaymentMethod.CASH), db, user)
    db.refresh(pieces[0])
    assert db.get(Sale, sale["id"]).status == SaleStatus.PARTIAL
    with pytest.raises(HTTPException) as paid_too_much:
        record_payment(sale["id"], PaymentCreate(amount=Decimal("25"), method=PaymentMethod.CASH), db, user)
    assert paid_too_much.value.status_code == 422
    with pytest.raises(HTTPException) as cancel_error:
        cancel_sale(sale["id"], db, user)
    assert cancel_error.value.status_code == 422

    sale2 = create_sale(SaleCreate(
        sale_type=SaleType.BULK, customer_name="Customer", warehouse_id=main.id,
        line_items=[SaleLineItemCreate(piece_id=pieces[1].id, sale_price=Decimal("15"))],
    ), db, user)
    cancelled = cancel_sale(sale2["id"], db, user)
    assert cancelled["status"] == SaleStatus.CANCELLED
    db.refresh(pieces[1])
    assert pieces[1].status == PieceStatus.IN_MAIN


def test_export_sales_csv(db):
    from app.api.v1.endpoints.sales import export_sales_csv
    user, main, _, pieces = setup_sale_data(db)
    pieces[0].selling_price = Decimal("25.00")
    db.commit()
    sale = create_sale(SaleCreate(
        sale_type=SaleType.BULK, customer_name="Acme Steel", warehouse_id=main.id,
        line_items=[SaleLineItemCreate(piece_id=pieces[0].id, sale_price=Decimal("25.00"))],
        notes="Urgent delivery"
    ), db, user)
    response = export_sales_csv(db, customer="Acme", _=user)
    assert response.status_code == 200
    assert response.media_type == "text/csv"
    csv_text = response.body.decode("utf-8")
    assert "Sale Number,Sale Date,Customer Name" in csv_text
    assert "Acme Steel" in csv_text
    assert "Urgent delivery" in csv_text
    assert "SALE-" in csv_text
    assert "25.00" in csv_text
