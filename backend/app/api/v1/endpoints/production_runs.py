from datetime import datetime, timezone
from decimal import Decimal
from decimal import ROUND_HALF_UP
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from typing import Annotated
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.production_run import ProductionRunCreate, ProductionRunDetail, ProductionRunOutputCreate, ProductionRunOutputRead, ProductionRunRead, ProductionRunUpdate
from app.schemas.piece import PieceRead
from app.models import Coil, CoilStatus, ProducedPiece, PieceStatus, ProductionRun, ProductionRunOutput, ProductionRunStatus, StockMovement, MovementType, Warehouse, WarehouseType
from app.models.user import UserRole
from app.api.deps import DbSession, require_roles
router = APIRouter()

@router.get("/", response_model=list[ProductionRunRead])
def list_production_runs(db: DbSession, status: ProductionRunStatus | None = None, coil_id=None, _: Annotated[User, Depends(require_roles(UserRole.PRODUCTION))] = None):
    query = select(ProductionRun).order_by(ProductionRun.started_at.desc())
    if status: query = query.where(ProductionRun.status == status)
    if coil_id: query = query.where(ProductionRun.coil_id == coil_id)
    return list(db.scalars(query))

@router.get("/{run_id}", response_model=ProductionRunDetail)
def get_production_run(run_id, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.PRODUCTION, UserRole.WAREHOUSE, UserRole.SALES, UserRole.FINANCE))]):
    run = db.get(ProductionRun, run_id)
    if not run:
        raise HTTPException(404, "Production run not found")
    outputs = list(db.scalars(select(ProductionRunOutput).where(ProductionRunOutput.production_run_id == run.id).order_by(ProductionRunOutput.created_at)))
    return {**ProductionRunRead.model_validate(run).model_dump(), "outputs": outputs,
            "total_output_weight_kg": sum((o.weight_kg for o in outputs), Decimal("0"))}

@router.patch("/{run_id}", response_model=ProductionRunRead)
def update_production_run(run_id, payload: ProductionRunUpdate, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.PRODUCTION))]):
    run = db.get(ProductionRun, run_id)
    if not run:
        raise HTTPException(404, "Production run not found")
    if run.status in (ProductionRunStatus.COMPLETED, ProductionRunStatus.CANCELLED):
        raise HTTPException(409, "Production run is closed")
    if payload.machine_type is not None:
        run.machine_type = payload.machine_type
    db.commit(); db.refresh(run)
    return run

@router.post("/", response_model=ProductionRunRead, status_code=status.HTTP_201_CREATED)
def create_production_run(payload: ProductionRunCreate, db: DbSession, user: Annotated[User, Depends(require_roles(UserRole.PRODUCTION))]):
    coil = db.get(Coil, payload.coil_id)
    if not coil:
        raise HTTPException(404, "Coil not found")
    if coil.status != CoilStatus.IN_STOCK:
        raise HTTPException(422, "Coil is not available for production")
    coil.status = CoilStatus.IN_PRODUCTION
    run = ProductionRun(coil_id=coil.id, machine_type=payload.machine_type, operator_id=user.id,
                        status=ProductionRunStatus.OPEN, started_at=datetime.now(timezone.utc))
    db.add(run); db.commit(); db.refresh(run)
    return run

@router.post("/{run_id}/outputs", response_model=ProductionRunOutputRead, status_code=status.HTTP_201_CREATED)
@router.post("/{run_id}/output", response_model=ProductionRunOutputRead, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def add_output(run_id, payload: ProductionRunOutputCreate, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.PRODUCTION))]):
    run = db.get(ProductionRun, run_id)
    if not run or run.status in (ProductionRunStatus.COMPLETED, ProductionRunStatus.CANCELLED):
        raise HTTPException(409, "Production run is not open")
    coil = db.get(Coil, run.coil_id)
    total = db.scalar(select(func.coalesce(func.sum(ProductionRunOutput.weight_kg), 0)).where(
        ProductionRunOutput.production_run_id == run.id
    )) or Decimal("0")
    limit = coil.total_weight_kg * Decimal("1.005")
    if total + payload.weight_kg > limit:
        raise HTTPException(422, "Output weight exceeds source coil weight")
    values = payload.model_dump()
    quantity = values.pop("quantity", 1)
    if total + (values["weight_kg"] * quantity) > limit:
        raise HTTPException(422, "Output quantity exceeds source coil weight")
    outputs = []
    for _ in range(quantity):
        output = ProductionRunOutput(production_run_id=run.id, created_at=datetime.now(timezone.utc), **values)
        db.add(output)
        outputs.append(output)
    db.commit()
    db.refresh(outputs[0])
    return outputs[0]

