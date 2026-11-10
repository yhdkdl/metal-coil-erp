from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api.v1.endpoints.reports import bulk_price_update, inventory_valuation, revenue_report
from app.db.base import Base
from app.models import Coil, CoilStatus, PieceStatus, PriceHistory, ProducedPiece, Sale, SaleStatus, User, UserRole, Warehouse, WarehouseType
from app.schemas.report import BulkPriceUpdate, PriceAdjustment


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def setup_reporting_data(db):
    user = User(email="finance@example.com", hashed_password="x", full_name="Finance", role=UserRole.SALES)
    warehouse = Warehouse(name="Main", type=WarehouseType.MAIN)
    coil = Coil(
        coil_number="REPORT-COIL", heat_number="H-1", supplier="Supplier", grade="S235",
        thickness_mm=Decimal("1"), width_mm=Decimal("1000"), total_weight_kg=Decimal("100"),
        cost_per_kg=Decimal("1"), status=CoilStatus.CONSUMED,
    )
    db.add_all([user, warehouse, coil])
    db.commit()
    pieces = []
    for index, price, piece_status in (
        (1, Decimal("20"), PieceStatus.IN_MAIN),
        (2, Decimal("30"), PieceStatus.IN_MAIN),
        (3, None, PieceStatus.IN_MAIN),
    ):
        piece = ProducedPiece(
            piece_code=f"REPORT-{index:03d}", parent_coil_id=coil.id,
            thickness_mm=Decimal("1"), width_mm=Decimal("100"), length_mm=Decimal("1000"),
            weight_kg=Decimal("10"), grade="S235", category="SHEET",
            allocated_cost=Decimal("10"), selling_price=price, status=piece_status,
            current_warehouse_id=warehouse.id,
        )
        db.add(piece)
        pieces.append(piece)
    db.commit()
    return user, warehouse, coil, pieces


def test_revenue_report_returns_money_and_excludes_cancelled(db):
    user, warehouse, coil, pieces = setup_reporting_data(db)
    now = datetime.now(timezone.utc)
    completed = Sale(
        sale_number="REPORT-SALE-1", customer_name="A", sale_type="BULK",
        warehouse_id=warehouse.id, total_amount=Decimal("20"), status=SaleStatus.COMPLETED,
        created_by_id=user.id, created_at=now,
    )
    cancelled = Sale(
        sale_number="REPORT-SALE-2", customer_name="B", sale_type="BULK",
        warehouse_id=warehouse.id, total_amount=Decimal("30"), status=SaleStatus.CANCELLED,
        created_by_id=user.id, created_at=now,
    )
    db.add_all([completed, cancelled])
    db.commit()
    from app.models import SaleLineItem
    db.add_all([
        SaleLineItem(sale_id=completed.id, piece_id=pieces[0].id, sale_price=Decimal("20")),
        SaleLineItem(sale_id=cancelled.id, piece_id=pieces[1].id, sale_price=Decimal("30")),
    ])
    db.commit()
    report = revenue_report(db, from_date=(now - timedelta(days=1)).date(), to_date=(now + timedelta(days=1)).date(), granularity="day", channel="both", warehouse_id=None, _=user)
    assert report.totals["revenue"] == "20.00"
    assert report.totals["cogs"] == "10.00"
    assert report.totals["gross_profit"] == "10.00"


def test_inventory_valuation_and_percent_price_update(db):
    user, _, _, pieces = setup_reporting_data(db)
    valuation = inventory_valuation(db, _=user)
    assert valuation.total_pieces == 3
    assert valuation.total_cost_value == Decimal("30.00")
    assert valuation.null_price_count == 1

    result = bulk_price_update(
        BulkPriceUpdate(adjustment=PriceAdjustment(type="percent", value=Decimal("5")), reason="Market move"),
        db, user,
    )
    assert result["affected_count"] == 2
    assert result["skipped_count"] == 1
    assert db.query(PriceHistory).count() == 2
    db.refresh(pieces[0])
    assert pieces[0].selling_price == Decimal("21.00")


def test_bulk_price_update_filters_by_thickness_and_sets_exact_price(db):
    user, _, _, pieces = setup_reporting_data(db)
    pieces[1].thickness_mm = Decimal("2")
    db.commit()

    result = bulk_price_update(
        BulkPriceUpdate(
            filter={"category": "SHEET", "grade": "S235", "thickness_mm": "2"},
            adjustment=PriceAdjustment(type="set", value=Decimal("42.50")),
        ),
        db,
        user,
    )

    assert result["affected_count"] == 1
    assert result["skipped_count"] == 0
    db.refresh(pieces[0])
    db.refresh(pieces[1])
    assert pieces[0].selling_price == Decimal("20")
    assert pieces[1].selling_price == Decimal("42.50")
