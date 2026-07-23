import { useEffect, useState, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import useAuthStore from "../../../store/authStore";
import { useSocketEvent } from "../../../hooks/useSocket";
import { hasCart, clearCart } from "../../../utils/cart";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

function saludo() {
  const h = dayjs().hour();
  if (h < 12) return "Buenos días!";
  if (h < 19) return "Buenas tardes!";
  return "Buenas noches!";
}

const PASOS = [
  { estado: "pendiente" },
  { estado: "confirmado" },
  { estado: "en_preparacion" },
  { estado: "en_camino" },
  { estado: "entregado" },
];

// "listo" se trata igual que "en_preparacion" en la vista del cliente
const ESTADO_VISIBLE = { listo: "en_preparacion" };

const STATUS_INFO = {
  pendiente:      { label: "Pedido recibido",       desc: "Recibimos tu pedido, en breve te confirmaremos." },
  confirmado:     { label: "Pedido confirmado",     desc: "Tu pedido ha sido confirmado, te notificaremos cuando esté en preparación." },
  en_preparacion: { label: "Pedido en preparación", desc: "Estamos cocinando tu pedido, pronto estará en camino a tu dirección." },
  en_camino:      { label: "En camino",             desc: "Tu pedido ha salido de nuestra cocina y va rumbo a tu dirección, esperamos estar por llegar." },
  entregado:      { label: "Pedido entregado",      desc: "Buen provecho, disfruta de tu comida, la hicimos con amor, esperamos verte mañana." },
};

function TrackerPedido({ pedido, onDismiss }) {
  if (pedido.estado === "rechazado") {
    return (
      <div className="tracker-card tracker-card--rechazado">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: "1.4rem" }}>❌</span>
            <span className="fw-bold text-danger">Pedido rechazado</span>
          </div>
          <button className="btn btn-sm btn-outline-danger rounded-pill" onClick={onDismiss}>
            Entendido
          </button>
        </div>
        {pedido.motivo_rechazo && (
          <p className="small text-muted mb-0">Motivo: <strong>{pedido.motivo_rechazo}</strong></p>
        )}
      </div>
    );
  }

  const estadoVisible = ESTADO_VISIBLE[pedido.estado] ?? pedido.estado;
  const idxActual = PASOS.findIndex(p => p.estado === estadoVisible);
  const ilustracion = pedido.estado === "entregado"
    ? "/ilustraciones/pedido-ilustracion02.png"
    : "/ilustraciones/pedido-ilustracion01.png";
  const info = STATUS_INFO[estadoVisible] ?? STATUS_INFO.pendiente;

  return (
    <div className="tracker-card">
      <div className="tracker-card__header">
        <img src={ilustracion} alt="" className="tracker-card__img" />
        <div>
          <div className="tracker-card__titulo">Pedido de hoy</div>
          <div className="tracker-card__subtitulo">Entrega programada a las {pedido.hora_entrega}</div>
        </div>
      </div>

      <div className="tracker-barra">
        {PASOS.map((p, i) => (
          <Fragment key={p.estado}>
            <div className={`tracker-barra__dot${i <= idxActual ? " tracker-barra__dot--activo" : ""}`}>
              {i <= idxActual
                ? <i className="bi bi-check tracker-barra__check" />
                : <span className="tracker-barra__excl">!</span>
              }
            </div>
            {i < PASOS.length - 1 && (
              <div className={`tracker-barra__linea${i < idxActual ? " tracker-barra__linea--activa" : ""}`} />
            )}
          </Fragment>
        ))}
      </div>

      <div className="tracker-card__estado-label">{info.label}</div>
      <div className="tracker-card__estado-desc">{info.desc}</div>

      <button className="tracker-card__btn-contacto">Contactanos</button>

      {pedido.estado === "entregado" && (
        <button
          className="btn btn-sm btn-link text-muted mt-2 w-100"
          onClick={onDismiss}
        >
          Marcar como visto
        </button>
      )}
    </div>
  );
}

