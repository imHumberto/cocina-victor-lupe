import { useEffect, useState } from "react";
import api from "../../../services/api";
import EstadoBadge from "../../../components/shared/EstadoBadge";
import dayjs from "dayjs";

export default function MisPedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/pedidos/mis-pedidos")
      .then(({ data }) => setPedidos(data))
      .finally(() => setLoading(false));
  }, []);

  const cancelar = async (id) => {
    if (!confirm("¿Cancelar este pedido?")) return;
    try {
      const { data } = await api.delete(`/pedidos/${id}`);
      setPedidos((ps) => ps.map((p) => p.id === id ? data : p));
    } catch (err) {
      alert(err.response?.data?.error ?? "No se pudo cancelar");
    }
  };

  if (loading) return <div className="d-flex justify-content-center mt-5"><div className="spinner-border text-brand" /></div>;

  return (
    <div className="p-3">
      <h2 className="h5 fw-bold mb-3">Mis pedidos</h2>
      {pedidos.length === 0 ? (
        <div className="text-center text-muted py-5">
          <i className="bi bi-bag-x fs-1 d-block mb-2" />
          Aún no tienes pedidos
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {pedidos.map((p) => (
            <div className="card card-sazon p-3" key={p.id}>
              <div className="d-flex justify-content-between align-items-start mb-1">
                <span className="fw-semibold">Pedido #{p.id}</span>
                <EstadoBadge estado={p.estado} />
              </div>
              <div className="text-muted small mb-1">
                {dayjs(p.created_at).format("DD MMM YYYY")} · {p.hora_entrega}
              </div>
              <div className="small">
                Plato: <strong>{p.plato_elegido === "principal" ? "Principal" : "Alternativa"}</strong> ·
                Bebida: <strong>{p.bebida_elegida === "principal" ? "Principal" : "Alternativa"}</strong>
              </div>
              <div className="small text-muted">Pago: {p.metodo_pago}</div>
              {p.notas && <div className="small text-muted mt-1">Nota: {p.notas}</div>}
              {p.estado === "pendiente" && (
                <button className="btn btn-sm btn-outline-danger mt-2 align-self-start" onClick={() => cancelar(p.id)}>
                  Cancelar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
