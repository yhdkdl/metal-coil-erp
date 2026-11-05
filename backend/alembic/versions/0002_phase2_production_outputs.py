"""Add production run output tracking."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002_phase2_production_outputs"
down_revision = "0001_phase1_foundation"
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE production_run_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS'")
        op.execute("ALTER TYPE production_run_status ADD VALUE IF NOT EXISTS 'CANCELLED'")
        uuid_type = postgresql.UUID(as_uuid=True)
    else:
        uuid_type = sa.String(36)
    op.add_column("produced_pieces", sa.Column("production_run_id", uuid_type, sa.ForeignKey("production_runs.id"), nullable=True))
    op.create_table(
        "production_run_outputs",
        sa.Column("id", uuid_type, primary_key=True),
        sa.Column("production_run_id", uuid_type, sa.ForeignKey("production_runs.id"), nullable=False),
        sa.Column("thickness_mm", sa.Numeric(12, 3), nullable=False),
        sa.Column("width_mm", sa.Numeric(12, 3), nullable=False),
        sa.Column("length_mm", sa.Numeric(12, 3), nullable=False),
        sa.Column("weight_kg", sa.Numeric(14, 3), nullable=False),
        sa.Column("grade", sa.String(100), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_production_run_outputs_production_run_id", "production_run_outputs", ["production_run_id"])

def downgrade():
    op.drop_index("ix_production_run_outputs_production_run_id", table_name="production_run_outputs")
    op.drop_table("production_run_outputs")
    op.drop_column("produced_pieces", "production_run_id")
