import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie"];

function platilloNombre(p) {
  return p?.nombre ?? "—";
}

function getMenuImg(nombre) {
  if (!nombre || nombre === "—") return null;
  const n = nombre.toLowerCase();

  // Entradas / guarniciones
  if (n.includes("sopa") || n.includes("caldo") || n.includes("consomé") || n.includes("consome") || n.includes("crema de"))
    return "/platillos/sopas.png";
  if (n.includes("ensalada"))
    return "/platillos/ensaladas.png";
  if (n.includes("puré") || n.includes("pure"))
    return "/platillos/pures.png";
  if (n.includes("arroz rojo"))
    return "/platillos/arroz-rojo.png";
  if (n.includes("arroz"))
    return "/platillos/arroz-blanco.png";

  // Bebidas
  if (n.includes("jamaica"))   return "/platillos/agua-jamaica.png";
  if (n.includes("horchata"))  return "/platillos/agua-horchata.png";
  if (n.includes("limón") || n.includes("limon")) return "/platillos/agua-limon.png";
  if (n.includes("sandía") || n.includes("sandia")) return "/platillos/agua-sandia.png";

  // Postres
  if (n.includes("gelatina"))  return "/platillos/gelatinas.png";
  if (n.includes("pastel") || n.includes("pay") || n.includes("cheesecake") || n.includes("pie") || n.includes("brownie"))
    return "/platillos/pasteles.png";
  if (n.includes("fruta") || n.includes("durazno") || n.includes("con crema"))
    return "/platillos/frutas.png";

  return null;
}

export default function MenuPage() {
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pedidosPausados, setPedidosPausados] = useState(false);
  const navigate = useNavigate();

  const hoyIdx = dayjs().day() === 0 ? 6 : dayjs().day() - 1;
  const [tab, setTab] = useState(hoyIdx >= 0 && hoyIdx <= 6 ? hoyIdx : 0);

  useEffect(() => {
    api.get("/config/estado").then(({ data }) => setPedidosPausados(data.pedidos_pausados)).catch(() => {});
    api.get("/menu/actual")
      .then(({ data }) => setMenu(data))
      .catch(() => setError("No hay menú disponible esta semana"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
      <div className="spinner-border text-brand" />
    </div>
  );

  if (error) return (
    <div className="p-4 text-center text-muted">
      <i className="bi bi-calendar-x fs-1 d-block mb-2" />
      {error}
    </div>
  );

  const dias = menu?.dias ?? [];
  const diaActivo = dias.find((d) => d.dia === tab);
  const tieneContenido = (diaActivo?.platos_fuertes?.length ?? 0) > 0;
  const esHoy = tab === hoyIdx;
  const puedeOrdenar = esHoy && !pedidosPausados;

  const fechaInicio = dayjs(menu.fecha_inicio);
  const fechaFin = fechaInicio.add(4, "day");
  const subtitulo = `Semana del ${fechaInicio.format("D [de] MMMM")} al ${fechaFin.format("D [de] MMMM")}`;

  const platilloDia = diaActivo?.platos_fuertes?.[0]?.nombre ?? "";
  const proteina = diaActivo?.platos_fuertes?.[0]?.proteina;
  const ilustracion = proteina ? `/ilustraciones/${proteina}.png` : null;
  const heroSrc = diaActivo?.imagen_url || ilustracion;

  return (
    <div className="cliente-page">
      <h1 className="cliente-saludo" style={{ marginBottom: 4 }}>Menu Semanal</h1>
      <p className="menu-subtitulo">{subtitulo}</p>

      {/* Selector de días */}
      <div className="menu-dias">
        {DIAS.map((nombre, i) => {
          const tieneDia = dias.some((d) => d.dia === i);
          const fecha = fechaInicio.add(i, "day").format("D");
          const activo = tab === i;
          const esPasado = i < hoyIdx;
          const apagado = esPasado || !tieneDia;
          return (
            <div key={i} className="menu-dia-wrap">
              {i === hoyIdx && <span className="menu-dia__hoy">Hoy</span>}
              <button
                className={`menu-dia-btn${activo ? " menu-dia-btn--activo" : ""}${apagado && !activo ? " menu-dia-btn--apagado" : ""}`}
                onClick={() => tieneDia && setTab(i)}
                disabled={!tieneDia}
              >
                <span className="menu-dia__fecha">{fecha}</span>
                <span className="menu-dia__nombre">{nombre}</span>
              </button>
            </div>
          );
        })}
      </div>

      {diaActivo && tieneContenido ? (
        <>
          {/* Hero ilustración */}
          {heroSrc
            ? <img src={heroSrc} alt={platilloDia} className="platillo-hero-img" />
            : <div className="platillo-hero-placeholder" />
          }

          {/* Platillo del día */}
          <div className="cliente-platillo-label">Platillo del día</div>
          <h2 className="cliente-platillo-titulo">{platilloDia}</h2>

          {/* Detalle */}
          <div className="menu-detalle">
            <MenuRow icon="bi-egg-fried" label="Entrada" valor={platilloNombre(diaActivo.entrada)} />
            <MenuRow icon="bi-grid-3x3-gap" label="Guarnición" valor={diaActivo.guarniciones?.map(p => p.nombre).join(" / ") || "—"} />
            <MenuRow icon="bi-cup-straw" label="Bebida" valor={platilloNombre(diaActivo.bebida)} />
            <MenuRow icon="bi-cake2" label="Postre" valor={platilloNombre(diaActivo.postre)} />
          </div>

          {!esHoy && tab < hoyIdx && (
            <button className="btn-pedido-en-curso mt-3" disabled>Menú no disponible</button>
          )}
          {puedeOrdenar && (
            <button
              className="cliente-btn-ordenar w-100 mt-3"
              style={{ padding: "16px 0", borderRadius: 16 }}
              onClick={() => navigate("/cliente/ordenar")}
            >
              <i className="bi bi-cart4 me-2" />
              Ordenar
            </button>
          )}
          {esHoy && !puedeOrdenar && pedidosPausados && (
            <div className="banner-pausado-menu mt-3">
              <i className="bi bi-pause-circle-fill banner-pausado__icon" />
              <p className="text-muted small mb-0">No estamos aceptando pedidos por el momento. Intenta más tarde.</p>
            </div>
          )}
          {esHoy && !puedeOrdenar && !pedidosPausados && (
            <button className="btn-pedido-en-curso mt-3" disabled>No disponible</button>
          )}
        </>
      ) : (
        <div className="menu-empty">
          <h2 className="menu-empty__titulo">No hay nada para mostrar hoy</h2>
          <img src="/ilustraciones/IMG-EmptyState.png" alt="" className="menu-empty__img" />
        </div>
      )}
    </div>
  );
}

function MenuRow({ icon, label, valor, muted }) {
  const imgSrc = getMenuImg(valor);
  return (
    <div className={`menu-row${muted ? " menu-row--muted" : ""}`}>
      {imgSrc
        ? <img src={imgSrc} alt="" className="menu-row__img" />
        : <i className={`bi ${icon} text-brand menu-row__icon`} />
      }
      <div>
        <div className="menu-row__label">{label}</div>
        <div className="menu-row__valor">{valor}</div>
      </div>
    </div>
  );
}
