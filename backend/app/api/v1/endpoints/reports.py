from calendar import monthrange
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select
from typing import Annotated

from app.api.deps import DbSession, require_roles
from app.models import Coil, Payment, PieceStatus, PriceHistory, ProducedPiece, Sale, SaleLineItem, SaleStatus, SaleType, User, UserRole, Warehouse
from app.schemas.report import (
    BulkPriceUpdate, InventoryValuation, InventoryWarehouseValue, PriceHistoryRead,
    ProfitByCoilRow, RevenuePeriod, RevenueReport, SalesBreakdownRow,
)

router = APIRouter()
pricing_router = APIRouter()
MONEY_ZERO = Decimal("0.00")


def _range(from_date: date | None, to_date: date | None) -> tuple[datetime, datetime]:
    f_date = from_date if isinstance(from_date, (date, datetime)) else None
    t_date = to_date if isinstance(to_date, (date, datetime)) else None
    start = datetime.combine(f_date or date.today().replace(day=1), time.min, tzinfo=timezone.utc)
    end_date = t_date or date.today()
    return start, datetime.combine(end_date, time.max, tzinfo=timezone.utc)


def _period_start(value: datetime, granularity: str) -> datetime:
    value = value.astimezone(timezone.utc)
    if granularity == "year":
        return value.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    if granularity == "month":
        return value.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if granularity == "week":
        monday = value - timedelta(days=value.weekday())
        return monday.replace(hour=0, minute=0, second=0, microsecond=0)
    return value.replace(hour=0, minute=0, second=0, microsecond=0)


def _next_period(start: datetime, granularity: str) -> datetime:
    if granularity == "year":
        return start.replace(year=start.year + 1, month=1, day=1)
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
    granularity: str = Query(default="day", pattern="^(day|week|month|year)$"),
    channel: str = Query(default="both", pattern="^(BULK|RETAIL|both)$"),
    warehouse_id: UUID | None = None,
    category: str | None = None,
    customer: str | None = None,
    _: Annotated[User, Depends(require_roles(UserRole.FINANCE))] = None,
):
    start, end = _range(from_date, to_date)
    query = select(
        Sale.id,
        Sale.created_at,
        SaleLineItem.sale_price,
        ProducedPiece.allocated_cost,
    ).join(
        SaleLineItem, SaleLineItem.sale_id == Sale.id
    ).join(
        ProducedPiece, ProducedPiece.id == SaleLineItem.piece_id
    ).where(
        Sale.created_at >= start, Sale.created_at <= end, Sale.status.in_([SaleStatus.COMPLETED, SaleStatus.PARTIAL, SaleStatus.PAID])
    )
    if channel != "both":
        query = query.where(Sale.sale_type == SaleType(channel))
    if warehouse_id:
        query = query.where(Sale.warehouse_id == warehouse_id)
    if isinstance(category, str) and category:
        query = query.where(ProducedPiece.category == category)
    if isinstance(customer, str) and customer:
        query = query.where(Sale.customer_name.ilike(f"%{customer}%"))
    buckets: dict[datetime, dict[str, Decimal | int]] = {}
    for sale_id, created_at, sale_price, allocated_cost in db.execute(query):
        bucket = _period_start(created_at, granularity)
        row = buckets.setdefault(bucket, {"revenue": MONEY_ZERO, "cogs": MONEY_ZERO, "sale_ids": set()})
        row["revenue"] += sale_price
        row["cogs"] += allocated_cost
        row["sale_ids"].add(sale_id)
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
    category: str | None = None,
    customer: str | None = None,
    _: Annotated[User, Depends(require_roles(UserRole.FINANCE))] = None,
):
    start, end = _range(from_date, to_date)
    coils = list(db.scalars(select(Coil).order_by(Coil.coil_number)))
    pieces_query = select(
        ProducedPiece.id,
        ProducedPiece.parent_coil_id,
        ProducedPiece.allocated_cost,
        ProducedPiece.status,
    )
    if isinstance(category, str) and category:
        pieces_query = pieces_query.where(ProducedPiece.category == category)
    
    pieces_by_coil: dict[UUID, list[tuple[UUID, Decimal, PieceStatus]]] = {}
    sold_piece_ids: list[UUID] = []
    for piece_id, parent_coil_id, allocated_cost, status in db.execute(pieces_query):
        pieces_by_coil.setdefault(parent_coil_id, []).append((piece_id, allocated_cost, status))
        if status == PieceStatus.SOLD:
            sold_piece_ids.append(piece_id)

    items_by_piece: dict[UUID, list[Decimal]] = {}
    if sold_piece_ids:
        sold_query = select(SaleLineItem.piece_id, SaleLineItem.sale_price).join(
            Sale, Sale.id == SaleLineItem.sale_id
        ).where(
            SaleLineItem.piece_id.in_(sold_piece_ids),
            Sale.created_at >= start,
            Sale.created_at <= end,
            Sale.status.in_([SaleStatus.COMPLETED, SaleStatus.PARTIAL, SaleStatus.PAID]),
        )
        if isinstance(customer, str) and customer:
            sold_query = sold_query.where(Sale.customer_name.ilike(f"%{customer}%"))
        for piece_id, sale_price in db.execute(sold_query):
            items_by_piece.setdefault(piece_id, []).append(sale_price)

    rows = []
    for coil in coils:
        pieces = pieces_by_coil.get(coil.id, [])
        sold = [p for p in pieces if p[2] == PieceStatus.SOLD and p[0] in items_by_piece]
        revenue = sum((price for p in sold for price in items_by_piece.get(p[0], [])), MONEY_ZERO)
        cogs = sum((p[1] for p in sold), MONEY_ZERO)
        rows.append(ProfitByCoilRow(
            coil_number=coil.coil_number,
            coil_cost=coil.total_cost,
            pieces_sold_count=len(sold),
            pieces_unsold_count=len(pieces) - len(sold),
            revenue=revenue,
            cogs=cogs,
            gross_profit=revenue - cogs
        ))
    return rows


