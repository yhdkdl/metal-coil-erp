"""Create Phase 1 ERP foundation tables."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_phase1_foundation"
down_revision = None
branch_labels = None
depends_on = None

def enum(name, *values):
    return postgresql.ENUM(*values, name=name, create_type=False)

def upgrade():
    user_role = enum("user_role", "ADMIN", "PRODUCTION", "WAREHOUSE", "SALES", "FINANCE")
    coil_status = enum("coil_status", "IN_STOCK", "IN_PRODUCTION", "CONSUMED")
    warehouse_type = enum("warehouse_type", "MAIN", "OUTLET")
    piece_status = enum("piece_status", "IN_MAIN", "IN_OUTLET", "SOLD")
    run_status = enum("production_run_status", "OPEN", "COMPLETED")
    movement_type = enum("movement_type", "RECEIPT", "PRODUCTION_OUTPUT", "TRANSFER", "SALE", "ADJUSTMENT")
    sale_type = enum("sale_type", "BULK", "RETAIL")
    for type_ in (user_role, coil_status, warehouse_type, piece_status, run_status, movement_type, sale_type):
        type_.create(op.get_bind(), checkfirst=True)
    op.create_table("users", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("email", sa.String(255), nullable=False, unique=True), sa.Column("hashed_password", sa.String(255), nullable=False), sa.Column("full_name", sa.String(255), nullable=False), sa.Column("role", user_role, nullable=False))
    op.create_index("ix_users_email", "users", ["email"])
    op.create_table("coils", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("coil_number", sa.String(100), nullable=False, unique=True), sa.Column("heat_number", sa.String(100), nullable=False), sa.Column("supplier", sa.String(255), nullable=False), sa.Column("grade", sa.String(100), nullable=False), sa.Column("thickness_mm", sa.Numeric(12, 3), nullable=False), sa.Column("width_mm", sa.Numeric(12, 3), nullable=False), sa.Column("total_weight_kg", sa.Numeric(14, 3), nullable=False), sa.Column("cost_per_kg", sa.Numeric(14, 4), nullable=False), sa.Column("total_cost", sa.Numeric(16, 2), sa.Computed("total_weight_kg * cost_per_kg", persisted=True), nullable=False), sa.Column("status", coil_status, nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_table("warehouses", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("name", sa.String(255), nullable=False, unique=True), sa.Column("type", warehouse_type, nullable=False))
    op.create_table("produced_pieces", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("piece_code", sa.String(100), nullable=False, unique=True), sa.Column("parent_coil_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("coils.id"), nullable=False), sa.Column("thickness_mm", sa.Numeric(12, 3), nullable=False), sa.Column("width_mm", sa.Numeric(12, 3), nullable=False), sa.Column("length_mm", sa.Numeric(12, 3), nullable=False), sa.Column("weight_kg", sa.Numeric(14, 3), nullable=False), sa.Column("grade", sa.String(100), nullable=False), sa.Column("category", sa.String(100), nullable=False), sa.Column("allocated_cost", sa.Numeric(16, 2), nullable=False), sa.Column("selling_price", sa.Numeric(16, 2)), sa.Column("status", piece_status, nullable=False), sa.Column("current_warehouse_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("warehouses.id"), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_table("production_runs", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("coil_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("coils.id"), nullable=False), sa.Column("machine_type", sa.String(100), nullable=False), sa.Column("operator_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False), sa.Column("status", run_status, nullable=False), sa.Column("started_at", sa.DateTime(timezone=True), nullable=False), sa.Column("completed_at", sa.DateTime(timezone=True)))
    op.create_table("stock_movements", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("piece_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("produced_pieces.id")), sa.Column("coil_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("coils.id")), sa.Column("movement_type", movement_type, nullable=False), sa.Column("from_warehouse_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("warehouses.id")), sa.Column("to_warehouse_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("warehouses.id")), sa.Column("weight_kg", sa.Numeric(14, 3), nullable=False), sa.Column("note", sa.String(500)), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False), sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False))
    op.create_table("sales", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("sale_number", sa.String(100), nullable=False, unique=True), sa.Column("customer_name", sa.String(255), nullable=False), sa.Column("sale_type", sale_type, nullable=False), sa.Column("warehouse_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("warehouses.id"), nullable=False), sa.Column("total_amount", sa.Numeric(16, 2), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))
    op.create_table("sale_line_items", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("sale_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sales.id"), nullable=False), sa.Column("piece_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("produced_pieces.id"), nullable=False), sa.Column("sale_price", sa.Numeric(16, 2), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False))

def downgrade():
    for table in ("sale_line_items", "sales", "stock_movements", "production_runs", "produced_pieces", "warehouses", "coils", "users"):
        op.drop_table(table)
    for name in ("sale_type", "movement_type", "production_run_status", "piece_status", "warehouse_type", "coil_status", "user_role"):
        op.execute(sa.text(f"DROP TYPE IF EXISTS {name}"))