export default function InicioPage() {
  const { user } = useAuthStore();
  const [dia, setDia] = useState(null);
  const [pedidoHoy, setPedidoHoy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cantidad, setCantidad] = useState(1);
  const [carritoGuardado, setCarritoGuardado] = useState(false);
  const [pedidosPausados, setPedidosPausados] = useState(false);
  const navigate = useNavigate();

  const nombre = user?.nombre?.split(" ")[0] ?? "";
  const hoy = dayjs();
  const esFinDeSemana = !dia && loading === false;
  const puedeOrdenar = !esFinDeSemana && !pedidosPausados;

  const DISMISS_KEY = "pedido_dismissed";

  const isDismissed = (pedido) => {
    try {
      const data = JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}");
      return data[pedido.id] === pedido.estado;
    } catch { return false; }
  };

  const dismissPedido = (pedido) => {
    try {
      const data = JSON.parse(localStorage.getItem(DISMISS_KEY) || "{}");
      data[pedido.id] = pedido.estado;
      localStorage.setItem(DISMISS_KEY, JSON.stringify(data));
    } catch {}
    setPedidoHoy(null);
  };

  useEffect(() => {
    api.get("/config/estado").then(({ data }) => setPedidosPausados(data.pedidos_pausados)).catch(() => {});
    if (esFinDeSemana) { setLoading(false); return; }
    Promise.all([
      api.get("/menu/dia-hoy").catch(() => null),
      api.get("/pedidos/mis-pedidos").catch(() => ({ data: [] })),
    ]).then(([diaRes, pedRes]) => {
      setDia(diaRes?.data ?? null);
      const pedidos = pedRes?.data ?? [];
      const hoyStr = hoy.format("YYYY-MM-DD");
      const pedidoHoyEncontrado = pedidos.find((p) => p.created_at?.startsWith(hoyStr) && p.estado !== "cancelado") ?? null;
      if (pedidoHoyEncontrado && isDismissed(pedidoHoyEncontrado)) {
        setPedidoHoy(null);
      } else {
        setPedidoHoy(pedidoHoyEncontrado);
      }
      if (pedidoHoyEncontrado) {
        clearCart(user.id);
        setCarritoGuardado(false);
      } else {
        setCarritoGuardado(hasCart(user.id));
      }
    }).finally(() => setLoading(false));
  }, []);

  const handlePedidoActualizado = useCallback((p) => {
    setPedidoHoy((prev) => {
      if (!prev) return prev;
      return prev.id === p.id ? p : prev;
    });
    if (["cancelado", "rechazado"].includes(p.estado)) {
      clearCart(user.id);
      setCarritoGuardado(false);
    }
  }, [user.id]);
  useSocketEvent("pedido_actualizado", handlePedidoActualizado);

  if (loading) return (
    <div className="cliente-loading">
      <div className="spinner-border" style={{ color: "var(--color-brand)" }} />
    </div>
  );

  const descripcionMenu = dia ? [
    dia.entrada?.nombre,
    dia.guarniciones?.map(g => g.nombre).join(", "),
    dia.bebida?.nombre,
    dia.postre?.nombre,
  ].filter(Boolean).join(", ") : "";

  const platilloDia = dia?.platos_fuertes?.[0]?.nombre ?? "";

  return (
    <div className="cliente-page">

      <h1 className="cliente-saludo">
        {saludo()},<br />{nombre}
      </h1>

      {/* Banner: pedidos pausados */}
      {pedidosPausados && !esFinDeSemana && (
        <div className="banner-pausado">
          <i className="bi bi-pause-circle-fill banner-pausado__icon" />
          <div>
            <div className="banner-pausado__titulo">No estamos aceptando pedidos</div>
            <div className="banner-pausado__desc">Por el momento el servicio está en pausa. Intenta más tarde.</div>
          </div>
        </div>
      )}


      {/* Banner: carrito en progreso */}
      {!esFinDeSemana && carritoGuardado && !pedidoHoy && (
        <div className="banner-carrito">
          <div className="banner-carrito__header">
            <img src="/ilustraciones/pedido_en_progreso.png" alt="" className="banner-carrito__img" />
            <div>
              <div className="banner-carrito__titulo">
                Tienes un pedido<br />en progreso
              </div>
              <div className="banner-carrito__subtitulo">Continuar donde me quedé</div>
            </div>
          </div>
          <div className="banner-carrito__acciones">
            <button
              className="btn-pill btn-pill--ghost"
              onClick={() => { clearCart(user.id); setCarritoGuardado(false); }}
            >Descartar</button>
            <button
              className="btn-pill btn-pill--brand"
              onClick={() => navigate("/cliente/ordenar")}
            >Continuar</button>
          </div>
        </div>
      )}

      {/* Tracker de pedido */}
      {!esFinDeSemana && pedidoHoy && (
        <TrackerPedido pedido={pedidoHoy} onDismiss={() => dismissPedido(pedidoHoy)} />
      )}

      {/* Fin de semana */}
      {esFinDeSemana && (
        <div className="banner-fds">
          <span className="banner-fds__icon">🛋️</span>
          <p className="banner-fds__titulo">Hoy no hay servicio</p>
          <p className="banner-fds__desc">Descansa, nos vemos el lunes</p>
        </div>
      )}

      {/* Hero menú del día */}
      {!esFinDeSemana && dia && (
        <>
          {(() => {
            const proteina = dia.platos_fuertes?.[0]?.proteina;
            const ilustracion = proteina ? `/ilustraciones/${proteina}.png` : null;
            const src = dia.imagen_url || ilustracion;
            return src
              ? <img src={src} alt={platilloDia} className="platillo-hero-img" />
              : <div className="platillo-hero-placeholder" />;
          })()}

          <div className="cliente-platillo-label">Platillo del día</div>
          <h2 className="cliente-platillo-titulo">{platilloDia}</h2>
          <p className="cliente-platillo-desc">{descripcionMenu}</p>

          {pedidoHoy && pedidoHoy.estado !== "entregado" ? (
            <button className="btn-pedido-en-curso" disabled>Pedido en curso</button>
          ) : puedeOrdenar ? (
            carritoGuardado ? (
              <>
                <button
                  className="carrito-continuar"
                  onClick={() => navigate("/cliente/ordenar")}
                >
                  Continuar con mi orden
                </button>
                <button
                  className="carrito-descartar"
                  onClick={() => { clearCart(user.id); setCarritoGuardado(false); }}
                >
                  Descartar
                </button>
              </>
            ) : (
              <div className="cliente-ordenar-row">
                <button
                  className="cliente-btn-ordenar"
                  onClick={() => navigate("/cliente/ordenar", { state: { cantidad } })}
                >
                  Ordenar · ${130 * cantidad}
                </button>
                <button
                  className="cliente-btn-contador"
                  onClick={() => setCantidad(c => Math.max(1, c - 1))}
                  disabled={cantidad <= 1}
                >−</button>
                <span className="cliente-contador-valor">{cantidad}</span>
                <button
                  className="cliente-btn-contador cliente-btn-contador-plus"
                  onClick={() => setCantidad(c => Math.min(4, c + 1))}
                  disabled={cantidad >= 4}
                >+</button>
              </div>
            )
          ) : (
            !pedidosPausados && (
              <p className="text-muted text-center small mt-3">
                El tiempo para ordenar hoy ya pasó (límite 3:40 PM)
              </p>
            )
          )}
        </>
      )}

      {/* Sin menú */}
      {!esFinDeSemana && !dia && (
        <div className="sin-menu">
          <span className="sin-menu__icon">🍽️</span>
          <p className="mt-3">No hay menú publicado para hoy</p>
        </div>
      )}
    </div>
  );
}