@router.get("/sales-breakdown", response_model=list[SalesBreakdownRow])
def sales_breakdown(
    db: DbSession,
    from_date: date | None = Query(default=None, alias="from"),
    to_date: date | None = Query(default=None, alias="to"),
    category: str | None = None,
    customer: str | None = None,
    channel: SaleType | None = None,
    _: Annotated[User, Depends(require_roles(UserRole.FINANCE))] = None,
):
    start, end = _range(from_date, to_date)
    query = select(
        ProducedPiece.category,
        ProducedPiece.thickness_mm,
        Sale.customer_name,
        Sale.sale_type,
        SaleLineItem.sale_price,
        ProducedPiece.allocated_cost,
    ).join(
        SaleLineItem, SaleLineItem.sale_id == Sale.id
    ).join(
        ProducedPiece, ProducedPiece.id == SaleLineItem.piece_id
    ).where(
        Sale.created_at >= start,
        Sale.created_at <= end,
        Sale.status.in_([SaleStatus.COMPLETED, SaleStatus.PARTIAL, SaleStatus.PAID]),
    )
    if isinstance(category, str) and category:
        query = query.where(ProducedPiece.category == category)
    if isinstance(customer, str) and customer:
        query = query.where(Sale.customer_name.ilike(f"%{customer}%"))
    if channel:
        query = query.where(Sale.sale_type == channel)

    grouped: dict[tuple[str, Decimal, str, str], dict[str, Decimal | int]] = {}
    for cat, thickness, cust, sale_type, sale_price, allocated_cost in db.execute(query):
        type_val = sale_type.value if hasattr(sale_type, "value") else str(sale_type)
        key = (cat, thickness, cust, type_val)
        row = grouped.setdefault(key, {"pieces_sold": 0, "revenue": MONEY_ZERO, "cogs": MONEY_ZERO})
        row["pieces_sold"] += 1
        row["revenue"] += sale_price
        row["cogs"] += allocated_cost

    return [
        SalesBreakdownRow(
            category=category_value,
            thickness_mm=thickness,
            customer=customer_value,
            sale_type=sale_type,
            pieces_sold=int(values["pieces_sold"]),
            revenue=Decimal(values["revenue"]).quantize(Decimal("0.01")),
            cogs=Decimal(values["cogs"]).quantize(Decimal("0.01")),
            gross_profit=Decimal(values["revenue"] - values["cogs"]).quantize(Decimal("0.01")),
        )
        for (category_value, thickness, customer_value, sale_type), values in sorted(grouped.items())
    ]


