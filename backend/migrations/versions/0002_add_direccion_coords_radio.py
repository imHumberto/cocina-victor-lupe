"""add lat/lng a direcciones_cliente y radio_entrega_km a configuracion

Revision ID: 0002_add_direccion_coords_radio
Revises: 0001_initial
Create Date: 2026-07-24 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = '0002_add_direccion_coords_radio'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('direcciones_cliente', sa.Column('lat', sa.Numeric(10, 7), nullable=True))
    op.add_column('direcciones_cliente', sa.Column('lng', sa.Numeric(10, 7), nullable=True))

    op.execute("""
        INSERT INTO configuracion (clave, valor)
        VALUES ('radio_entrega_km', '2.0')
        ON CONFLICT (clave) DO NOTHING
    """)


def downgrade():
    op.drop_column('direcciones_cliente', 'lat')
    op.drop_column('direcciones_cliente', 'lng')
    op.execute("DELETE FROM configuracion WHERE clave = 'radio_entrega_km'")
