import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import useAuthStore from "../../../store/authStore";
import { useSocketEvent } from "../../../hooks/useSocket";
import { getSocket } from "../../../services/socket";

const PAGO_ICONS = { efectivo: "💵", tarjeta: "💳", transferencia: "🏦" };

function saludo(nombre) {
  const h = new Date().getHours();
  const greeting = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  const partes = (nombre ?? "").trim().split(" ");
  const first = partes[0] ?? "";
  return { greeting, nombre: first.toUpperCase() };
}

function MapaPreview({ address }) {
  const [error, setError] = useState(false);
  if (!address || error) return null;
  return (
    <div className="rep-mapa-wrap">
      <img
        src={`/api/geo/mapa?address=${encodeURIComponent(address)}`}
        alt="Vista del recorrido"
        className="rep-mapa-img"
        onError={() => setError(true)}
      />
      <div className="rep-mapa-leyenda">
        <span className="rep-mapa-pin rep-mapa-pin--sazon">S</span> Sazón Mexa
        <span className="rep-mapa-pin rep-mapa-pin--dest ms-3">D</span> Destino
      </div>
    </div>
  );
}

function PedidoNuevoCard({ pedido: p, onTomar }) {
  const [expandido, setExpandido] = useState(false);
  const [tomando, setTomando] = useState(false);
  const address = p.entrega_direccion ?? p.direccion?.direccion ?? p.cliente?.direccion_entrega ?? null;

  const handleTomar = async () => {
    setTomando(true);
    try { await onTomar(p.id); }
    finally { setTomando(false); }
  };

  return (
    <div className="rep-pedido-card">
      <div className="rep-pedido-card__top">
        <div>
          <div className="rep-pedido-card__id">#{p.id}</div>
          <div className="rep-pedido-card__nombre">{p.receptor_nombre || p.cliente?.nombre}</div>
        </div>
        <div className="d-flex align-items-start gap-2">
          <span className="rep-badge rep-badge--nuevo">En cola</span>
          <button className="rep-pedido-card__toggle" onClick={() => setExpandido(e => !e)}>
            <i className={`bi bi-${expandido ? "dash" : "plus"}`} />
          </button>
        </div>
      </div>

      <div className="rep-pedido-card__meta">
        <div className="rep-pedido-card__meta-row">
          <i className="bi bi-geo-alt-fill" style={{ color: "#ED4137" }} />
          <span>{address ?? "Sin dirección"}</span>
        </div>
        <div className="rep-pedido-card__meta-row">
          <i className="bi bi-clock" />
          <span>{p.hora_entrega}</span>
          <i className="bi bi-credit-card ms-2" />
          <span>{PAGO_ICONS[p.metodo_pago] ?? ""} {p.metodo_pago}</span>
        </div>
      </div>

      {p.notas && (
        <div className="rep-pedido-card__nota">
          <i className="bi bi-chat-left-text" />
          <span>"{p.notas}"</span>
        </div>
      )}

      {expandido && <MapaPreview address={address} />}

      <button className="rep-btn-primary" onClick={handleTomar} disabled={tomando}>
        {tomando
          ? <span className="spinner-border spinner-border-sm" />
          : <><i className="bi bi-scooter" /> Agregar a la cola</>
        }
      </button>
    </div>
  );
}

