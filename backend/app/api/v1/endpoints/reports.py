from calendar import monthrange
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from typing import Annotated

from app.api.deps import DbSession, require_roles
from app.models import Coil, Payment, PieceStatus, PriceHistory, ProducedPiece, Sale, SaleLineItem, SaleStatus, SaleType, User, UserRole, Warehouse
from app.schemas.report import (
    BulkPriceUpdate, InventoryValuation, InventoryWarehouseValue, PriceHistoryRead,
    ProfitByCoilRow, RevenuePeriod, RevenueReport,
)

router = APIRouter()
pricing_router = APIRouter()
MONEY_ZERO = Decimal("0.00")


def _range(from_date: date | None, to_date: date | None) -> tuple[datetime, datetime]:
    start = datetime.combine(from_date or date.today().replace(day=1), time.min, tzinfo=timezone.utc)
    end_date = to_date or date.today()
    return start, datetime.combine(end_date, time.max, tzinfo=timezone.utc)


def _period_start(value: datetime, granularity: str) -> datetime:
    value = value.astimezone(timezone.utc)
    if granularity == "month":
        return value.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if granularity == "week":
        monday = value - timedelta(days=value.weekday())
        return monday.replace(hour=0, minute=0, second=0, microsecond=0)
    return value.replace(hour=0, minute=0, second=0, microsecond=0)


def _next_period(start: datetime, granularity: str) -> datetime:
    if granularity == "month":
        year = start.year + (1 if start.month == 12 else 0)
        month = 1 if start.month == 12 else start.month + 1
        return start.replace(year=year, month=month, day=1)
    return start + timedelta(days=7 if granularity == "week" else 1)


@router.get("/revenue", response_model=RevenueReport)
def revenue_report(
    db: DbSession,
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    granularity: str = Query(default="day", pattern="^(day|week|month)$"),
    channel: str = Query(default="both", pattern="^(BULK|RETAIL|both)$"),
    warehouse_id: UUID | None = None,
    _: Annotated[User, Depends(require_roles(UserRole.FINANCE))] = None,
):
    start, end = _range(from_date, to_date)
    query = select(Sale, SaleLineItem, ProducedPiece).join(SaleLineItem, SaleLineItem.sale_id == Sale.id).join(ProducedPiece, ProducedPiece.id == SaleLineItem.piece_id).where(
        Sale.created_at >= start, Sale.created_at <= end, Sale.status.in_([SaleStatus.COMPLETED, SaleStatus.PARTIAL, SaleStatus.PAID])
    )
    if channel != "both":
        query = query.where(Sale.sale_type == SaleType(channel))
    if warehouse_id:
        query = query.where(Sale.warehouse_id == warehouse_id)
    buckets: dict[datetime, dict[str, Decimal | int]] = {}
    for sale, item, piece in db.execute(query):
        bucket = _period_start(sale.created_at, granularity)
        row = buckets.setdefault(bucket, {"revenue": MONEY_ZERO, "cogs": MONEY_ZERO, "sale_ids": set()})
        row["revenue"] += item.sale_price
        row["cogs"] += piece.allocated_cost
        row["sale_ids"].add(sale.id)
    periods = []
    cursor = _period_start(start, granularity)
    last = _period_start(end, granularity)
    while cursor <= last:
        row = buckets.get(cursor, {"revenue": MONEY_ZERO, "cogs": MONEY_ZERO, "sale_ids": set()})
        revenue = Decimal(row["revenue"]).quantize(Decimal("0.01"))
        cogs = Decimal(row["cogs"]).quantize(Decimal("0.01"))
        periods.append(RevenuePeriod(start=cursor, end=min(_next_period(cursor, granularity) - timedelta(microseconds=1), end), revenue=revenue, cogs=cogs, gross_profit=revenue - cogs, sale_count=len(row["sale_ids"])))
        cursor = _next_period(cursor, granularity)
    total_revenue = sum((period.revenue for period in periods), MONEY_ZERO)
    total_cogs = sum((period.cogs for period in periods), MONEY_ZERO)
    return RevenueReport(periods=periods, totals={"revenue": str(total_revenue), "cogs": str(total_cogs), "gross_profit": str(total_revenue - total_cogs)})


