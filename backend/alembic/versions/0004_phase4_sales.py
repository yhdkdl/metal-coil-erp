"""Extend sales and add payments."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0004_phase4_sales"
down_revision = "0003_phase3_transfers"
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    sale_status = postgresql.ENUM("DRAFT", "COMPLETED", "PARTIAL", "PAID", "CANCELLED", name="sale_status", create_type=False)
    payment_method = postgresql.ENUM("CASH", "BANK_TRANSFER", "CHEQUE", "OTHER", name="payment_method", create_type=False)
    sale_status.create(bind, checkfirst=True)
    payment_method.create(bind, checkfirst=True)
    op.add_column("sales", sa.Column("status", sale_status, nullable=False, server_default="COMPLETED"))
    op.add_column("sales", sa.Column("notes", sa.String(1000), nullable=True))
    op.add_column("sales", sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True))
    op.add_column("sales", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE sales SET created_by_id = (SELECT id FROM users ORDER BY email LIMIT 1) WHERE created_by_id IS NULL")
    op.alter_column("sales", "created_by_id", nullable=False)
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("sale_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sales.id"), nullable=False),
        sa.Column("amount", sa.Numeric(14, 2), nullable=False),
        sa.Column("method", payment_method, nullable=False),
        sa.Column("reference", sa.String(255), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("recorded_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
    )

def downgrade():
    op.drop_table("payments")
    op.drop_column("sales", "completed_at")
    op.drop_column("sales", "created_by_id")
    op.drop_column("sales", "notes")
    op.drop_column("sales", "status")
    op.execute("DROP TYPE IF EXISTS payment_method")
    op.execute("DROP TYPE IF EXISTS sale_status")
