from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from typing import Annotated

from app.api.deps import DbSession, require_roles
from app.models import (
    MovementType, Payment, PieceStatus, ProducedPiece, Sale, SaleLineItem,
    SaleStatus, SaleType, StockMovement, User, UserRole, Warehouse, WarehouseType,
)
from app.schemas.sale import PaymentCreate, PaymentRead, SaleCreate, SaleDetail, SaleLineItemCreate, SaleLineItemRead, SaleRead

router = APIRouter()


def _money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _amount_paid(db, sale_id: UUID) -> Decimal:
    return db.scalar(select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.sale_id == sale_id)) or Decimal("0")


def _sale_detail(db, sale: Sale) -> dict:
    items = list(db.scalars(select(SaleLineItem).where(SaleLineItem.sale_id == sale.id).order_by(SaleLineItem.created_at)))
    payments = list(db.scalars(select(Payment).where(Payment.sale_id == sale.id).order_by(Payment.paid_at)))
    amount_paid = _money(_amount_paid(db, sale.id))
    total = _money(sale.total_amount)
    return {
        **SaleRead.model_validate(sale).model_dump(),
        "line_items": [SaleLineItemRead.model_validate(item) for item in items],
        "payments": payments,
        "amount_paid": amount_paid,
        "amount_due": _money(total - amount_paid),
    }


@router.post("/", response_model=SaleDetail, status_code=status.HTTP_201_CREATED)
def create_sale(
    payload: SaleCreate,
    db: DbSession,
    user: Annotated[User, Depends(require_roles(UserRole.SALES))],
):
    piece_ids = [item.piece_id for item in payload.line_items]
    if len(set(piece_ids)) != len(piece_ids):
        raise HTTPException(422, "Duplicate pieces are not allowed")
    warehouse = db.get(Warehouse, payload.warehouse_id)
    if not warehouse:
        raise HTTPException(404, "Warehouse not found")
    expected_status = PieceStatus.IN_MAIN if payload.sale_type == SaleType.BULK else PieceStatus.IN_OUTLET
    expected_type = WarehouseType.MAIN if payload.sale_type == SaleType.BULK else WarehouseType.OUTLET
    if warehouse.type != expected_type:
        raise HTTPException(422, "Warehouse does not match sale channel")
    pieces = list(db.scalars(select(ProducedPiece).where(ProducedPiece.id.in_(piece_ids)).with_for_update()))
    by_id = {piece.id: piece for piece in pieces}
    if len(by_id) != len(piece_ids):
        raise HTTPException(404, "One or more pieces were not found")
    for item in payload.line_items:
        piece = by_id[item.piece_id]
        if piece.status != expected_status or piece.current_warehouse_id != warehouse.id:
            raise HTTPException(422, "One or more pieces are not available for this sale channel and warehouse")
        if item.sale_price <= 0:
            raise HTTPException(422, "Sale prices must be positive")
        if item.sale_price < piece.min_selling_price:
            raise HTTPException(422, f"Sale price for {piece.piece_code} cannot be below minimum {piece.min_selling_price}")

    total = _money(sum((item.sale_price for item in payload.line_items), Decimal("0")))
    now = datetime.now(timezone.utc)
    sale = Sale(
        sale_number=f"SALE-{now.strftime('%Y%m%d%H%M%S')}-{str(uuid4())[:8].upper()}",
        customer_name=payload.customer_name,
        sale_type=payload.sale_type,
        warehouse_id=warehouse.id,
        total_amount=total,
        status=SaleStatus.COMPLETED,
        notes=payload.notes,
        created_by_id=user.id,
        completed_at=now,
    )
    db.add(sale)
    db.flush()
    for item in payload.line_items:
        piece = by_id[item.piece_id]
        db.add(SaleLineItem(sale_id=sale.id, piece_id=piece.id, sale_price=_money(item.sale_price)))
        db.add(StockMovement(
            piece_id=piece.id, movement_type=MovementType.SALE,
            from_warehouse_id=piece.current_warehouse_id, to_warehouse_id=None,
            weight_kg=piece.weight_kg, note=f"Sale {sale.sale_number}", created_by_id=user.id,
        ))
        piece.status = PieceStatus.SOLD
    db.commit()
    db.refresh(sale)
    return _sale_detail(db, sale)


