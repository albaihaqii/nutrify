"""store observations: nullable colours, no_plant status, roi_config on captures

Revision ID: 5b7e0c91a4d2
Revises: dfff3ef27beb
Create Date: 2026-11-27 07:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '5b7e0c91a4d2'
down_revision = 'dfff3ef27beb'
branch_labels = None
depends_on = None

OLD_QC = sa.Enum('ok', 'invalid_leaf', 'stale_sensor', 'needs_check', name='qc_status')
NEW_QC = sa.Enum('ok', 'invalid_leaf', 'no_plant', 'stale_sensor', 'needs_check', name='qc_status')
COLOURS = ('mean_r', 'mean_g', 'mean_b')


def upgrade():
    with op.batch_alter_table('observations', schema=None) as batch_op:
        for name in COLOURS:
            batch_op.alter_column(name, existing_type=sa.Numeric(precision=6, scale=2), nullable=True)
        batch_op.alter_column('qc_status', existing_type=OLD_QC, type_=NEW_QC, existing_nullable=False)

    with op.batch_alter_table('captures', schema=None) as batch_op:
        batch_op.add_column(sa.Column('roi_config', sa.JSON(), nullable=False))


def downgrade():
    with op.batch_alter_table('captures', schema=None) as batch_op:
        batch_op.drop_column('roi_config')

    # Rows without colours or with the new status cannot exist in the old schema.
    op.execute("DELETE FROM observations WHERE mean_r IS NULL OR qc_status = 'no_plant'")
    with op.batch_alter_table('observations', schema=None) as batch_op:
        batch_op.alter_column('qc_status', existing_type=NEW_QC, type_=OLD_QC, existing_nullable=False)
        for name in COLOURS:
            batch_op.alter_column(name, existing_type=sa.Numeric(precision=6, scale=2), nullable=False)
