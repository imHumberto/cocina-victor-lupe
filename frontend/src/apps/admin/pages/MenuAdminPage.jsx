import { useEffect, useState, useRef } from "react";
import api from "../../../services/api";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import weekOfYear from "dayjs/plugin/weekOfYear";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";

dayjs.extend(isoWeek);
dayjs.extend(weekOfYear);
dayjs.extend(isSameOrAfter);

const DIAS_NOMBRES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
const DIAS_CORTOS  = ["Lun", "Mar", "Mié", "Jue", "Vie"];

const CATEGORIAS = ["entrada", "plato_fuerte", "guarnicion", "bebida", "postre"];

const diaVacio = (i) => ({
  dia: i,
  activo: true,
  platos_fuertes_ids: [],
  guarniciones_ids: [],
  entrada_id: null,
  postre_id: null,
  bebida_id: null,
  alternativa_plato_disponible: true,
  alternativa_bebida_disponible: true,
  alternativa_plato_costo_extra: 0,
  alternativa_bebida_costo_extra: 0,
});

const diasVacios = () => Array.from({ length: 5 }, (_, i) => diaVacio(i));

// Calcula cuántas categorías tiene llenas un día
function categoriasLlenas(d) {
  let n = 0;
  if (d.entrada_id) n++;
  if (d.platos_fuertes_ids?.length) n++;
  if (d.guarniciones_ids?.length) n++;
  if (d.bebida_id) n++;
  if (d.postre_id) n++;
  return n;
}

// Dot de progreso por categoría
function DotsCategorias({ d }) {
  const estados = [
    !!d.entrada_id,
    !!d.platos_fuertes_ids?.length,
    !!d.guarniciones_ids?.length,
    !!d.bebida_id,
    !!d.postre_id,
  ];
  return (
    <div className="d-flex gap-1 mt-1">
      {estados.map((ok, i) => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: ok ? "#094D40" : "#ccc",
        }} />
      ))}
    </div>
  );
}

// Chip de platillo seleccionado
function Chip({ nombre, onRemove, disabled }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      background: "#e8eaed", borderRadius: 20,
      padding: "6px 10px 6px 14px",
      fontSize: "0.875rem", fontWeight: 500, color: "#374151",
    }}>
      {nombre}
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          style={{
            background: "none", border: "none", padding: "0 2px",
            cursor: "pointer", color: "#6b7280", fontSize: "1rem",
            lineHeight: 1, display: "flex", alignItems: "center",
          }}
        >×</button>
      )}
    </span>
  );
}

