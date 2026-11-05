"""Add minimum selling price."""
from alembic import op
import sqlalchemy as sa

revision = "0006_audit_remediation"
down_revision = "0005_phase5_reporting"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("produced_pieces", sa.Column("min_selling_price", sa.Numeric(16, 2), nullable=True))
    op.execute("UPDATE produced_pieces SET min_selling_price = allocated_cost WHERE min_selling_price IS NULL")
    op.alter_column("produced_pieces", "min_selling_price", nullable=False)


def downgrade():
    op.drop_column("produced_pieces", "min_selling_price")
