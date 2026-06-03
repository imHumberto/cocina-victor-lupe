import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

function platilloNombre(p) {
  return p?.nombre ?? "—";
}

export default function MenuPage() {
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const hoyIdx = dayjs().day() === 0 ? -1 : dayjs().day() - 1; // 0=lunes
  const [tab, setTab] = useState(hoyIdx >= 0 && hoyIdx <= 4 ? hoyIdx : 0);

  useEffect(() => {
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
  const esHoy = tab === hoyIdx;
  const puedeOrdenar = esHoy; // TODO: descomentar para producción
  // const puedeOrdenar = esHoy && dayjs().hour() * 60 + dayjs().minute() < 15 * 60 + 40;

  return (
    <div className="p-3">
      <h2 className="h5 fw-bold mb-1">Menú semanal</h2>
      <p className="text-muted small mb-3">
        Semana del {dayjs(menu.fecha_inicio).format("D [de] MMMM")}
      </p>

      {/* Tabs días */}
      <ul className="nav nav-pills mb-3 flex-nowrap overflow-auto" style={{ gap: "6px" }}>
        {DIAS.map((nombre, i) => {
          const tieneDia = dias.some((d) => d.dia === i);
          return (
            <li className="nav-item" key={i}>
              <button
                className={`nav-link px-3 py-1 ${tab === i ? "active bg-brand" : "text-brand"} ${!tieneDia ? "opacity-50" : ""}`}
                onClick={() => tieneDia && setTab(i)}
                disabled={!tieneDia}
              >
                {nombre.slice(0, 3)}
                {i === hoyIdx && <span className="ms-1 badge bg-warning text-dark" style={{ fontSize: ".6rem" }}>Hoy</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {diaActivo ? (
        <div className="card card-sazon p-3">
          <h3 className="h6 fw-bold text-brand mb-3">{DIAS[tab]}</h3>
          <MenuRow icon="bi-egg-fried" label="Entrada" valor={platilloNombre(diaActivo.entrada)} />
          <MenuRow icon="bi-bowl-hot" label="Plato fuerte" valor={diaActivo.platos_fuertes?.map(p => p.nombre).join(" / ") || "—"} />
          {diaActivo.alternativa_plato_disponible && diaActivo.alternativas_plato?.length > 0 && (
            <MenuRow
              icon="bi-arrow-repeat"
              label="Alternativa"
              valor={`${diaActivo.alternativas_plato.map(p => p.nombre).join(" o ")}${diaActivo.alternativa_plato_costo_extra > 0 ? ` (+$${diaActivo.alternativa_plato_costo_extra})` : ""}`}
              muted
            />
          )}
          <MenuRow icon="bi-grid-3x3-gap" label="Guarnición" valor={diaActivo.guarniciones?.map(p => p.nombre).join(" / ") || "—"} />
          <MenuRow icon="bi-cup-straw" label="Bebida" valor={platilloNombre(diaActivo.bebida)} />
          {diaActivo.alternativa_bebida_disponible && diaActivo.alternativas_bebida?.length > 0 && (
            <MenuRow
              icon="bi-cup"
              label="Alt. bebida"
              valor={`${diaActivo.alternativas_bebida.map(p => p.nombre).join(" o ")}${diaActivo.alternativa_bebida_costo_extra > 0 ? ` (+$${diaActivo.alternativa_bebida_costo_extra})` : ""}`}
              muted
            />
          )}
          <MenuRow icon="bi-cake2" label="Postre" valor={platilloNombre(diaActivo.postre)} />

          {puedeOrdenar && (
            <button
              className="btn btn-brand w-100 mt-3 py-2 fw-semibold"
              onClick={() => navigate("/cliente/ordenar")}
            >
              <i className="bi bi-bag-plus me-2" />
              Ordenar para hoy
            </button>
          )}
          {esHoy && !puedeOrdenar && (
            <p className="text-muted text-center small mt-3">El tiempo para ordenar hoy ya pasó (límite 3:40 PM)</p>
          )}
        </div>
      ) : (
        <div className="text-center text-muted py-5">No hay menú para este día</div>
      )}
    </div>
  );
}

function MenuRow({ icon, label, valor, muted }) {
  return (
    <div className={`d-flex align-items-start py-2 border-bottom ${muted ? "opacity-75" : ""}`}>
      <i className={`bi ${icon} text-brand me-3 fs-5 mt-1`} />
      <div>
        <div className="text-muted small">{label}</div>
        <div className="fw-semibold">{valor}</div>
      </div>
    </div>
  );
}
