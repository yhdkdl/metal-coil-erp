"""Add price history."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0005_phase5_reporting"
down_revision = "0004_phase4_sales"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "price_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("piece_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("produced_pieces.id"), nullable=False),
        sa.Column("old_price", sa.Numeric(14, 2), nullable=True),
        sa.Column("new_price", sa.Numeric(14, 2), nullable=False),
        sa.Column("changed_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.Column("changed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade():
    op.drop_table("price_history")
