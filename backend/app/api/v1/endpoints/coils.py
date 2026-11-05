from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated
from sqlalchemy import func, select
from app.api.deps import DbSession, get_current_user
from app.models.coil import Coil, CoilStatus
from app.schemas.coil import CoilCreate, CoilDetail, CoilRead, CoilUpdate
from app.models.piece import ProducedPiece
from app.models.user import User, UserRole
from app.models.stock_movement import StockMovement, MovementType
from app.models.warehouse import Warehouse, WarehouseType
from app.api.deps import require_roles

router = APIRouter()
@router.get("/", response_model=list[CoilRead])
def list_coils(db: DbSession, status: CoilStatus | None = None, q: str | None = None, _: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE, UserRole.PRODUCTION, UserRole.FINANCE))] = None):
    query = select(Coil).order_by(Coil.created_at.desc())
    if status:
        query = query.where(Coil.status == status)
    if q:
        query = query.where((Coil.coil_number.ilike(f"%{q}%")) | (Coil.heat_number.ilike(f"%{q}%")))
    return list(db.scalars(query))

@router.get("/{coil_id}", response_model=CoilDetail)
def get_coil(coil_id, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE, UserRole.PRODUCTION, UserRole.SALES, UserRole.FINANCE))]):
    coil = db.get(Coil, coil_id)
    if not coil:
        raise HTTPException(404, "Coil not found")
    pieces = list(db.scalars(select(ProducedPiece).where(ProducedPiece.parent_coil_id == coil.id).order_by(ProducedPiece.created_at)))
    return {
        **CoilRead.model_validate(coil).model_dump(),
        "pieces": pieces,
        "piece_count": len(pieces),
        "produced_weight_kg": sum((p.weight_kg for p in pieces), Decimal("0")),
        "produced_value": sum((p.allocated_cost for p in pieces), Decimal("0")),
    }

@router.post("/", response_model=CoilRead, status_code=status.HTTP_201_CREATED)
def create_coil(payload: CoilCreate, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE))]):
    if db.scalar(select(Coil).where(Coil.coil_number == payload.coil_number)):
        raise HTTPException(409, "Coil number already exists")
    coil = Coil(**payload.model_dump(), status=CoilStatus.IN_STOCK)
    db.add(coil); db.flush()
    main = db.scalar(select(Warehouse).where(Warehouse.type == WarehouseType.MAIN))
    if not main:
        raise HTTPException(422, "Main warehouse is required")
    db.add(StockMovement(coil_id=coil.id, movement_type=MovementType.RECEIPT, to_warehouse_id=main.id,
                         weight_kg=coil.total_weight_kg, note="Coil receipt", created_by_id=_.id))
    db.commit(); db.refresh(coil)
    return coil

@router.patch("/{coil_id}", response_model=CoilRead)
@router.put("/{coil_id}", response_model=CoilRead, include_in_schema=False)
def update_coil(coil_id, payload: CoilUpdate, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE))]):
    coil = db.get(Coil, coil_id)
    if not coil:
        raise HTTPException(404, "Coil not found")
    if db.scalar(select(ProducedPiece.id).where(ProducedPiece.parent_coil_id == coil.id)):
        if payload.model_dump(exclude_unset=True).keys() - {"supplier", "grade", "status"}:
            raise HTTPException(409, "Coil dimensions and cost cannot be changed after production")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(coil, key, value)
    db.commit(); db.refresh(coil)
    return coil

@router.delete("/{coil_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_coil(coil_id, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.WAREHOUSE))]):
    coil = db.get(Coil, coil_id)
    if not coil:
        raise HTTPException(404, "Coil not found")
    if coil.status != CoilStatus.IN_STOCK:
        raise HTTPException(409, "Only coils in stock can be deleted")
    db.delete(coil); db.commit()