// Dropdown para agregar platillo
function AgregarPlatillo({ opciones, seleccionados, onAgregar, disabled }) {
  const [abierto, setAbierto] = useState(false);
  const [busq, setBusq] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const disponibles = opciones.filter(
    (p) => !seleccionados.includes(p.id) && p.nombre.toLowerCase().includes(busq.toLowerCase())
  );

  if (disabled) return null;

  return (
    <div className="position-relative d-inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => { setAbierto((a) => !a); setBusq(""); }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "#fff", border: "1.5px solid #d1d5db", borderRadius: 20,
          padding: "6px 14px", fontSize: "0.875rem", fontWeight: 600,
          cursor: "pointer", color: "#374151",
        }}
      >
        + Agregar platillo
      </button>
      {abierto && (
        <div className="bg-white border rounded-3 shadow-sm" style={{ position: "absolute", top: "110%", left: 0, zIndex: 100, minWidth: 220 }}>
          <div className="p-2 border-bottom">
            <input
              autoFocus type="text" className="form-control form-control-sm"
              placeholder="Buscar..." value={busq}
              onChange={(e) => setBusq(e.target.value)}
            />
          </div>
          <ul className="list-unstyled mb-0" style={{ maxHeight: 180, overflowY: "auto" }}>
            {disponibles.map((p) => (
              <li
                key={p.id} className="px-3 py-2 small" style={{ cursor: "pointer" }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f5f5f5"}
                onMouseLeave={(e) => e.currentTarget.style.background = ""}
                onClick={() => { onAgregar(p.id); setAbierto(false); setBusq(""); }}
              >{p.nombre}</li>
            ))}
            {disponibles.length === 0 && <li className="px-3 py-2 text-muted small">Sin resultados</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

// Footer de alternativo
function FooterAlternativo({ label, descripcion, activo, onChange, publicado }) {
  return (
    <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ background: "#f5f6f8", borderTop: "1px solid #e5e7eb" }}>
      <div>
        <div className="d-flex align-items-center gap-2 mb-1">
          <span className="fw-semibold" style={{ fontSize: "0.875rem" }}>{label}</span>
          <span
            className="rounded-pill px-2 py-0"
            style={{
              fontSize: "0.7rem", fontWeight: 600,
              background: activo ? "#dcfce7" : "#f3f4f6",
              color: activo ? "#15803d" : "#6b7280",
            }}
          >{activo ? "Activo" : "No disponible"}</span>
        </div>
        <div className="text-muted" style={{ fontSize: "0.78rem" }}>{descripcion}</div>
      </div>
      {!publicado && (
        <div className="d-flex align-items-center gap-2">
          <span className="small text-muted">{activo ? "Activo" : "Inactivo"}</span>
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={activo}
            onChange={onChange}
            style={{ width: "2.5em", height: "1.4em", cursor: "pointer" }}
          />
        </div>
      )}
    </div>
  );
}

export default function MenuAdminPage() {
  const [menus, setMenus] = useState([]);
  const [platillos, setPlatillos] = useState([]);
  const [menuActivo, setMenuActivo] = useState(null);
  const [dias, setDias] = useState(diasVacios());
  const [diaIdx, setDiaIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [modalFecha, setModalFecha] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [errorModal, setErrorModal] = useState("");
  const [tab, setTab] = useState("menu"); // menu | proximos | historico

  const lunesMinimo = dayjs().isoWeekday(1).format("YYYY-MM-DD");

  useEffect(() => {
    Promise.all([
      api.get("/admin/menus"),
      api.get("/admin/platillos"),
    ]).then(([menuRes, platRes]) => {
      setPlatillos(platRes.data);
      setMenus(menuRes.data);
      if (menuRes.data.length > 0) cargarMenuCompleto(menuRes.data[0]);
    });
  }, []);

  const porTipo = (tipo, soloAlternativas = false) =>
    platillos.filter((p) => p.tipo === tipo && p.activo && (soloAlternativas ? p.es_alternativa : !p.es_alternativa));

  // ── Cargar menú ──
  const seleccionar = (menu) => {
    setMenuActivo(menu);
    setMsg("");
    if (menu.dias?.length) {
      const completos = diasVacios().map((vacio) => {
        const d = menu.dias.find((x) => x.dia === vacio.dia);
        if (!d) return { ...vacio, activo: false };
        return {
          dia: d.dia,
          activo: d.activo ?? true,
          platos_fuertes_ids: (d.platos_fuertes ?? []).map((p) => p.id),
          guarniciones_ids: (d.guarniciones ?? []).map((p) => p.id),
          entrada_id: d.entrada?.id ?? null,
          postre_id: d.postre?.id ?? null,
          bebida_id: d.bebida?.id ?? null,
          alternativa_plato_disponible: d.alternativa_plato_disponible ?? true,
          alternativa_bebida_disponible: d.alternativa_bebida_disponible ?? true,
          alternativa_plato_costo_extra: d.alternativa_plato_costo_extra ?? 0,
          alternativa_bebida_costo_extra: d.alternativa_bebida_costo_extra ?? 0,
        };
      });
      setDias(completos);
    } else {
      setDias(diasVacios());
    }
    setDiaIdx(0);
  };

  const cargarMenuCompleto = async (menu) => {
    const { data } = await api.get(`/menu/${menu.id}`);
    seleccionar(data);
  };

  // ── Helpers de edición ──
  const setDia = (k, v) => setDias((ds) => ds.map((d, i) => i === diaIdx ? { ...d, [k]: v } : d));

  const agregarChip = (arr, id) => setDia(arr, [...(dias[diaIdx][arr] ?? []), id]);
  const quitarChip = (arr, id) => setDia(arr, dias[diaIdx][arr].filter((x) => x !== id));

  const copiarAnterior = () => {
    if (diaIdx === 0) return;
    const anterior = dias[diaIdx - 1];
    setDias((ds) => ds.map((d, i) => i === diaIdx ? { ...anterior, dia: i } : d));
  };

  // ── Guardar ──
  const guardar = async () => {
    if (!menuActivo) return;
    setSaving(true);
    setMsg("");
    try {
      const payload = dias.map((d) => ({
        dia: d.dia,
        activo: d.activo,
        platos_fuertes_ids: d.activo ? d.platos_fuertes_ids : [],
        guarniciones_ids: d.activo ? d.guarniciones_ids : [],
        entrada_id: d.activo ? d.entrada_id : null,
        postre_id: d.activo ? d.postre_id : null,
        bebida_id: d.activo ? d.bebida_id : null,
        alternativa_plato_disponible: d.alternativa_plato_disponible,
        alternativa_bebida_disponible: d.alternativa_bebida_disponible,
        alternativa_plato_costo_extra: d.alternativa_plato_costo_extra,
        alternativa_bebida_costo_extra: d.alternativa_bebida_costo_extra,
      }));
      await api.put(`/admin/menus/${menuActivo.id}/dias`, payload);
      setMsg("Guardado ✓");
    } catch (err) {
      setMsg(err.response?.data?.error ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  const publicar = async () => {
    if (!confirm("¿Publicar el menú? Se notificará a los clientes.")) return;
    const { data } = await api.post(`/admin/menus/${menuActivo.id}/publicar`);
    setMenuActivo(data);
    setMenus((ms) => ms.map((m) => m.id === data.id ? data : m));
    setMsg("Publicado ✓");
  };

  const eliminarMenu = async (m, e) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar semana del ${dayjs(m.fecha_inicio).format("DD/MM/YYYY")}?`)) return;
    await api.delete(`/admin/menus/${m.id}`);
    setMenus((ms) => ms.filter((x) => x.id !== m.id));
    if (menuActivo?.id === m.id) { setMenuActivo(null); setDias(diasVacios()); }
  };

  const crearMenu = async () => {
    if (!fechaSeleccionada) return;
    setErrorModal("");
    try {
      const { data } = await api.post("/admin/menus", { fecha_inicio: fechaSeleccionada });
      setMenus([data, ...menus]);
      setModalFecha(false);
      cargarMenuCompleto(data);
    } catch (err) {
      setErrorModal(err.response?.data?.error ?? "Error al crear el menú");
    }
  };

  const d = dias[diaIdx];
  const publicado = menuActivo?.publicado;

  // Nombres de platillos por id
  const nombrePlatillo = (id) => platillos.find((p) => p.id === id)?.nombre ?? "";

  // Alternativas globales
  const altPlatos  = platillos.filter((p) => p.tipo === "plato_fuerte" && p.es_alternativa && p.activo);
  const altBebidas = platillos.filter((p) => p.tipo === "bebida" && p.es_alternativa && p.activo);
  const altPlatosDesc  = altPlatos.map((p) => p.nombre).join(" o ");
  const altBebidasDesc = altBebidas.map((p) => p.nombre).join(" o ");

  return (
    <div className="p-4" style={{ height: "100%", overflowY: "auto" }}>
      {/* ── Header ── */}
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-3">
        <div>
          {menuActivo ? (
            <>
              <div className="d-flex align-items-center gap-2 mb-1">
                <h2 className="h3 fw-bold mb-0">Semana {dayjs(menuActivo.fecha_inicio).week()}</h2>
                <span className={`badge ${publicado ? "bg-success" : "bg-secondary"}`}>
                  {publicado ? "Publicado" : "Borrador"}
                </span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <button className="btn btn-sm btn-outline-secondary rounded-pill px-3">
                  <i className="bi bi-calendar3 me-1" />
                  {dayjs(menuActivo.fecha_inicio).format("D MMM")} – {dayjs(menuActivo.fecha_inicio).add(4, "day").format("D MMM")}
                </button>
                {!publicado && (
                  <button className="btn btn-sm btn-outline-danger rounded-pill px-2" onClick={(e) => eliminarMenu(menuActivo, e)}>
                    <i className="bi bi-trash" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <h2 className="h3 fw-bold mb-0">Menú semanal</h2>
          )}
        </div>

        <div className="d-flex align-items-center gap-2">
          {msg && <span className="small text-success fw-semibold">{msg}</span>}
          {menuActivo && !publicado && (
            <>
              <button className="btn btn-brand fw-semibold px-4" onClick={guardar} disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-1" /> : null}
                Guardar
              </button>
              <button className="btn fw-semibold px-4" style={{ background: "#094D40", color: "#fff" }} onClick={publicar}>
                Publicar
              </button>
            </>
          )}
          <button className="btn btn-outline-secondary fw-semibold px-3" onClick={() => { setFechaSeleccionada(lunesMinimo); setModalFecha(true); }}>
            + Nuevo menú
          </button>
        </div>
      </div>

      {/* ── Pestañas ── */}
      {(() => {
        const hoy = dayjs();
        const menuActual  = menus.find(m => {
          const ini = dayjs(m.fecha_inicio);
          return ini.isoWeek() === hoy.isoWeek() && ini.year() === hoy.year();
        });
        const proximos = menus.filter(m => dayjs(m.fecha_inicio).isAfter(hoy.endOf("isoWeek")));
        const historico = menus.filter(m => dayjs(m.fecha_inicio).isBefore(hoy.startOf("isoWeek")));

        const menusPorTab = { menu: menuActual ? [menuActual] : [], proximos, historico };
        const listaTab = menusPorTab[tab] ?? [];

        return (
          <>
            <div className="d-flex border-bottom mb-4">
              {[
                { key: "menu",     label: "Menú" },
                { key: "proximos", label: `Próximos${proximos.length ? ` (${proximos.length})` : ""}` },
                { key: "historico",label: "Histórico" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => { setTab(key); if (menusPorTab[key]?.length) cargarMenuCompleto(menusPorTab[key][0]); }}
                  className="btn btn-link text-decoration-none px-3 pb-2 fw-semibold"
                  style={{
                    color: tab === key ? "#094D40" : "#888",
                    borderBottom: tab === key ? "2px solid #094D40" : "2px solid transparent",
                    borderRadius: 0,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Lista de semanas dentro de la pestaña (solo Próximos e Histórico con varios) */}
            {listaTab.length > 1 && (
              <div className="d-flex gap-2 mb-3 flex-wrap">
                {listaTab.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => cargarMenuCompleto(m)}
                    className="btn btn-sm rounded-pill px-3"
                    style={{
                      background: menuActivo?.id === m.id ? "#809FB8" : "transparent",
                      color: menuActivo?.id === m.id ? "#fff" : "#374151",
                      border: "1px solid #d1d5db",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={e => { if (menuActivo?.id !== m.id) e.currentTarget.style.background = "#F1F4F9"; }}
                    onMouseLeave={e => { if (menuActivo?.id !== m.id) e.currentTarget.style.background = "transparent"; }}
                  >
                    {dayjs(m.fecha_inicio).format("MMM D")} a {dayjs(m.fecha_inicio).add(4,"day").format("MMM D")}
                    {m.publicado && <i className="bi bi-check-circle-fill ms-1" style={{ color: "#2BB316" }} />}
                  </button>
                ))}
              </div>
            )}

            {listaTab.length === 0 && !menuActivo && (
              <div className="text-center py-5 text-muted">
                <i className="bi bi-calendar-x fs-1 mb-3 d-block" />
                {tab === "menu" && <p>No hay menú para esta semana</p>}
                {tab === "proximos" && <p>No hay menús próximos creados</p>}
                {tab === "historico" && <p>Sin historial de menús</p>}
              </div>
            )}
          </>
        );
      })()}

      {menuActivo ? (
        <div className="row g-3">
          {/* ── Lista de días ── */}
          <div className="col-md-3">
            {dias.map((dCard, idx) => (
              <div
                key={idx}
                onClick={() => setDiaIdx(idx)}
                className="rounded-3 p-3 mb-2 bg-white border"
                style={{
                  cursor: "pointer",
                  borderColor: diaIdx === idx ? "#094D40 !important" : undefined,
                  outline: diaIdx === idx ? "2px solid #094D40" : "none",
                  opacity: !dCard.activo ? 0.5 : 1,
                }}
              >
                <div className="fw-bold fs-5">{DIAS_CORTOS[idx]}</div>
                {dCard.activo ? (
                  <>
                    <div className="text-muted small">{categoriasLlenas(dCard)} de 5 categorías</div>
                    <DotsCategorias d={dCard} />
                  </>
                ) : (
                  <div className="text-muted small fst-italic">Día inactivo</div>
                )}
              </div>
            ))}
          </div>

          {/* ── Editor del día ── */}
          <div className="col-md-9">
            <div className="bg-white rounded-3 p-4 border">
              {/* Cabecera del día */}
              <div className="d-flex align-items-start justify-content-between mb-4">
                <div>
                  <h4 className="fw-bold mb-0">{DIAS_NOMBRES[diaIdx]}</h4>
                  <div className="text-muted small">
                    {dayjs(menuActivo.fecha_inicio).add(diaIdx, "day").format("D [de] MMMM")}
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3">
                  {diaIdx > 0 && !publicado && (
                    <button className="btn btn-sm btn-outline-secondary" onClick={copiarAnterior}>
                      Copiar día anterior
                    </button>
                  )}
                  <div className="d-flex align-items-center gap-2">
                    <span className="small text-muted">{d.activo ? "Activo" : "Inactivo"}</span>
                    <div
                      className="form-check form-switch mb-0"
                      style={{ paddingLeft: "2.5em" }}
                    >
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={d.activo}
                        onChange={() => setDia("activo", !d.activo)}
                        disabled={publicado}
                        style={{ width: "2.5em", height: "1.4em", cursor: "pointer" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {d.activo ? (
                <div className="d-flex flex-column gap-3">

                  {/* Entrada */}
                  <SeccionCategoria
                    titulo="Entrada"
                    count={d.entrada_id ? 1 : 0}
                    disabled={publicado}
                  >
                    {d.entrada_id && (
                      <Chip nombre={nombrePlatillo(d.entrada_id)} onRemove={() => setDia("entrada_id", null)} disabled={publicado} />
                    )}
                    {!d.entrada_id && (
                      <AgregarPlatillo
                        opciones={porTipo("entrada")}
                        seleccionados={d.entrada_id ? [d.entrada_id] : []}
                        onAgregar={(id) => setDia("entrada_id", id)}
                        disabled={publicado}
                      />
                    )}
                  </SeccionCategoria>

                  {/* Plato fuerte */}
                  <SeccionCategoria
                    titulo="Plato fuerte"
                    count={d.platos_fuertes_ids.length}
                    footer={altPlatos.length > 0 ? (
                      <FooterAlternativo
                        label="Alternativo fijo"
                        descripcion={altPlatosDesc}
                        activo={d.alternativa_plato_disponible}
                        onChange={() => setDia("alternativa_plato_disponible", !d.alternativa_plato_disponible)}
                        publicado={publicado}
                      />
                    ) : null}
                  >
                    {d.platos_fuertes_ids.map((id) => (
                      <Chip key={id} nombre={nombrePlatillo(id)} onRemove={() => quitarChip("platos_fuertes_ids", id)} disabled={publicado} />
                    ))}
                    <AgregarPlatillo
                      opciones={porTipo("plato_fuerte")}
                      seleccionados={d.platos_fuertes_ids}
                      onAgregar={(id) => agregarChip("platos_fuertes_ids", id)}
                      disabled={publicado}
                    />
                  </SeccionCategoria>

                  {/* Guarnición */}
                  <SeccionCategoria titulo="Guarnición" count={d.guarniciones_ids.length} disabled={publicado}>
                    {d.guarniciones_ids.map((id) => (
                      <Chip key={id} nombre={nombrePlatillo(id)} onRemove={() => quitarChip("guarniciones_ids", id)} disabled={publicado} />
                    ))}
                    <AgregarPlatillo
                      opciones={porTipo("guarnicion")}
                      seleccionados={d.guarniciones_ids}
                      onAgregar={(id) => agregarChip("guarniciones_ids", id)}
                      disabled={publicado}
                    />
                  </SeccionCategoria>

                  {/* Bebida */}
                  <SeccionCategoria
                    titulo="Bebida"
                    count={d.bebida_id ? 1 : 0}
                    footer={altBebidas.length > 0 ? (
                      <FooterAlternativo
                        label="Alternativo de bebida fijo"
                        descripcion={altBebidasDesc}
                        activo={d.alternativa_bebida_disponible}
                        onChange={() => setDia("alternativa_bebida_disponible", !d.alternativa_bebida_disponible)}
                        publicado={publicado}
                      />
                    ) : null}
                  >
                    {d.bebida_id && (
                      <Chip nombre={nombrePlatillo(d.bebida_id)} onRemove={() => setDia("bebida_id", null)} disabled={publicado} />
                    )}
                    {!d.bebida_id && (
                      <AgregarPlatillo
                        opciones={porTipo("bebida")}
                        seleccionados={d.bebida_id ? [d.bebida_id] : []}
                        onAgregar={(id) => setDia("bebida_id", id)}
                        disabled={publicado}
                      />
                    )}
                  </SeccionCategoria>

                  {/* Postre */}
                  <SeccionCategoria titulo="Postre" count={d.postre_id ? 1 : 0} disabled={publicado}>
                    {d.postre_id && (
                      <Chip nombre={nombrePlatillo(d.postre_id)} onRemove={() => setDia("postre_id", null)} disabled={publicado} />
                    )}
                    {!d.postre_id && (
                      <AgregarPlatillo
                        opciones={porTipo("postre")}
                        seleccionados={d.postre_id ? [d.postre_id] : []}
                        onAgregar={(id) => setDia("postre_id", id)}
                        disabled={publicado}
                      />
                    )}
                  </SeccionCategoria>

                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-moon fs-2 mb-2 d-block" />
                  Día inactivo — activa el switch para agregar platillos
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-calendar-week fs-1 mb-3 d-block" />
          <p>No hay ningún menú seleccionado</p>
          {menus.length > 0
            ? <p className="small">Selecciona una semana arriba</p>
            : <button className="btn btn-brand px-4" onClick={() => { setFechaSeleccionada(lunesMinimo); setModalFecha(true); }}>Crear primer menú</button>
          }
        </div>
      )}

      {/* Modal nueva semana */}
      {modalFecha && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="modal-dialog modal-sm modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title fw-bold">Nuevo menú semanal</h6>
                <button className="btn-close" onClick={() => setModalFecha(false)} />
              </div>
              <div className="modal-body">
                {errorModal && <div className="alert alert-danger py-2 small">{errorModal}</div>}
                <label className="form-label small fw-semibold">Semana que inicia el lunes:</label>
                <ModalNuevoMenu
                  fechaSeleccionada={fechaSeleccionada}
                  setFechaSeleccionada={setFechaSeleccionada}
                  setErrorModal={setErrorModal}
                  lunesMinimo={lunesMinimo}
                  menus={menus}
                />
              </div>
              <div className="modal-footer">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setModalFecha(false)}>Cancelar</button>
                <button
                  className="btn btn-sm btn-brand"
                  onClick={crearMenu}
                  disabled={!fechaSeleccionada || menus.some(m => m.fecha_inicio === fechaSeleccionada)}
                >Crear</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal: cuerpo del formulario nuevo menú
function ModalNuevoMenu({ fechaSeleccionada, setFechaSeleccionada, setErrorModal, lunesMinimo, menus }) {
  const ocupada = fechaSeleccionada && menus.some(m => m.fecha_inicio === fechaSeleccionada);
  const semanasOcupadas = menus.filter(m => dayjs(m.fecha_inicio).isSameOrAfter(dayjs(), "week"));

  return (
    <>
      <input
        type="date"
        className={`form-control ${ocupada ? "is-invalid" : ""}`}
        value={fechaSeleccionada}
        min={lunesMinimo}
        onChange={(e) => { setFechaSeleccionada(e.target.value); setErrorModal(""); }}
      />
      {ocupada ? (
        <div className="d-flex align-items-center gap-1 mt-2 text-danger small fw-semibold">
          <i className="bi bi-lock-fill" /> Esa semana ya tiene un menú creado
        </div>
      ) : fechaSeleccionada ? (
        <div className="text-muted small mt-2">
          Semana del {dayjs(fechaSeleccionada).format("DD/MM")} al {dayjs(fechaSeleccionada).add(4, "day").format("DD/MM/YYYY")}
        </div>
      ) : null}

      {semanasOcupadas.length > 0 && (
        <div className="mt-3">
          <div className="text-muted mb-1" style={{ fontSize: "0.72rem" }}>Semanas ya ocupadas:</div>
          <div className="d-flex flex-wrap gap-1">
            {semanasOcupadas.map(m => (
              <span key={m.id} className="badge rounded-pill" style={{ background: "#fee2e2", color: "#b91c1c", fontSize: "0.7rem" }}>
                <i className="bi bi-lock-fill me-1" />
                {dayjs(m.fecha_inicio).format("DD/MM")} – {dayjs(m.fecha_inicio).add(4, "day").format("DD/MM")}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// Sección de categoría
function SeccionCategoria({ titulo, count, children, footer }) {
  return (
    <div className="rounded-3 overflow-hidden" style={{ border: "1px solid #e5e7eb", background: "#fff" }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center px-4 py-3" style={{ background: "#f8f9fa" }}>
        <span className="fw-semibold" style={{ fontSize: "0.95rem" }}>{titulo}</span>
        <span className="text-muted small">{count} Platillo{count !== 1 ? "s" : ""}</span>
      </div>
      {/* Body */}
      <div className="px-4 py-3 d-flex flex-wrap align-items-center gap-2">
        {children}
      </div>
      {/* Footer (alternativo) */}
      {footer}
    </div>
  );
}