@router.delete("/{run_id}/outputs/{output_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_output(run_id, output_id, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.PRODUCTION))]):
    output = db.scalar(select(ProductionRunOutput).where(
        ProductionRunOutput.id == output_id, ProductionRunOutput.production_run_id == run_id
    ))
    if not output:
        raise HTTPException(404, "Staged output not found")
    run = db.get(ProductionRun, run_id)
    if not run or run.status != ProductionRunStatus.OPEN:
        raise HTTPException(409, "Production run is not open")
    db.delete(output)
    db.commit()

@router.post("/{run_id}/complete", response_model=list[PieceRead])
def complete_production_run(run_id, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.PRODUCTION))]):
    run = db.get(ProductionRun, run_id)
    if not run or run.status in (ProductionRunStatus.COMPLETED, ProductionRunStatus.CANCELLED):
        raise HTTPException(409, "Production run is not open")
    run_coil = db.get(Coil, run.coil_id)
    outputs = list(db.scalars(select(ProductionRunOutput).where(
        ProductionRunOutput.production_run_id == run.id
    ).order_by(ProductionRunOutput.created_at, ProductionRunOutput.id)))
    output_weight = sum((item.weight_kg for item in outputs), Decimal("0"))
    if not outputs:
        raise HTTPException(422, "At least one output is required")
    if output_weight > run_coil.total_weight_kg * Decimal("1.005"):
        raise HTTPException(422, "Output weight exceeds source coil weight")
    warehouse = db.scalar(select(Warehouse).where(Warehouse.type == WarehouseType.MAIN))
    if not warehouse:
        raise HTTPException(422, "Main warehouse is required")
    existing = list(db.scalars(select(ProducedPiece.piece_code).where(ProducedPiece.parent_coil_id == run.coil_id)))
    prefix = f"{run_coil.coil_number}-"
    seq = max([int(m.group(1)) for code in existing
               if (m := re.fullmatch(re.escape(prefix) + r"(\d{3})", code))], default=0)
    created = []
    for index, item in enumerate(outputs, 1):
        seq += 1
        piece = ProducedPiece(
            piece_code=f"{run_coil.coil_number}-{seq:03d}",
            production_run_id=run.id,
            parent_coil_id=run.coil_id,
            thickness_mm=item.thickness_mm, width_mm=item.width_mm, length_mm=item.length_mm,
            weight_kg=item.weight_kg, grade=item.grade, category=item.category,
            allocated_cost=(item.weight_kg * run_coil.cost_per_kg).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            min_selling_price=(item.weight_kg * run_coil.cost_per_kg).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
            status=PieceStatus.IN_MAIN, current_warehouse_id=warehouse.id,
        )
        db.add(piece); db.flush()
        created.append(piece)
        db.add(StockMovement(
            piece_id=piece.id, coil_id=run.coil_id, movement_type=MovementType.PRODUCTION_OUTPUT,
            to_warehouse_id=warehouse.id, weight_kg=item.weight_kg,
            note=f"Production run {run.id}", created_by_id=run.operator_id,
        ))
    for item in outputs:
        db.delete(item)
    run.status = ProductionRunStatus.COMPLETED
    run.completed_at = datetime.now(timezone.utc)
    run_coil.status = CoilStatus.CONSUMED
    db.commit()
    return created

@router.post("/{run_id}/cancel", response_model=ProductionRunRead)
def cancel_production_run(run_id, db: DbSession, _: Annotated[User, Depends(require_roles(UserRole.PRODUCTION))]):
    run = db.get(ProductionRun, run_id)
    if not run or run.status in (ProductionRunStatus.COMPLETED, ProductionRunStatus.CANCELLED):
        raise HTTPException(409, "Production run is not open")
    run.status = ProductionRunStatus.CANCELLED
    run.completed_at = datetime.now(timezone.utc)
    coil = db.get(Coil, run.coil_id); coil.status = CoilStatus.IN_STOCK
    for item in db.scalars(select(ProductionRunOutput).where(ProductionRunOutput.production_run_id == run.id)):
        db.delete(item)
    db.commit(); db.refresh(run)
    return run