@router.get("/profit-by-coil", response_model=list[ProfitByCoilRow])
def profit_by_coil(
    db: DbSession,
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    _: Annotated[User, Depends(require_roles(UserRole.FINANCE))] = None,
):
    start, end = _range(from_date, to_date)
    coils = list(db.scalars(select(Coil).order_by(Coil.coil_number)))
    rows = []
    for coil in coils:
        pieces = list(db.scalars(select(ProducedPiece).where(ProducedPiece.parent_coil_id == coil.id)))
        sold = [piece for piece in pieces if piece.status == PieceStatus.SOLD]
        sold_items = list(db.scalars(select(SaleLineItem).join(Sale).where(SaleLineItem.piece_id.in_([piece.id for piece in sold]), Sale.created_at >= start, Sale.created_at <= end, Sale.status.in_([SaleStatus.COMPLETED, SaleStatus.PARTIAL, SaleStatus.PAID])))) if sold else []
        revenue = sum((item.sale_price for item in sold_items), MONEY_ZERO)
        cogs = sum((piece.allocated_cost for piece in sold if any(item.piece_id == piece.id for item in sold_items)), MONEY_ZERO)
        rows.append(ProfitByCoilRow(coil_number=coil.coil_number, coil_cost=coil.total_cost, pieces_sold_count=len(sold), pieces_unsold_count=len(pieces) - len(sold), revenue=revenue, cogs=cogs, gross_profit=revenue - cogs))
    return rows


@router.get("/inventory-valuation", response_model=InventoryValuation)
def inventory_valuation(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(UserRole.FINANCE))] = None,
):
    pieces = list(db.scalars(select(ProducedPiece).where(ProducedPiece.status != PieceStatus.SOLD)))
    warehouses = {warehouse.id: warehouse for warehouse in db.scalars(select(Warehouse))}
    grouped: dict[UUID, list[ProducedPiece]] = {}
    for piece in pieces:
        grouped.setdefault(piece.current_warehouse_id, []).append(piece)
    rows = []
    for warehouse_id, items in grouped.items():
        warehouse = warehouses[warehouse_id]
        rows.append(InventoryWarehouseValue(warehouse_id=warehouse_id, warehouse_name=warehouse.name, piece_count=len(items), cost_value=sum((item.allocated_cost for item in items), MONEY_ZERO), list_value=sum((item.selling_price or MONEY_ZERO for item in items), MONEY_ZERO)))
    return InventoryValuation(by_warehouse=rows, total_pieces=len(pieces), total_cost_value=sum((item.allocated_cost for item in pieces), MONEY_ZERO), total_list_value=sum((item.selling_price or MONEY_ZERO for item in pieces), MONEY_ZERO), null_price_count=sum(item.selling_price is None for item in pieces))


@pricing_router.get("/pieces/{piece_id}/price-history", response_model=list[PriceHistoryRead])
def piece_price_history(piece_id: UUID, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.FINANCE, UserRole.SALES))]):
    if not db.get(ProducedPiece, piece_id):
        raise HTTPException(404, "Piece not found")
    return list(db.scalars(select(PriceHistory).where(PriceHistory.piece_id == piece_id).order_by(PriceHistory.changed_at, PriceHistory.id)))


@pricing_router.post("/pieces/bulk-price-update")
def bulk_price_update(
    payload: BulkPriceUpdate,
    db: DbSession,
    user: Annotated[User, Depends(require_roles(UserRole.SALES))],
):
    query = select(ProducedPiece).where(ProducedPiece.status != PieceStatus.SOLD).with_for_update()
    filters = payload.filter
    if filters.get("grade"):
        query = query.where(ProducedPiece.grade == filters["grade"])
    if filters.get("category"):
        query = query.where(ProducedPiece.category == filters["category"])
    if filters.get("warehouse_id"):
        query = query.where(ProducedPiece.current_warehouse_id == filters["warehouse_id"])
    pieces = list(db.scalars(query))
    affected = []
    skipped = 0
    for piece in pieces:
        if payload.adjustment.type == "percent" and piece.selling_price is None:
            skipped += 1
            continue
        old_price = piece.selling_price
        if payload.adjustment.type == "percent":
            new_price = (old_price * (Decimal("1") + payload.adjustment.value / Decimal("100"))).quantize(Decimal("0.01"))
        else:
            new_price = (old_price or MONEY_ZERO) + payload.adjustment.value
        if new_price <= 0:
            raise HTTPException(422, "Price update would produce a non-positive price")
        if new_price < piece.min_selling_price:
            raise HTTPException(422, f"Price update for {piece.piece_code} would fall below minimum {piece.min_selling_price}")
        piece.selling_price = new_price
        db.add(PriceHistory(piece_id=piece.id, old_price=old_price, new_price=new_price, changed_by_id=user.id, reason=payload.reason))
        affected.append(piece)
    db.commit()
    return {"affected_count": len(affected), "pieces": affected, "skipped_count": skipped}
