"""Add indexes for frequent list and reporting queries."""
from alembic import op

revision = "0007_query_indexes"
down_revision = "0006_audit_remediation"
branch_labels = None
depends_on = None


def upgrade():
    op.create_index("ix_coils_status_created_at", "coils", ["status", "created_at"])
    op.create_index("ix_produced_pieces_status_warehouse", "produced_pieces", ["status", "current_warehouse_id"])
    op.create_index("ix_produced_pieces_coil_created_at", "produced_pieces", ["parent_coil_id", "created_at"])
    op.create_index("ix_produced_pieces_run", "produced_pieces", ["production_run_id"])
    op.create_index("ix_production_runs_status_started_at", "production_runs", ["status", "started_at"])
    op.create_index("ix_sales_status_created_at", "sales", ["status", "created_at"])
    op.create_index("ix_sales_type_created_at", "sales", ["sale_type", "created_at"])
    op.create_index("ix_sale_line_items_piece", "sale_line_items", ["piece_id"])
    op.create_index("ix_stock_movements_piece_created_at", "stock_movements", ["piece_id", "created_at"])


def downgrade():
    op.drop_index("ix_stock_movements_piece_created_at", table_name="stock_movements")
    op.drop_index("ix_sale_line_items_piece", table_name="sale_line_items")
    op.drop_index("ix_sales_type_created_at", table_name="sales")
    op.drop_index("ix_sales_status_created_at", table_name="sales")
    op.drop_index("ix_production_runs_status_started_at", table_name="production_runs")
    op.drop_index("ix_produced_pieces_run", table_name="produced_pieces")
    op.drop_index("ix_produced_pieces_coil_created_at", table_name="produced_pieces")
    op.drop_index("ix_produced_pieces_status_warehouse", table_name="produced_pieces")
    op.drop_index("ix_coils_status_created_at", table_name="coils")
