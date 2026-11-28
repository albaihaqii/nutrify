"""create advice_rules: admin-edited actions of the fallback advice rules

Revision ID: c3a81f5d2b60
Revises: 5b7e0c91a4d2
Create Date: 2026-11-28 08:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'c3a81f5d2b60'
down_revision = '5b7e0c91a4d2'
branch_labels = None
depends_on = None

# Same definitions as app/models/types.py.
BIGINT_ID = (
    sa.BigInteger()
    .with_variant(mysql.BIGINT(unsigned=True), 'mysql')
    .with_variant(sa.Integer(), 'sqlite')
)
DATETIME_MS = sa.DateTime().with_variant(mysql.DATETIME(fsp=3), 'mysql')


def upgrade():
    op.create_table('advice_rules',
    sa.Column('code', sa.String(length=50), nullable=False),
    sa.Column('suggested_actions', sa.JSON(), nullable=False),
    sa.Column('updated_at', DATETIME_MS, nullable=False),
    sa.Column('updated_by', BIGINT_ID, nullable=True),
    sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('code')
    )


def downgrade():
    op.drop_table('advice_rules')
