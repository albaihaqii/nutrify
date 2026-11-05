"""create initial tables

Revision ID: dfff3ef27beb
Revises:
Create Date: 2026-11-05 14:44:41.733951

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'dfff3ef27beb'
down_revision = None
branch_labels = None
depends_on = None

# Column types shared by many tables (same definitions as app/models/types.py).
BIGINT_ID = (
    sa.BigInteger()
    .with_variant(mysql.BIGINT(unsigned=True), 'mysql')
    .with_variant(sa.Integer(), 'sqlite')
)
DATETIME_MS = sa.DateTime().with_variant(mysql.DATETIME(fsp=3), 'mysql')


def upgrade():
    op.create_table('devices',
    sa.Column('id', BIGINT_ID, autoincrement=True, nullable=False),
    sa.Column('code', sa.String(length=50), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('type', sa.Enum('sensor_node', 'webcam', name='device_type'), nullable=False),
    sa.Column('api_key_hash', sa.String(length=255), nullable=True),
    sa.Column('firmware_version', sa.String(length=50), nullable=True),
    sa.Column('last_seen_at', DATETIME_MS, nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', DATETIME_MS, nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('code')
    )
    with op.batch_alter_table('devices', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_devices_api_key_hash'), ['api_key_hash'], unique=False)

    # plants and observations reference each other. The foreign key
    # plants.last_observation_id is therefore added after observations exists.
    op.create_table('plants',
    sa.Column('id', BIGINT_ID, autoincrement=True, nullable=False),
    sa.Column('position', sa.SmallInteger().with_variant(mysql.TINYINT(unsigned=True), 'mysql'), nullable=False),
    sa.Column('current_class', sa.Enum('normal', 'n_deficiency', 'fe_deficiency', name='plant_class'), nullable=True),
    sa.Column('current_since', DATETIME_MS, nullable=True),
    sa.Column('last_observation_id', BIGINT_ID, nullable=True),
    sa.Column('updated_at', DATETIME_MS, nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('position')
    )
    op.create_table('users',
    sa.Column('id', BIGINT_ID, autoincrement=True, nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('role', sa.Enum('admin', 'viewer', name='user_role'), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('last_login_at', DATETIME_MS, nullable=True),
    sa.Column('created_at', DATETIME_MS, nullable=False),
    sa.Column('updated_at', DATETIME_MS, nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    op.create_table('alerts',
    sa.Column('id', BIGINT_ID, autoincrement=True, nullable=False),
    sa.Column('code', sa.Enum('sensor_out_of_range', 'plant_deficiency', 'device_offline', 'sensor_stale', name='alert_code'), nullable=False),
    sa.Column('severity', sa.Enum('info', 'warning', 'critical', name='severity'), nullable=False),
    sa.Column('params', sa.JSON(), nullable=True),
    sa.Column('plant_id', BIGINT_ID, nullable=True),
    sa.Column('device_id', BIGINT_ID, nullable=True),
    sa.Column('created_at', DATETIME_MS, nullable=False),
    sa.Column('resolved_at', DATETIME_MS, nullable=True),
    sa.Column('acknowledged_by', BIGINT_ID, nullable=True),
    sa.Column('acknowledged_at', DATETIME_MS, nullable=True),
    sa.Column('notified', sa.Boolean(), nullable=False),
    sa.ForeignKeyConstraint(['acknowledged_by'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['plant_id'], ['plants.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('alerts', schema=None) as batch_op:
        batch_op.create_index('ix_alerts_created_at', ['created_at'], unique=False)
        batch_op.create_index('ix_alerts_resolved_at', ['resolved_at'], unique=False)

    op.create_table('captures',
    sa.Column('id', BIGINT_ID, autoincrement=True, nullable=False),
    sa.Column('device_id', BIGINT_ID, nullable=False),
    sa.Column('image_path', sa.String(length=255), nullable=False),
    sa.Column('captured_at', DATETIME_MS, nullable=False),
    sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('captures', schema=None) as batch_op:
        batch_op.create_index('ix_captures_captured_at', ['captured_at'], unique=False)

    op.create_table('sensor_readings',
    sa.Column('id', BIGINT_ID, autoincrement=True, nullable=False),
    sa.Column('device_id', BIGINT_ID, nullable=False),
    sa.Column('ph', sa.Numeric(precision=4, scale=2), nullable=False),
    sa.Column('ec', sa.Numeric(precision=5, scale=3), nullable=False),
    sa.Column('tds_ppm', sa.Integer(), nullable=False),
    sa.Column('temperature', sa.Numeric(precision=4, scale=1), nullable=False),
    sa.Column('recorded_at', DATETIME_MS, nullable=False),
    sa.Column('received_at', DATETIME_MS, nullable=False),
    sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('sensor_readings', schema=None) as batch_op:
        batch_op.create_index('ix_sensor_readings_device_recorded', ['device_id', 'recorded_at'], unique=False)
        batch_op.create_index('ix_sensor_readings_recorded_at', ['recorded_at'], unique=False)

    op.create_table('settings',
    sa.Column('key', sa.String(length=100), nullable=False),
    sa.Column('value', sa.JSON(), nullable=False),
    sa.Column('updated_by', BIGINT_ID, nullable=True),
    sa.Column('updated_at', DATETIME_MS, nullable=False),
    sa.ForeignKeyConstraint(['updated_by'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('key')
    )
    op.create_table('observations',
    sa.Column('id', BIGINT_ID, autoincrement=True, nullable=False),
    sa.Column('plant_id', BIGINT_ID, nullable=False),
    sa.Column('capture_id', BIGINT_ID, nullable=True),
    sa.Column('observed_at', DATETIME_MS, nullable=False),
    sa.Column('mean_r', sa.Numeric(precision=6, scale=2), nullable=False),
    sa.Column('mean_g', sa.Numeric(precision=6, scale=2), nullable=False),
    sa.Column('mean_b', sa.Numeric(precision=6, scale=2), nullable=False),
    sa.Column('leaf_area_ratio', sa.Numeric(precision=5, scale=4), nullable=False),
    sa.Column('ph', sa.Numeric(precision=4, scale=2), nullable=True),
    sa.Column('ec', sa.Numeric(precision=5, scale=3), nullable=True),
    sa.Column('temperature', sa.Numeric(precision=4, scale=1), nullable=True),
    sa.Column('predicted_class', sa.Enum('normal', 'n_deficiency', 'fe_deficiency', name='plant_class'), nullable=True),
    sa.Column('stable_class', sa.Enum('normal', 'n_deficiency', 'fe_deficiency', name='plant_class'), nullable=True),
    sa.Column('confidence', sa.Numeric(precision=4, scale=3), nullable=True),
    sa.Column('rule_path', sa.JSON(), nullable=True),
    sa.Column('qc_status', sa.Enum('ok', 'invalid_leaf', 'stale_sensor', 'needs_check', name='qc_status'), nullable=False),
    sa.Column('model_version', sa.String(length=50), nullable=True),
    sa.Column('label_class', sa.Enum('normal', 'n_deficiency', 'fe_deficiency', name='plant_class'), nullable=True),
    sa.Column('labeled_by', BIGINT_ID, nullable=True),
    sa.Column('labeled_at', DATETIME_MS, nullable=True),
    sa.ForeignKeyConstraint(['capture_id'], ['captures.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['labeled_by'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['plant_id'], ['plants.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_foreign_key(
        'fk_plants_last_observation',
        'plants',
        'observations',
        ['last_observation_id'],
        ['id'],
        ondelete='SET NULL',
    )
    with op.batch_alter_table('observations', schema=None) as batch_op:
        batch_op.create_index('ix_observations_capture_id', ['capture_id'], unique=False)
        batch_op.create_index('ix_observations_label_class', ['label_class'], unique=False)
        batch_op.create_index('ix_observations_observed_at', ['observed_at'], unique=False)
        batch_op.create_index('ix_observations_plant_observed', ['plant_id', 'observed_at'], unique=False)

    op.create_table('advice',
    sa.Column('id', BIGINT_ID, autoincrement=True, nullable=False),
    sa.Column('created_at', DATETIME_MS, nullable=False),
    sa.Column('trigger', sa.Enum('plant_status', 'sensor_range', name='advice_trigger'), nullable=False),
    sa.Column('plant_id', BIGINT_ID, nullable=True),
    sa.Column('observation_id', BIGINT_ID, nullable=True),
    sa.Column('plant_class', sa.Enum('normal', 'n_deficiency', 'fe_deficiency', name='plant_class'), nullable=True),
    sa.Column('severity', sa.Enum('info', 'warning', 'critical', name='severity'), nullable=False),
    sa.Column('summary', sa.Text(), nullable=False),
    sa.Column('likely_causes', sa.JSON(), nullable=False),
    sa.Column('suggested_actions', sa.JSON(), nullable=False),
    sa.Column('source', sa.Enum('llm', 'rules', name='advice_source'), nullable=False),
    sa.Column('provider', sa.String(length=50), nullable=True),
    sa.Column('model_name', sa.String(length=100), nullable=True),
    sa.Column('context', sa.JSON(), nullable=False),
    sa.Column('cache_key', sa.String(length=128), nullable=True),
    sa.ForeignKeyConstraint(['observation_id'], ['observations.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['plant_id'], ['plants.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('advice', schema=None) as batch_op:
        batch_op.create_index('ix_advice_cache_key', ['cache_key'], unique=False)
        batch_op.create_index('ix_advice_created_at', ['created_at'], unique=False)
        batch_op.create_index('ix_advice_plant_created', ['plant_id', 'created_at'], unique=False)


def downgrade():
    with op.batch_alter_table('advice', schema=None) as batch_op:
        batch_op.drop_index('ix_advice_plant_created')
        batch_op.drop_index('ix_advice_created_at')
        batch_op.drop_index('ix_advice_cache_key')

    op.drop_table('advice')
    with op.batch_alter_table('observations', schema=None) as batch_op:
        batch_op.drop_index('ix_observations_plant_observed')
        batch_op.drop_index('ix_observations_observed_at')
        batch_op.drop_index('ix_observations_label_class')
        batch_op.drop_index('ix_observations_capture_id')

    op.drop_constraint('fk_plants_last_observation', 'plants', type_='foreignkey')
    op.drop_table('observations')
    op.drop_table('settings')
    with op.batch_alter_table('sensor_readings', schema=None) as batch_op:
        batch_op.drop_index('ix_sensor_readings_recorded_at')
        batch_op.drop_index('ix_sensor_readings_device_recorded')

    op.drop_table('sensor_readings')
    with op.batch_alter_table('captures', schema=None) as batch_op:
        batch_op.drop_index('ix_captures_captured_at')

    op.drop_table('captures')
    with op.batch_alter_table('alerts', schema=None) as batch_op:
        batch_op.drop_index('ix_alerts_resolved_at')
        batch_op.drop_index('ix_alerts_created_at')

    op.drop_table('alerts')
    op.drop_table('users')
    op.drop_table('plants')
    with op.batch_alter_table('devices', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_devices_api_key_hash'))

    op.drop_table('devices')