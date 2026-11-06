from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from app.api.deps import DbSession, require_roles
from app.api.deps import get_current_user
from fastapi import Depends
from typing import Annotated
from app.models.user import User, UserRole
from app.schemas.piece import PieceRead
from app.schemas.report import PriceUpdate
from app.models.piece import ProducedPiece
from app.models.stock_movement import StockMovement
from app.models.coil import Coil
from app.models.production_run import ProductionRun
from app.schemas.coil import CoilRead
from app.schemas.production_run import ProductionRunRead
from app.schemas.stock_movement import StockMovementRead

router = APIRouter()
@router.get("/", response_model=list[PieceRead])
def list_pieces(db: DbSession, status=None, coil_id=None, warehouse_id=None, q=None, category=None, _: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE, UserRole.PRODUCTION, UserRole.SALES, UserRole.FINANCE))] = None):
    query = select(ProducedPiece).order_by(ProducedPiece.created_at.desc())
    if status: query = query.where(ProducedPiece.status == status)
    if coil_id: query = query.where(ProducedPiece.parent_coil_id == coil_id)
    if warehouse_id: query = query.where(ProducedPiece.current_warehouse_id == warehouse_id)
    if q: query = query.where(ProducedPiece.piece_code.ilike(f"%{q}%"))
    if category: query = query.where(ProducedPiece.category == category)
    return list(db.scalars(query))

@router.get("/{piece_id}", response_model=PieceRead)
def get_piece(piece_id, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE, UserRole.PRODUCTION, UserRole.SALES, UserRole.FINANCE))]):
    piece = db.get(ProducedPiece, piece_id)
    if not piece:
        raise HTTPException(404, "Piece not found")
    return piece

@router.get("/{piece_id}/trace")
def trace_piece(piece_id, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE, UserRole.PRODUCTION, UserRole.SALES, UserRole.FINANCE))]):
    piece = db.get(ProducedPiece, piece_id)
    if not piece:
        raise HTTPException(404, "Piece not found")
    movements = list(db.scalars(select(StockMovement).where(StockMovement.piece_id == piece.id).order_by(StockMovement.created_at)))
    run = db.get(ProductionRun, piece.production_run_id) if piece.production_run_id else None
    coil = db.get(Coil, piece.parent_coil_id)
    return {
        "piece": PieceRead.model_validate(piece),
        "parent_coil": CoilRead.model_validate(coil) if coil else None,
        "production_run": ProductionRunRead.model_validate(run) if run else None,
        "movements": [StockMovementRead.model_validate(m) for m in movements],
    }

@router.get("/{piece_id}/movements", response_model=list[StockMovementRead])
def piece_movements(piece_id, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE, UserRole.PRODUCTION, UserRole.SALES, UserRole.FINANCE))]):
    if not db.get(ProducedPiece, piece_id):
        raise HTTPException(404, "Piece not found")
    movements = select(StockMovement).where(
        StockMovement.piece_id == piece_id
    ).order_by(StockMovement.created_at, StockMovement.id)
    return list(db.scalars(movements))

@router.patch("/{piece_id}/price", response_model=PieceRead)
def update_piece_price(piece_id, payload: PriceUpdate, db: DbSession, user: Annotated[User, Depends(require_roles(UserRole.FINANCE))]):
    piece = db.get(ProducedPiece, piece_id)
    if not piece:
        raise HTTPException(404, "Piece not found")
    if piece.status.value == "SOLD":
        raise HTTPException(409, "Sold piece prices cannot be changed")
    if payload.selling_price < piece.min_selling_price:
        raise HTTPException(422, f"Selling price cannot be below minimum {piece.min_selling_price}")
    from app.models.price_history import PriceHistory
    old_price = piece.selling_price
    piece.selling_price = payload.selling_price
    db.add(PriceHistory(piece_id=piece.id, old_price=old_price, new_price=payload.selling_price, changed_by_id=user.id, reason=payload.reason))
    db.commit()
    db.refresh(piece)
    return piece
