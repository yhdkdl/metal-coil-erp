"""Add transfer group correlation to stock movements."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003_phase3_transfers"
down_revision = "0002_phase2_production_outputs"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "stock_movements",
        sa.Column("transfer_group_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index(
        "ix_stock_movements_transfer_group_id",
        "stock_movements",
        ["transfer_group_id"],
    )


def downgrade():
    op.drop_index("ix_stock_movements_transfer_group_id", table_name="stock_movements")
    op.drop_column("stock_movements", "transfer_group_id")
