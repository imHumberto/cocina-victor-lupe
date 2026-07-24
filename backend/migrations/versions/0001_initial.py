"""initial

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-24 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Enums
    rol_enum = sa.Enum('cliente', 'admin', 'repartidor', name='rol_enum')
    tipo_platillo_enum = sa.Enum('entrada', 'plato_fuerte', 'guarnicion', 'postre', 'bebida', name='tipo_platillo_enum')
    estado_pedido_enum = sa.Enum('pendiente', 'confirmado', 'rechazado', 'en_preparacion', 'listo', 'en_camino', 'entregado', 'cancelado', name='estado_pedido_enum')
    metodo_pago_enum = sa.Enum('transferencia', 'efectivo', 'tarjeta', name='metodo_pago_enum')

    op.create_table('users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(120), nullable=False),
        sa.Column('telefono_whatsapp', sa.String(20), nullable=False),
        sa.Column('password_hash', sa.String(256), nullable=False),
        sa.Column('direccion_entrega', sa.Text()),
        sa.Column('empresa', sa.String(120)),
        sa.Column('tipo_vivienda', sa.String(30)),
        sa.Column('referencias_entrega', sa.Text()),
        sa.Column('invite_token', sa.String(64), unique=True),
        sa.Column('rol', rol_enum, nullable=False),
        sa.Column('notif_app', sa.Boolean(), server_default='true'),
        sa.Column('notif_whatsapp', sa.Boolean(), server_default='false'),
        sa.Column('activo', sa.Boolean(), server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('telefono_whatsapp'),
    )

    op.create_table('invite_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(64), nullable=False),
        sa.Column('creado_por_id', sa.Integer(), nullable=False),
        sa.Column('usado', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(['creado_por_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('token'),
    )

    op.create_table('direcciones_cliente',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('alias', sa.String(120)),
        sa.Column('tipo_vivienda', sa.String(30)),
        sa.Column('direccion', sa.Text(), nullable=False),
        sa.Column('referencias', sa.Text()),
        sa.Column('es_principal', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table('notificaciones',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('mensaje', sa.Text(), nullable=False),
        sa.Column('leido', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table('platillos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(120), nullable=False),
        sa.Column('tipo', tipo_platillo_enum, nullable=False),
        sa.Column('descripcion', sa.Text()),
        sa.Column('foto_url', sa.String(512)),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('es_alternativa', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('proteina', sa.String(20)),
        sa.Column('variante_proteina', sa.Boolean(), nullable=False, server_default='false'),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table('menus_semanales',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(128), nullable=False, server_default=''),
        sa.Column('fecha_inicio', sa.Date(), nullable=False),
        sa.Column('publicado', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('fecha_inicio'),
    )

    op.create_table('dias_menu',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('dia', sa.Integer(), nullable=False),
        sa.Column('menu_semanal_id', sa.Integer(), nullable=False),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('entrada_id', sa.Integer()),
        sa.Column('postre_id', sa.Integer()),
        sa.Column('bebida_id', sa.Integer()),
        sa.Column('alternativa_bebida_costo_extra', sa.Numeric(8, 2), server_default='0'),
        sa.Column('alternativa_plato_costo_extra', sa.Numeric(8, 2), server_default='0'),
        sa.Column('alternativa_plato_disponible', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('alternativa_bebida_disponible', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['menu_semanal_id'], ['menus_semanales.id']),
        sa.ForeignKeyConstraint(['entrada_id'], ['platillos.id']),
        sa.ForeignKeyConstraint(['postre_id'], ['platillos.id']),
        sa.ForeignKeyConstraint(['bebida_id'], ['platillos.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('menu_semanal_id', 'dia', name='uq_menu_dia'),
    )

    op.create_table('dia_platos_fuertes',
        sa.Column('dia_menu_id', sa.Integer(), nullable=False),
        sa.Column('platillo_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['dia_menu_id'], ['dias_menu.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['platillo_id'], ['platillos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('dia_menu_id', 'platillo_id'),
    )

    op.create_table('dia_guarniciones',
        sa.Column('dia_menu_id', sa.Integer(), nullable=False),
        sa.Column('platillo_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['dia_menu_id'], ['dias_menu.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['platillo_id'], ['platillos.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('dia_menu_id', 'platillo_id'),
    )

    op.create_table('pedidos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('cliente_id', sa.Integer(), nullable=False),
        sa.Column('dia_menu_id', sa.Integer(), nullable=False),
        sa.Column('hora_entrega', sa.Time(), nullable=False),
        sa.Column('plato_elegido', sa.String(20), nullable=False, server_default='principal'),
        sa.Column('plato_nombre', sa.String(120)),
        sa.Column('bebida_elegida', sa.String(20), nullable=False, server_default='principal'),
        sa.Column('bebida_nombre', sa.String(120)),
        sa.Column('estado', estado_pedido_enum, nullable=False),
        sa.Column('motivo_rechazo', sa.Text()),
        sa.Column('metodo_pago', metodo_pago_enum, nullable=False),
        sa.Column('comprobante_url', sa.String(512)),
        sa.Column('direccion_id', sa.Integer()),
        sa.Column('entrega_direccion', sa.Text()),
        sa.Column('entrega_referencias', sa.Text()),
        sa.Column('receptor_nombre', sa.String(120)),
        sa.Column('receptor_telefono', sa.String(20)),
        sa.Column('repartidor_id', sa.Integer()),
        sa.Column('tomado_en', sa.DateTime(timezone=True)),
        sa.Column('notas', sa.Text()),
        sa.Column('created_at', sa.DateTime(timezone=True)),
        sa.Column('updated_at', sa.DateTime(timezone=True)),
        sa.ForeignKeyConstraint(['cliente_id'], ['users.id']),
        sa.ForeignKeyConstraint(['dia_menu_id'], ['dias_menu.id']),
        sa.ForeignKeyConstraint(['direccion_id'], ['direcciones_cliente.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['repartidor_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table('configuracion',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('clave', sa.String(64), nullable=False),
        sa.Column('valor', sa.String(256), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('clave'),
    )


def downgrade():
    op.drop_table('pedidos')
    op.drop_table('dia_platos_fuertes')
    op.drop_table('dia_guarniciones')
    op.drop_table('dias_menu')
    op.drop_table('menus_semanales')
    op.drop_table('platillos')
    op.drop_table('notificaciones')
    op.drop_table('direcciones_cliente')
    op.drop_table('invite_tokens')
    op.drop_table('configuracion')
    op.drop_table('users')
    sa.Enum(name='rol_enum').drop(op.get_bind())
    sa.Enum(name='tipo_platillo_enum').drop(op.get_bind())
    sa.Enum(name='estado_pedido_enum').drop(op.get_bind())
    sa.Enum(name='metodo_pago_enum').drop(op.get_bind())