@router.get("/inventory-valuation", response_model=InventoryValuation)
def inventory_valuation(
    db: DbSession,
    _: Annotated[User, Depends(require_roles(UserRole.FINANCE))] = None,
):
    available = ProducedPiece.status != PieceStatus.SOLD
    rows_query = select(
        Warehouse.id,
        Warehouse.name,
        func.count(ProducedPiece.id),
        func.coalesce(func.sum(ProducedPiece.allocated_cost), MONEY_ZERO),
        func.coalesce(func.sum(func.coalesce(ProducedPiece.selling_price, MONEY_ZERO)), MONEY_ZERO),
    ).join(ProducedPiece, ProducedPiece.current_warehouse_id == Warehouse.id).where(available).group_by(Warehouse.id, Warehouse.name)
    aggregate_query = select(
        func.count(ProducedPiece.id),
        func.coalesce(func.sum(ProducedPiece.allocated_cost), MONEY_ZERO),
        func.coalesce(func.sum(func.coalesce(ProducedPiece.selling_price, MONEY_ZERO)), MONEY_ZERO),
        func.coalesce(func.sum(case((ProducedPiece.selling_price.is_(None), 1), else_=0)), 0),
    ).where(available)
    rows = [
        InventoryWarehouseValue(warehouse_id=warehouse_id, warehouse_name=name, piece_count=count, cost_value=cost_value, list_value=list_value)
        for warehouse_id, name, count, cost_value, list_value in db.execute(rows_query)
    ]
    total_pieces, total_cost, total_list, null_prices = db.execute(aggregate_query).one()
    return InventoryValuation(by_warehouse=rows, total_pieces=total_pieces, total_cost_value=total_cost, total_list_value=total_list, null_price_count=null_prices)


@pricing_router.get("/pieces/{piece_id}/price-history", response_model=list[PriceHistoryRead])
def piece_price_history(piece_id: UUID, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.FINANCE))]):
    if not db.get(ProducedPiece, piece_id):
        raise HTTPException(404, "Piece not found")
    return list(db.scalars(select(PriceHistory).where(PriceHistory.piece_id == piece_id).order_by(PriceHistory.changed_at, PriceHistory.id)))


@pricing_router.post("/pieces/bulk-price-update")
def bulk_price_update(
    payload: BulkPriceUpdate,
    db: DbSession,
    user: Annotated[User, Depends(require_roles(UserRole.FINANCE))],
):
    query = select(ProducedPiece).where(ProducedPiece.status != PieceStatus.SOLD).with_for_update()
    filters = payload.filter.model_dump(exclude_none=True)
    if filters.get("grade"):
        query = query.where(ProducedPiece.grade == filters["grade"])
    if filters.get("category"):
        query = query.where(ProducedPiece.category == filters["category"])
    if filters.get("thickness_mm") is not None:
        query = query.where(ProducedPiece.thickness_mm == filters["thickness_mm"])
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
        if payload.adjustment.type == "set":
            new_price = payload.adjustment.value
        elif payload.adjustment.type == "percent":
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
