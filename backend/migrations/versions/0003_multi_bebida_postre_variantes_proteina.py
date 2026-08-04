"""multi bebida/postre por día y variantes de proteína configurables

Revision ID: 0003_multi_bebida_postre_variantes_proteina
Revises: 0002_add_direccion_coords_radio
Create Date: 2026-07-31
"""
from alembic import op
import sqlalchemy as sa

revision = '0003_multi_menu_variantes'
down_revision = '0002_add_direccion_coords_radio'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Tablas de asociación bebidas y postres por día
    op.create_table(
        'dia_bebidas',
        sa.Column('dia_menu_id', sa.Integer(), nullable=False),
        sa.Column('platillo_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['dia_menu_id'], ['dias_menu.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['platillo_id'], ['platillos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('dia_menu_id', 'platillo_id'),
    )
    op.create_table(
        'dia_postres',
        sa.Column('dia_menu_id', sa.Integer(), nullable=False),
        sa.Column('platillo_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['dia_menu_id'], ['dias_menu.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['platillo_id'], ['platillos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('dia_menu_id', 'platillo_id'),
    )

    # 2. Migrar datos existentes: bebida_id → dia_bebidas, postre_id → dia_postres
    op.execute("""
        INSERT INTO dia_bebidas (dia_menu_id, platillo_id)
        SELECT id, bebida_id FROM dias_menu WHERE bebida_id IS NOT NULL
    """)
    op.execute("""
        INSERT INTO dia_postres (dia_menu_id, platillo_id)
        SELECT id, postre_id FROM dias_menu WHERE postre_id IS NOT NULL
    """)

    # 3. Quitar columnas bebida_id y postre_id
    op.execute("ALTER TABLE dias_menu DROP COLUMN IF EXISTS bebida_id")
    op.execute("ALTER TABLE dias_menu DROP COLUMN IF EXISTS postre_id")

    # 4. Agregar variantes_proteina a platillos
    op.add_column('platillos', sa.Column('variantes_proteina', sa.Text(), nullable=True))

    # 5. Migrar variante_proteina=True → variantes_proteina='pollo,res'
    op.execute("""
        UPDATE platillos SET variantes_proteina = 'pollo,res' WHERE variante_proteina = TRUE
    """)

    # 6. Quitar variante_proteina
    op.execute("ALTER TABLE platillos DROP COLUMN IF EXISTS variante_proteina")

    # 7. Agregar postre_nombre a pedidos
    op.add_column('pedidos', sa.Column('postre_nombre', sa.Text(), nullable=True))


def downgrade():
    op.drop_column('pedidos', 'postre_nombre')

    op.add_column('platillos', sa.Column('variante_proteina', sa.Boolean(), nullable=False, server_default='false'))
    op.execute("""
        UPDATE platillos SET variante_proteina = TRUE
        WHERE variantes_proteina IS NOT NULL AND variantes_proteina != ''
    """)
    op.drop_column('platillos', 'variantes_proteina')

    op.add_column('dias_menu', sa.Column('bebida_id', sa.Integer(), nullable=True))
    op.add_column('dias_menu', sa.Column('postre_id', sa.Integer(), nullable=True))
    op.execute("""
        UPDATE dias_menu dm
        SET bebida_id = (SELECT platillo_id FROM dia_bebidas WHERE dia_menu_id = dm.id LIMIT 1)
    """)
    op.execute("""
        UPDATE dias_menu dm
        SET postre_id = (SELECT platillo_id FROM dia_postres WHERE dia_menu_id = dm.id LIMIT 1)
    """)
    op.drop_table('dia_postres')
    op.drop_table('dia_bebidas')