@router.get("/", response_model=list[SaleRead])
def list_sales(
    db: DbSession,
    date_from: datetime | None = Query(default=None, alias="from"),
    date_to: datetime | None = Query(default=None, alias="to"),
    channel: SaleType | None = None,
    sale_status: SaleStatus | None = Query(default=None, alias="status"),
    customer: str | None = None,
    _: Annotated[User, Depends(require_roles(UserRole.SALES, UserRole.FINANCE))] = None,
):
    query = select(Sale).order_by(Sale.created_at.desc())
    if date_from:
        query = query.where(Sale.created_at >= date_from)
    if date_to:
        query = query.where(Sale.created_at <= date_to)
    if channel:
        query = query.where(Sale.sale_type == channel)
    if sale_status:
        query = query.where(Sale.status == sale_status)
    if customer:
        query = query.where(Sale.customer_name.ilike(f"%{customer}%"))
    return list(db.scalars(query))


@router.post("/{sale_id}/payments", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
def record_payment(
    sale_id: UUID,
    payload: PaymentCreate,
    db: DbSession,
    user: Annotated[User, Depends(require_roles(UserRole.SALES, UserRole.FINANCE))],
):
    sale = db.get(Sale, sale_id, with_for_update=True)
    if not sale:
        raise HTTPException(404, "Sale not found")
    if sale.status in (SaleStatus.PAID, SaleStatus.CANCELLED):
        raise HTTPException(409, "Payments cannot be added to this sale")
    amount_due = _money(sale.total_amount - _amount_paid(db, sale.id))
    if payload.amount > amount_due:
        raise HTTPException(422, "Payment exceeds amount due")
    payment = Payment(sale_id=sale.id, amount=_money(payload.amount), method=payload.method, reference=payload.reference, recorded_by_id=user.id)
    db.add(payment)
    db.flush()
    new_paid = _money(_amount_paid(db, sale.id))
    sale.status = SaleStatus.PAID if new_paid == _money(sale.total_amount) else SaleStatus.PARTIAL
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/payments", response_model=list[PaymentRead])
def list_payments(
    db: DbSession,
    date_from: datetime | None = Query(default=None, alias="from"),
    date_to: datetime | None = Query(default=None, alias="to"),
    method: str | None = None,
    _: Annotated[User, Depends(require_roles(UserRole.SALES, UserRole.FINANCE))] = None,
):
    query = select(Payment).order_by(Payment.paid_at.desc())
    if date_from:
        query = query.where(Payment.paid_at >= date_from)
    if date_to:
        query = query.where(Payment.paid_at <= date_to)
    if method:
        query = query.where(Payment.method == method)
    return list(db.scalars(query))


@router.get("/{sale_id}", response_model=SaleDetail)
def get_sale(sale_id: UUID, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.SALES, UserRole.FINANCE))]):
    sale = db.get(Sale, sale_id)
    if not sale:
        raise HTTPException(404, "Sale not found")
    return _sale_detail(db, sale)


@router.post("/{sale_id}/cancel", response_model=SaleDetail)
def cancel_sale(
    sale_id: UUID,
    db: DbSession,
    _: Annotated[User, Depends(require_roles(UserRole.SALES))],
):
    sale = db.get(Sale, sale_id, with_for_update=True)
    if not sale:
        raise HTTPException(404, "Sale not found")
    if sale.status == SaleStatus.CANCELLED:
        raise HTTPException(409, "Sale is already cancelled")
    if _amount_paid(db, sale.id) > 0:
        raise HTTPException(422, "A sale with payments cannot be cancelled")
    items = list(db.scalars(select(SaleLineItem).where(SaleLineItem.sale_id == sale.id)))
    for item in items:
        piece = db.get(ProducedPiece, item.piece_id, with_for_update=True)
        movement = db.scalar(select(StockMovement).where(
            StockMovement.piece_id == piece.id,
            StockMovement.movement_type == MovementType.SALE,
            StockMovement.note == f"Sale {sale.sale_number}",
        ).order_by(StockMovement.created_at.desc()))
        if not movement or not movement.from_warehouse_id:
            raise HTTPException(422, "Sale restoration data is unavailable")
        piece.status = PieceStatus.IN_MAIN if sale.sale_type == SaleType.BULK else PieceStatus.IN_OUTLET
        piece.current_warehouse_id = movement.from_warehouse_id
    sale.status = SaleStatus.CANCELLED
    db.commit()
    db.refresh(sale)
    return _sale_detail(db, sale)
