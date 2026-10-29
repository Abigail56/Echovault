"""attachments: office documents and the 'unsupported' extraction status

Revision ID: 7c1e2a9b4d10
Revises: 5521fecd08fc
Create Date: 2026-10-29 20:30:00

"""
from typing import Sequence, Union

from alembic import op

revision: str = "7c1e2a9b4d10"
down_revision: Union[str, Sequence[str], None] = "5521fecd08fc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_attachments_kind", "attachments", type_="check")
    op.create_check_constraint("ck_attachments_kind", "attachments", "kind IN ('image', 'pdf', 'text', 'document')")
    op.drop_constraint("ck_attachments_extraction_status", "attachments", type_="check")
    op.create_check_constraint(
        "ck_attachments_extraction_status",
        "attachments",
        "extraction_status IN ('pending', 'done', 'failed', 'unavailable', 'unsupported')",
    )


def downgrade() -> None:
    # Rows using the new values must go before the narrower rules can return.
    op.execute("DELETE FROM attachments WHERE kind = 'document' OR extraction_status = 'unsupported'")
    op.drop_constraint("ck_attachments_extraction_status", "attachments", type_="check")
    op.create_check_constraint(
        "ck_attachments_extraction_status", "attachments", "extraction_status IN ('pending', 'done', 'failed', 'unavailable')"
    )
    op.drop_constraint("ck_attachments_kind", "attachments", type_="check")
    op.create_check_constraint("ck_attachments_kind", "attachments", "kind IN ('image', 'pdf', 'text')")