export default function InicioRepartidorPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { greeting, nombre } = saludo(user?.nombre);
  const [pedidos, setPedidos] = useState([]);
  const [stats, setStats] = useState(null);
  const [proximos, setProximos] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const ultimosRef = useRef(null);

  const cargarPedidos = () =>
    api.get("/repartidor/pedidos-hoy").then(({ data }) => setPedidos(data));
  const cargarStats    = () => api.get("/repartidor/stats").then(({ data }) => setStats(data));
  const cargarProximos = () => api.get("/repartidor/proximos").then(({ data }) => setProximos(data.count));

  useEffect(() => {
    Promise.all([cargarPedidos(), cargarStats(), cargarProximos()])
      .finally(() => setLoading(false));
    getSocket()?.emit("join_admin");
  }, []);

  const handleActualizado = useCallback((p) => {
    cargarProximos();
    setPedidos(ps => {
      const disponible = p.estado === "listo" && !p.repartidor_id;
      if (!disponible) return ps.filter(x => x.id !== p.id);
      const existe = ps.some(x => x.id === p.id);
      return existe ? ps.map(x => x.id === p.id ? p : x) : [...ps, p];
    });
  }, []);
  useSocketEvent("pedido_actualizado", handleActualizado);

  const tomar = async (id) => {
    try {
      await api.patch(`/repartidor/${id}/tomar`);
      setPedidos(ps => ps.filter(p => p.id !== id));
      cargarStats();
    } catch (err) {
      alert(err.response?.data?.error ?? "Error al tomar el pedido");
    }
  };

  const nuevos   = pedidos.filter(p => p.estado === "listo" && !p.repartidor_id);
  const enCola   = pedidos.filter(p => p.estado === "en_camino");

  const nuevosFiltrados = nuevos.filter(p => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      String(p.id).includes(q) ||
      (p.receptor_nombre || p.cliente?.nombre || "").toLowerCase().includes(q)
    );
  });

  const TABS = [
    { key: "nuevos",   label: "Nuevos",   sub: "Pedidos sin tomar", img: "/ilustraciones/IMG-repartidorNuevo.png",    count: nuevos.length },
    { key: "cola",     label: "En cola",  sub: "Por repartir",      img: "/ilustraciones/IMG-repartidorCola.png",     count: enCola.length },
    { key: "historial",label: "Historial",sub: "Finalizados",       img: "/ilustraciones/IMG-repartidorHistorial.png", count: stats?.entregados_mes ?? 0 },
  ];

  const handleTab = (key) => {
    if (key === "nuevos") {
      ultimosRef.current?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/repartidor/${key}`);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="rep-header">
        <h1 className="rep-header__saludo">
          {greeting},<br />{nombre}
        </h1>
        <button className="rep-header__salir" onClick={logout}>
          Salir <i className="bi bi-box-arrow-right" />
        </button>
      </div>

      {/* Búsqueda */}
      <div className="rep-search">
        <i className="bi bi-search" />
        <input
          type="text"
          placeholder="buscar pedido"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="rep-stats">
        <div className="rep-stat-card">
          <div className="rep-stat-card__value">{stats?.entregados_mes ?? 0}</div>
          <div className="rep-stat-card__label">Entregados</div>
          <div className="rep-stat-card__sub">En el día</div>
        </div>
        <div className="rep-stat-card">
          <div className="rep-stat-card__value">{proximos}</div>
          <div className="rep-stat-card__label">En preparación</div>
        </div>
      </div>

      {/* Nav tabs */}
      <div className="rep-nav-tabs">
        {TABS.map(t => (
          <button key={t.key} className="rep-nav-tab" onClick={() => handleTab(t.key)}>
            {t.count > 0 && <span className="rep-nav-tab__badge">{t.count}</span>}
            <img src={t.img} alt={t.label} className="rep-nav-tab__img" />
            <div className="rep-nav-tab__nombre">{t.label}</div>
            <div className="rep-nav-tab__sub">{t.sub}</div>
          </button>
        ))}
      </div>

      {/* Últimos pedidos */}
      <div ref={ultimosRef}>
        <p className="rep-ultimos-label">Últimos pedidos</p>
        {loading ? (
          <div className="rep-spinner"><div className="spinner-border text-brand" /></div>
        ) : nuevosFiltrados.length === 0 ? (
          <div className="rep-empty">
            <img src="/ilustraciones/IMG-repartidorNuevo.png" alt="" className="rep-empty__img" />
            <p className="rep-empty__text">No hay pedidos por entregar</p>
          </div>
        ) : (
          nuevosFiltrados.map(p => (
            <PedidoNuevoCard key={p.id} pedido={p} onTomar={tomar} />
          ))
        )}
      </div>
    </>
  );
}
