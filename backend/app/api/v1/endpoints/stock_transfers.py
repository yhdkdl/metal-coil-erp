from collections import defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from typing import Annotated

from app.api.deps import DbSession, require_roles
from app.models import PieceStatus, ProducedPiece, StockMovement, MovementType, User, UserRole, Warehouse, WarehouseType
from app.schemas.stock_transfer import StockTransferCreate, StockTransferResult, StockTransferSummary

router = APIRouter()


@router.post("/", response_model=StockTransferResult, status_code=status.HTTP_201_CREATED)
def create_stock_transfer(
    payload: StockTransferCreate,
    db: DbSession,
    user: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE))],
):
    if len(set(payload.piece_ids)) != len(payload.piece_ids):
        raise HTTPException(422, "Duplicate piece IDs are not allowed")

    target = db.get(Warehouse, payload.to_warehouse_id)
    if not target:
        raise HTTPException(404, "Target warehouse not found")
    if target.type != WarehouseType.OUTLET:
        raise HTTPException(422, "Target warehouse must be an outlet")

    pieces = list(db.scalars(
        select(ProducedPiece).where(ProducedPiece.id.in_(payload.piece_ids)).with_for_update()
    ))
    by_id = {piece.id: piece for piece in pieces}
    missing = [piece_id for piece_id in payload.piece_ids if piece_id not in by_id]
    if missing:
        raise HTTPException(404, "One or more pieces were not found")

    main_ids = {
        warehouse.id for warehouse in db.scalars(
            select(Warehouse).where(Warehouse.type == WarehouseType.MAIN)
        )
    }
    for piece in pieces:
        if piece.status == PieceStatus.IN_OUTLET:
            raise HTTPException(409, "One or more pieces have already been transferred")
        if piece.status != PieceStatus.IN_MAIN:
            raise HTTPException(422, "Only pieces in the main warehouse can be transferred")
        if piece.current_warehouse_id not in main_ids:
            raise HTTPException(422, "One or more pieces are not in a main warehouse")

    transfer_group_id = uuid4()
    created_at = datetime.now(timezone.utc)
    for piece in pieces:
        from_warehouse_id = piece.current_warehouse_id
        piece.status = PieceStatus.IN_OUTLET
        piece.current_warehouse_id = target.id
        db.add(StockMovement(
            piece_id=piece.id,
            movement_type=MovementType.TRANSFER,
            transfer_group_id=transfer_group_id,
            from_warehouse_id=from_warehouse_id,
            to_warehouse_id=target.id,
            weight_kg=piece.weight_kg,
            note=payload.note,
            created_by_id=user.id,
            created_at=created_at,
        ))
    db.commit()
    return StockTransferResult(
        transfer_group_id=transfer_group_id,
        moved_count=len(pieces),
        pieces=pieces,
    )


@router.get("/", response_model=list[StockTransferSummary])
def list_stock_transfers(
    db: DbSession,
    date_from: datetime | None = Query(default=None, alias="from"),
    date_to: datetime | None = Query(default=None, alias="to"),
    warehouse_id: UUID | None = None,
    _: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE))] = None,
):
    query = select(StockMovement).where(
        StockMovement.movement_type == MovementType.TRANSFER,
        StockMovement.transfer_group_id.is_not(None),
    ).order_by(StockMovement.created_at, StockMovement.id)
    if date_from:
        query = query.where(StockMovement.created_at >= date_from)
    if date_to:
        query = query.where(StockMovement.created_at <= date_to)
    if warehouse_id:
        query = query.where(
            (StockMovement.from_warehouse_id == warehouse_id)
            | (StockMovement.to_warehouse_id == warehouse_id)
        )

    grouped = defaultdict(list)
    for movement in db.scalars(query):
        grouped[movement.transfer_group_id].append(movement)

    return [
        StockTransferSummary(
            transfer_group_id=group_id,
            created_at=movements[0].created_at,
            from_warehouse_id=movements[0].from_warehouse_id,
            to_warehouse_id=movements[0].to_warehouse_id,
            note=movements[0].note,
            piece_count=len(movements),
            total_weight_kg=sum((movement.weight_kg for movement in movements), Decimal("0")),
        )
        for group_id, movements in grouped.items()
    ]
