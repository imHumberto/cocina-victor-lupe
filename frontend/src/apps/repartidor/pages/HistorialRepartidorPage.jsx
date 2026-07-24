import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import dayjs from "dayjs";

export default function HistorialRepartidorPage() {
  const navigate = useNavigate();
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/repartidor/historial")
      .then(({ data }) => setHistorial(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="rep-page-header">
        <button className="rep-page-header__back" onClick={() => navigate("/repartidor")}>
          <i className="bi bi-chevron-left" />
        </button>
        <h1 className="rep-page-header__titulo">Historial</h1>
      </div>

      {loading ? (
        <div className="rep-spinner"><div className="spinner-border text-brand" /></div>
      ) : historial.length === 0 ? (
        <div className="rep-empty">
          <img src="/ilustraciones/IMG-repartidorHistorial.png" alt="" className="rep-empty__img" />
          <p className="rep-empty__text">Sin entregas en los últimos 30 días</p>
        </div>
      ) : (
        <>
          <p className="rep-historial-meta">
            Últimos 30 días — {historial.length} entrega{historial.length !== 1 ? "s" : ""}
          </p>
          <div className="d-flex flex-column gap-2">
            {historial.map(p => {
              const address = p.entrega_direccion ?? p.direccion?.direccion ?? p.cliente?.direccion_entrega;
              const entregado = p.estado === "entregado";
              return (
                <div key={p.id} className="rep-pedido-card" style={{ opacity: 0.85 }}>
                  <div className="rep-pedido-card__top">
                    <div>
                      <div className="rep-pedido-card__id">#{p.id}</div>
                      <div className="rep-pedido-card__nombre">{p.receptor_nombre || p.cliente?.nombre}</div>
                    </div>
                    <span className={`rep-badge rep-badge--${entregado ? "entregado" : "rechazado"}`}>
                      {entregado ? "Entregado" : "Rechazado"}
                    </span>
                  </div>
                  <div className="rep-pedido-card__meta">
                    {address && (
                      <div className="rep-pedido-card__meta-row">
                        <i className="bi bi-geo-alt" style={{ color: "var(--color-muted)" }} />
                        <span>{address}</span>
                      </div>
                    )}
                    <div className="rep-pedido-card__meta-row">
                      <i className="bi bi-clock" />
                      <span>{p.hora_entrega}</span>
                      <span className="ms-3" style={{ color: "var(--color-muted)", fontSize: "0.78rem" }}>
                        {dayjs(p.updated_at).format("D MMM")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
