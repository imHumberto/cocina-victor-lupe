import { useEffect, useState } from "react";
import api from "../../../services/api";

const TIPOS = [
  { valor: "entrada",      label: "Entrada" },
  { valor: "plato_fuerte", label: "Plato Fuerte" },
  { valor: "guarnicion",   label: "Guarnición" },
  { valor: "postre",       label: "Postre" },
  { valor: "bebida",       label: "Bebida" },
];

const FORM_VACIO = { nombre: "", tipo: "", descripcion: "", foto_url: "", activo: true, es_alternativa: false };

export default function PlatillosPage() {
  const [platillos, setPlatillos] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [form, setForm] = useState(FORM_VACIO);
  const [editId, setEditId] = useState(null);
  const [msg, setMsg] = useState({ texto: "", tipo: "info" });

  useEffect(() => {
    api.get("/admin/platillos").then(({ data }) => setPlatillos(data));
  }, []);

  const set = (k) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const cancelar = () => { setEditId(null); setForm(FORM_VACIO); setMsg({ texto: "", tipo: "info" }); };

  const guardar = async (e) => {
    e.preventDefault();
    setMsg({ texto: "", tipo: "info" });
    try {
      if (editId) {
        const { data } = await api.patch(`/admin/platillos/${editId}`, form);
        setPlatillos((ps) => ps.map((p) => p.id === editId ? data : p));
        setMsg({ texto: "Platillo actualizado", tipo: "success" });
      } else {
        const { data } = await api.post("/admin/platillos", form);
        setPlatillos((ps) => [...ps, data]);
        setMsg({ texto: "Platillo creado", tipo: "success" });
      }
      setForm(FORM_VACIO);
      setEditId(null);
    } catch (err) {
      setMsg({ texto: err.response?.data?.error ?? "Error", tipo: "danger" });
    }
  };

  const editar = (p) => {
    setForm({ nombre: p.nombre, tipo: p.tipo, descripcion: p.descripcion ?? "", foto_url: p.foto_url ?? "", activo: p.activo, es_alternativa: p.es_alternativa ?? false });
    setEditId(p.id);
    setMsg({ texto: "", tipo: "info" });
  };

  const toggleActivo = async (p) => {
    const { data } = await api.patch(`/admin/platillos/${p.id}`, { activo: !p.activo });
    setPlatillos((ps) => ps.map((x) => x.id === p.id ? data : x));
  };

  const eliminar = async (p) => {
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    await api.delete(`/admin/platillos/${p.id}`);
    setPlatillos((ps) => ps.filter((x) => x.id !== p.id));
    if (editId === p.id) cancelar();
  };

  const labelTipo = (valor) => TIPOS.find((t) => t.valor === valor)?.label ?? valor;
  const visible = filtroTipo === "todos" ? platillos : platillos.filter((p) => p.tipo === filtroTipo);

  return (
    <div className="p-4" style={{ height: "100%", overflowY: "auto" }}>
      <h2 className="h5 fw-bold mb-3">Catálogo de platillos</h2>
      <div className="row g-4">
        {/* Formulario */}
        <div className="col-md-4">
          <div className="card card-sazon p-3">
            <h6 className="fw-bold text-brand mb-3">{editId ? "Editar platillo" : "Nuevo platillo"}</h6>
            {msg.texto && <div className={`alert alert-${msg.tipo} py-2`}>{msg.texto}</div>}
            <form onSubmit={guardar}>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Nombre</label>
                <input type="text" className="form-control form-control-sm" value={form.nombre} onChange={set("nombre")} required />
              </div>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Tipo</label>
                <select className="form-select form-select-sm" value={form.tipo} onChange={set("tipo")} required>
                  <option value="">— Selecciona un tipo —</option>
                  {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.label}</option>)}
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Descripción <span className="text-muted fw-normal">(opcional)</span></label>
                <textarea
                  className="form-control form-control-sm"
                  rows={2}
                  placeholder="Ingredientes, modo de preparación, alergenos..."
                  value={form.descripcion}
                  onChange={set("descripcion")}
                />
              </div>
              <div className="mb-2">
                <label className="form-label small fw-semibold">URL foto <span className="text-muted fw-normal">(opcional)</span></label>
                <input type="url" className="form-control form-control-sm" value={form.foto_url} onChange={set("foto_url")} />
              </div>
              <div className="form-check form-switch mb-2">
                <input className="form-check-input" type="checkbox" id="activo" checked={form.activo} onChange={set("activo")} />
                <label className="form-check-label small" htmlFor="activo">Activo</label>
              </div>
              <div className="form-check form-switch mb-3">
                <input className="form-check-input" type="checkbox" id="es_alternativa" checked={form.es_alternativa} onChange={set("es_alternativa")} />
                <label className="form-check-label small" htmlFor="es_alternativa">Es alternativa fija</label>
              </div>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-sm btn-brand">{editId ? "Actualizar" : "Crear"}</button>
                {editId && <button type="button" className="btn btn-sm btn-outline-secondary" onClick={cancelar}>Cancelar</button>}
              </div>
            </form>
          </div>
        </div>

        {/* Tabla */}
        <div className="col-md-8">
          <div className="d-flex gap-2 flex-wrap mb-3">
            <button className={`btn btn-sm ${filtroTipo === "todos" ? "btn-brand" : "btn-outline-brand"}`} onClick={() => setFiltroTipo("todos")}>Todos</button>
            {TIPOS.map((t) => (
              <button key={t.valor} className={`btn btn-sm ${filtroTipo === t.valor ? "btn-brand" : "btn-outline-brand"}`} onClick={() => setFiltroTipo(t.valor)}>{t.label}</button>
            ))}
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle">
              <thead className="table-light">
                <tr><th>Nombre</th><th>Tipo</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className={editId === p.id ? "table-warning" : ""}>
                    <td>
                      <div>{p.nombre}</div>
                      {p.descripcion && <div className="text-muted small">{p.descripcion}</div>}
                    </td>
                    <td>
                      <span className="badge bg-secondary me-1">{labelTipo(p.tipo)}</span>
                      {p.es_alternativa && <span className="badge bg-info text-dark">Alternativa</span>}
                    </td>
                    <td>
                      <span className={`badge ${p.activo ? "bg-success" : "bg-secondary"}`}>{p.activo ? "Activo" : "Inactivo"}</span>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-brand" onClick={() => editar(p)}>Editar</button>
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => toggleActivo(p)}>
                          {p.activo ? "Desactivar" : "Activar"}
                        </button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(p)} title="Eliminar">
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr><td colSpan="4" className="text-muted text-center py-3">Sin platillos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
