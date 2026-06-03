import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../services/api";
import useAuthStore from "../../../store/authStore";
import { saveCart, loadCart, clearCart } from "../../../utils/cart";
import dayjs from "dayjs";
import PhoneInput from "../../../components/shared/PhoneInput";
import BottomSheet from "../../../components/shared/BottomSheet";

const TIPOS_VIVIENDA = [
  { value: "casa",         icon: "🏠", label: "Casa" },
  { value: "departamento", icon: "🏢", label: "Departamento" },
  { value: "oficina",      icon: "💼", label: "Oficina" },
  { value: "empresa",      icon: "🏭", label: "Empresa" },
  { value: "otro",         icon: "📍", label: "Otro" },
];

const PRECIO_BASE = 130;
const EXTRA_PLATO = 20;   // Milanesa empanizada o a la plancha
const EXTRA_BEBIDA = 10;  // Refresco
const HORAS = ["13:00","13:30","14:00","14:30","15:00","15:30","16:00","16:30","17:00"];

// ── Radio option ──
function RadioOpcion({ nombre, precio, seleccionado, onSelect, descripcion }) {
  return (
    <label
      className="d-flex align-items-center justify-content-between p-3 border rounded-3 mb-2"
      style={{ cursor: "pointer", background: seleccionado ? "#fff5f5" : "#fff", borderColor: seleccionado ? "#ED4137" : "#dee2e6" }}
      onClick={onSelect}
    >
      <div style={{ minWidth: 0 }}>
        <div className="fw-semibold">{nombre}</div>
        {descripcion && <div className="text-muted small">{descripcion}</div>}
        {precio > 0 && <div className="small" style={{ color: "#ED4137" }}>+${precio}</div>}
      </div>
      <div style={{ width: 22, height: 22, borderRadius: "50%", border: seleccionado ? "6px solid #ED4137" : "2px solid #ccc", flexShrink: 0, marginLeft: 8 }} />
    </label>
  );
}

// ── Sección obligatoria ──
function Seccion({ titulo, children }) {
  return (
    <div className="mb-4">
      <h3 className="fw-semibold mb-2 text-muted" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{titulo}</h3>
      {children}
    </div>
  );
}

// ── Sección opcional — el "Sin X" es una opción de radio más ──
function SeccionOpcional({ titulo, activo, onToggle, children }) {
  return (
    <div className="mb-4">
      <h3 className="fw-semibold mb-2 text-muted" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{titulo}</h3>
      {children}
      <RadioOpcion
        nombre={`Sin ${titulo.toLowerCase()}`}
        precio={0}
        seleccionado={!activo}
        onSelect={onToggle}
      />
    </div>
  );
}

// ── Item fijo como radio seleccionado (sin elección) ──
function ItemFijo({ nombre, descripcion, seleccionado, onSelect }) {
  return (
    <RadioOpcion nombre={nombre} precio={0} descripcion={descripcion} seleccionado={seleccionado} onSelect={onSelect} />
  );
}

function FilaResumen({ label, valor, sub, muted }) {
  return (
    <div className="d-flex justify-content-between align-items-start mb-2">
      <span className="text-muted small" style={{ flexShrink: 0, minWidth: 80 }}>{label}</span>
      <div className="text-end">
        <div className={`small fw-semibold ${muted ? "text-muted" : ""}`}>{valor}</div>
        {sub && <div className="text-muted" style={{ fontSize: "0.72rem" }}>{sub}</div>}
      </div>
    </div>
  );
}

function DatoTransferencia({ label, valor, copiable }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = () => {
    navigator.clipboard.writeText(valor);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };
  return (
    <div className="d-flex align-items-center justify-content-between py-2 border-bottom">
      <div>
        <div className="text-muted" style={{ fontSize: "0.72rem" }}>{label}</div>
        <div className="fw-semibold small">{valor}</div>
      </div>
      {copiable && (
        <button type="button" className="btn btn-sm btn-link p-0 ms-2" onClick={copiar} style={{ color: copiado ? "#28a745" : "#ED4137" }}>
          <i className={`bi ${copiado ? "bi-check-lg" : "bi-copy"}`} />
        </button>
      )}
    </div>
  );
}

const comidaVacia = (dia) => ({
  platoId: dia?.platos_fuertes?.[0]?.id ?? null,
  esAltPlato: false,
  conEntrada: true,
  guarnicionId: dia?.guarniciones?.[0]?.id ?? null,
  conGuarnicion: true,
  bebidaId: dia?.bebida?.id ?? null,
  esAltBebida: false,
  conBebida: true,
  conPostre: true,
  notas: "",
});

export default function OrdenarPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const cantidadInicial = location.state?.cantidad ?? 1;

  const [dia, setDia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paso, setPaso] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Paso 1: array de comidas
  const [comidas, setComidas] = useState(Array.from({ length: cantidadInicial }, () => comidaVacia(null)));
  const [comidasAbiertas, setComidasAbiertas] = useState(new Set(Array.from({ length: cantidadInicial }, (_, i) => i)));

  const toggleComida = (idx) => setComidasAbiertas(prev => {
    const next = new Set(prev);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    return next;
  });

  // Paso 2
  const [receptor, setReceptor] = useState(user?.nombre ?? "");
  const [telefonoReceptor, setTelefonoReceptor] = useState(user?.telefono_whatsapp ?? "");
  const [editandoTelefono, setEditandoTelefono] = useState(false);
  const [direccionSeleccionada, setDireccionSeleccionada] = useState(null); // DireccionCliente elegida
  const [direccionesGuardadas, setDireccionesGuardadas] = useState([]);
  const [sheetAbierto, setSheetAbierto] = useState(false);
  // Estado para agregar nueva dirección dentro del sheet
  const [sheetPaso, setSheetPaso] = useState("lista"); // lista | buscar | tipo
  const [busquedaDir, setBusquedaDir] = useState("");
  const [resultadosDir, setResultadosDir] = useState([]);
  const [buscandoDir, setBuscandoDir] = useState(false);
  const [nuevaDireccion, setNuevaDireccion] = useState(null);
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [nuevoAlias, setNuevoAlias] = useState("");
  const [nuevaReferencia, setNuevaReferencia] = useState("");
  const [horaEntrega, setHoraEntrega] = useState("13:00");

  // Paso 3
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [comprobante, setComprobante] = useState(null);
  const [notas, setNotas] = useState("");
  const [sheetTransferencia, setSheetTransferencia] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/menu/dia-hoy"),
      api.get("/pedidos/mis-direcciones"),
    ]).then(([menuRes, dirsRes]) => {
      const data = menuRes.data;
      setDia(data);

      const dirs = dirsRes.data;
      setDireccionesGuardadas(dirs);

      // Restaurar carrito guardado si existe
      const saved = loadCart(user.id);
      if (saved) {
        setComidas(saved.comidas ?? Array.from({ length: cantidadInicial }, () => comidaVacia(data)));
        setPaso(saved.paso ?? 1);
        setHoraEntrega(saved.horaEntrega ?? "13:00");
        setMetodoPago(saved.metodoPago ?? "efectivo");
        setReceptor(saved.receptor ?? user?.nombre ?? "");
        setTelefonoReceptor(saved.telefonoReceptor ?? user?.telefono_whatsapp ?? "");
        if (saved.direccionSeleccionada) {
          setDireccionSeleccionada(saved.direccionSeleccionada);
        } else {
          const principal = dirs.find(d => d.es_principal) ?? dirs[0];
          if (principal) setDireccionSeleccionada(principal);
        }
      } else {
        setComidas(Array.from({ length: cantidadInicial }, () => comidaVacia(data)));
        const principal = dirs.find(d => d.es_principal) ?? dirs[0];
        if (principal) setDireccionSeleccionada(principal);
      }
    }).catch(() => setError("No hay menú disponible hoy"))
      .finally(() => setLoading(false));
  }, []);

  // Persistir carrito cuando cambia cualquier dato relevante
  useEffect(() => {
    if (loading || !dia) return;
    saveCart(user.id, {
      comidas, paso, horaEntrega, metodoPago,
      receptor, telefonoReceptor, direccionSeleccionada,
    });
  }, [comidas, paso, horaEntrega, metodoPago, receptor, telefonoReceptor, direccionSeleccionada]);

  const setComida = (idx, key, val) =>
    setComidas(cs => cs.map((c, i) => i === idx ? { ...c, [key]: val } : c));

  const totalComida = (c) => PRECIO_BASE + (c.esAltPlato ? EXTRA_PLATO : 0) + (c.esAltBebida ? EXTRA_BEBIDA : 0);
  const total = comidas.reduce((sum, c) => sum + totalComida(c), 0);

  // compat helpers que usaba el viejo código (para confirmación)
  const esAltPlato = comidas[0]?.esAltPlato;
  const esAltBebida = comidas[0]?.esAltBebida;
  const conEntrada = comidas[0]?.conEntrada;
  const conGuarnicion = comidas[0]?.conGuarnicion;
  const guarnicionId = comidas[0]?.guarnicionId;
  const conBebida = comidas[0]?.conBebida;
  const conPostre = comidas[0]?.conPostre;
  const platoId = comidas[0]?.platoId;
  const bebidaId = comidas[0]?.bebidaId;
  const platilloElegido = esAltPlato ? dia?.alternativas_plato?.find(p => p.id === platoId) : dia?.platos_fuertes?.find(p => p.id === platoId);
  const bebidaElegida = esAltBebida ? dia?.alternativas_bebida?.find(p => p.id === bebidaId) : dia?.bebida;


  const debounceRef = useRef(null);

  const abrirSheet = () => { setSheetPaso("lista"); setSheetAbierto(true); setBusquedaDir(""); setResultadosDir([]); setNuevaDireccion(null); setNuevoTipo(""); setNuevoAlias(""); setNuevaReferencia(""); };

  const onBusquedaChange = (valor) => {
    setBusquedaDir(valor);
    setResultadosDir([]);
    clearTimeout(debounceRef.current);
    if (valor.trim().length >= 3) {
      debounceRef.current = setTimeout(() => buscarDireccion(valor), 500);
    }
  };

  const buscarDireccion = async (q) => {
    const query = q ?? busquedaDir;
    if (!query.trim() || query.trim().length < 3) return;
    setBuscandoDir(true);
    setResultadosDir([]);
    try {
      const res = await fetch(`/api/geo/buscar?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResultadosDir(data);
    } finally { setBuscandoDir(false); }
  };

  const seleccionarResultadoDir = async (r) => {
    let lat = r.lat, lng = r.lon;
    if (!lat) {
      const res = await fetch(`/api/geo/detalle?place_id=${r.place_id}`);
      const d = await res.json();
      lat = d.lat; lng = d.lng;
    }
    setNuevaDireccion({ ...r, lat, lng });
    setResultadosDir([]);
    setSheetPaso("tipo");
  };

  const usarNuevaDireccion = () => {
    const alias = nuevoAlias.trim() || TIPOS_VIVIENDA.find(t => t.value === nuevoTipo)?.label || "Nueva dirección";
    // Dirección de uso único — no se guarda en el perfil
    setDireccionSeleccionada({
      id: null,
      alias,
      tipo_vivienda: nuevoTipo,
      direccion: nuevaDireccion.display_name,
      referencias: nuevaReferencia,
      es_principal: false,
    });
    setSheetAbierto(false);
  };

  const confirmar = async () => {
    setSubmitting(true);
    try {
      let comprobante_url = "";
      if (metodoPago === "transferencia" && comprobante) {
        // Por ahora solo guardamos el nombre del archivo
        comprobante_url = comprobante.name;
      }

      clearCart(user.id);
      await api.post("/pedidos/", {
        hora_entrega: horaEntrega,
        plato_elegido: esAltPlato ? "alternativa" : "principal",
        bebida_elegida: esAltBebida ? "alternativa" : "principal",
        plato_id: platoId,
        bebida_id: bebidaId,
        metodo_pago: metodoPago,
        comprobante_url: comprobante_url || null,
        notas: notas || null,
        receptor_nombre: receptor,
        receptor_telefono: telefonoReceptor,
        direccion_id: direccionSeleccionada?.id ?? null,
        entrega_direccion: !direccionSeleccionada?.id ? (direccionSeleccionada?.direccion ?? null) : null,
        entrega_referencias: !direccionSeleccionada?.id ? (direccionSeleccionada?.referencias ?? null) : null,
      });
      setPaso(4);
    } catch (err) {
      setError(err.response?.data?.error ?? "Error al confirmar el pedido");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
      <div className="spinner-border text-brand" />
    </div>
  );

  if (error && paso !== 3) return (
    <div className="p-4 text-center">
      <span style={{ fontSize: "2.5rem" }}>😕</span>
      <p className="mt-2 fw-semibold">{error}</p>
      <button className="btn btn-outline-secondary mt-2" onClick={() => navigate(-1)}>Regresar</button>
    </div>
  );

  // ── Paso 4: Confirmado ──
  if (paso === 4) return (
    <div className="p-4" style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 100 }}>
      <div className="text-center mb-4">
        <div style={{ fontSize: "4rem" }}>🎉</div>
        <h2 className="fw-bold mt-2">¡Pedido confirmado!</h2>
        <p className="text-muted small">Tu comida está siendo preparada</p>
      </div>

      <div className="rounded-3 p-4 bg-white border mb-3">
        {/* Quién recibe */}
        <p className="fw-bold mb-3" style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#aaa" }}>Entrega</p>
        <FilaResumen label="Recibe" valor={receptor} />
        <FilaResumen label="Hora" valor={horaEntrega} />
        <FilaResumen label="Dirección" valor={direccionSeleccionada?.alias ?? "—"} sub={direccionSeleccionada?.direccion} />

        <hr className="my-3" />

        {/* Platos */}
        <p className="fw-bold mb-3" style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#aaa" }}>Tu pedido</p>
        {comidas.map((c, idx) => {
          const pEleg = c.esAltPlato ? dia?.alternativas_plato?.find(p => p.id === c.platoId) : dia?.platos_fuertes?.find(p => p.id === c.platoId);
          const bEleg = c.esAltBebida ? dia?.alternativas_bebida?.find(p => p.id === c.bebidaId) : dia?.bebida;
          const gEleg = dia?.guarniciones?.find(g => g.id === c.guarnicionId) ?? dia?.guarniciones?.[0];
          return (
            <div key={idx} className={idx < comidas.length - 1 ? "mb-3 pb-3 border-bottom" : "mb-0"}>
              {comidas.length > 1 && (
                <div className="fw-semibold small mb-2" style={{ color: "#ED4137" }}>Comida {idx + 1}</div>
              )}
              {dia?.entrada && <FilaResumen label="Entrada" valor={c.conEntrada ? dia.entrada.nombre : "Sin entrada"} muted={!c.conEntrada} />}
              {pEleg && <FilaResumen label="Plato" valor={pEleg.nombre} />}
              {dia?.guarniciones?.length > 0 && <FilaResumen label="Guarnición" valor={c.conGuarnicion ? (gEleg?.nombre ?? "—") : "Sin guarnición"} muted={!c.conGuarnicion} />}
              <FilaResumen label="Bebida" valor={c.conBebida ? (bEleg?.nombre ?? "—") : "Sin bebida"} muted={!c.conBebida} />
              {dia?.postre && <FilaResumen label="Postre" valor={c.conPostre ? dia.postre.nombre : "Sin postre"} muted={!c.conPostre} />}
              {c.notas && <FilaResumen label="Nota" valor={c.notas} muted />}
            </div>
          );
        })}

        <hr className="my-3" />

        {/* Precios */}
        <div className="d-flex justify-content-between mb-1">
          <span className="small">Comida del día × {comidas.length}</span>
          <span className="small">${PRECIO_BASE * comidas.length}</span>
        </div>
        {comidas.some(c => c.esAltPlato) && (
          <div className="d-flex justify-content-between mb-1">
            <span className="small fst-italic text-muted">Alternativa plato × {comidas.filter(c => c.esAltPlato).length}</span>
            <span className="small fst-italic text-muted">+${EXTRA_PLATO * comidas.filter(c => c.esAltPlato).length}</span>
          </div>
        )}
        {comidas.some(c => c.esAltBebida) && (
          <div className="d-flex justify-content-between mb-1">
            <span className="small fst-italic text-muted">Alternativa bebida × {comidas.filter(c => c.esAltBebida).length}</span>
            <span className="small fst-italic text-muted">+${EXTRA_BEBIDA * comidas.filter(c => c.esAltBebida).length}</span>
          </div>
        )}
        <hr className="my-3" />
        <div className="d-flex justify-content-between fw-bold">
          <span>Total</span>
          <span>${total}</span>
        </div>

        <hr className="my-3" />
        <FilaResumen
          label="Pago"
          valor={metodoPago === "transferencia" ? "Transferencia" : metodoPago === "tarjeta" ? "Tarjeta" : "Efectivo"}
          sub={metodoPago === "transferencia" && !comprobante ? "Pago por confirmar — puedes enviar tu comprobante por WhatsApp" : undefined}
          muted={metodoPago === "transferencia" && !comprobante}
        />
      </div>

      <button className="btn btn-brand w-100 py-3 fw-bold rounded-3" style={{ fontSize: "1rem" }} onClick={() => navigate("/cliente/inicio")}>
        Volver al inicio
      </button>
    </div>
  );

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 160 }}>
      {/* Header */}
      <div className="d-flex align-items-center gap-2 px-4 pt-4 pb-2">
        <button className="btn btn-link p-0 text-dark" onClick={() => paso > 1 ? setPaso(p => p - 1) : navigate(-1)}>
          <i className="bi bi-arrow-left fs-5" />
        </button>
        <div>
          <h2 className="fw-bold mb-0" style={{ fontSize: "1.1rem" }}>
            {paso === 1 ? "Personaliza tu pedido" : paso === 2 ? "Datos de entrega" : "Resumen y pago"}
          </h2>
          <p className="text-muted mb-0" style={{ fontSize: "0.78rem" }}>
            Paso {paso} de 3
          </p>
        </div>
      </div>

      {/* Indicador de pasos */}
      <div className="d-flex gap-1 px-4 mb-4">
        {[1,2,3].map((n) => (
          <div key={n} style={{ height: 3, flex: 1, borderRadius: 2, background: n <= paso ? "#ED4137" : "#e0e0e0" }} />
        ))}
      </div>

      <div className="px-4">

        {/* ── Paso 1: Personalizar ── */}
        {paso === 1 && comidas.map((c, idx) => (
          <div key={idx} className="mb-2">
            {/* Header accordion */}
            <div
              className="d-flex align-items-center justify-content-between px-1 py-3"
              style={{ cursor: "pointer", borderBottom: "1px solid #eee" }}
              onClick={() => toggleComida(idx)}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="fw-bold" style={{ fontSize: "1.1rem" }}>Comida {idx + 1}</div>
                {(() => {
                  const cambios = [];
                  if (c.esAltPlato && c.platoId) cambios.push(dia?.alternativas_plato?.find(p => p.id === c.platoId)?.nombre);
                  else if (dia?.platos_fuertes?.length > 1 && c.platoId !== dia.platos_fuertes[0]?.id) cambios.push(dia?.platos_fuertes?.find(p => p.id === c.platoId)?.nombre);
                  if (!c.conEntrada && dia?.entrada) cambios.push("sin entrada");
                  if (!c.conGuarnicion && dia?.guarniciones?.length) cambios.push("sin guarnición");
                  if (!c.conBebida && dia?.bebida) cambios.push("sin bebida");
                  else if (c.esAltBebida && c.bebidaId) cambios.push(dia?.alternativas_bebida?.find(p => p.id === c.bebidaId)?.nombre);
                  if (!c.conPostre && dia?.postre) cambios.push("sin postre");
                  const lista = cambios.filter(Boolean);
                  return (
                    <div className="text-muted small">
                      Comida del día{lista.length > 0 ? `, ${lista.join(", ")}` : ""}
                    </div>
                  );
                })()}
                <div className="fw-semibold small" style={{ color: "#ED4137" }}>${totalComida(c)}</div>
              </div>
              <i className={`bi ${comidasAbiertas.has(idx) ? "bi-chevron-up" : "bi-chevron-down"} text-muted`} />
            </div>

            {/* Contenido */}
            {comidasAbiertas.has(idx) && (
              <div className="pt-3">
                {dia.entrada && (
                  <SeccionOpcional titulo="Entrada" activo={c.conEntrada} onToggle={() => setComida(idx, "conEntrada", !c.conEntrada)}>
                    <RadioOpcion nombre={dia.entrada.nombre} precio={0} descripcion={dia.entrada.descripcion}
                      seleccionado={c.conEntrada} onSelect={() => setComida(idx, "conEntrada", true)} />
                  </SeccionOpcional>
                )}

                <Seccion titulo="Plato fuerte">
                  {dia.platos_fuertes?.map((p) => (
                    <RadioOpcion key={p.id} nombre={p.nombre} precio={0} descripcion={p.descripcion}
                      seleccionado={!c.esAltPlato && c.platoId === p.id}
                      onSelect={() => { setComida(idx, "platoId", p.id); setComida(idx, "esAltPlato", false); }} />
                  ))}
                  {dia.alternativa_plato_disponible && dia.alternativas_plato?.map((p) => (
                    <RadioOpcion key={p.id} nombre={p.nombre} precio={EXTRA_PLATO} descripcion={p.descripcion}
                      seleccionado={c.esAltPlato && c.platoId === p.id}
                      onSelect={() => { setComida(idx, "platoId", p.id); setComida(idx, "esAltPlato", true); }} />
                  ))}
                </Seccion>

                {dia.guarniciones?.length > 0 && (
                  <SeccionOpcional titulo="Guarnición" activo={c.conGuarnicion} onToggle={() => setComida(idx, "conGuarnicion", !c.conGuarnicion)}>
                    {dia.guarniciones.map((p) => (
                      <RadioOpcion key={p.id} nombre={p.nombre} precio={0} descripcion={p.descripcion}
                        seleccionado={c.conGuarnicion && c.guarnicionId === p.id}
                        onSelect={() => { setComida(idx, "guarnicionId", p.id); setComida(idx, "conGuarnicion", true); }} />
                    ))}
                  </SeccionOpcional>
                )}

                {dia.bebida && (
                  <SeccionOpcional titulo="Bebida" activo={c.conBebida} onToggle={() => setComida(idx, "conBebida", !c.conBebida)}>
                    <RadioOpcion nombre={dia.bebida.nombre} precio={0}
                      seleccionado={c.conBebida && !c.esAltBebida}
                      onSelect={() => { setComida(idx, "bebidaId", dia.bebida.id); setComida(idx, "esAltBebida", false); setComida(idx, "conBebida", true); }} />
                    {dia.alternativa_bebida_disponible && dia.alternativas_bebida?.map((p) => (
                      <RadioOpcion key={p.id} nombre={p.nombre} precio={EXTRA_BEBIDA}
                        seleccionado={c.conBebida && c.esAltBebida && c.bebidaId === p.id}
                        onSelect={() => { setComida(idx, "bebidaId", p.id); setComida(idx, "esAltBebida", true); setComida(idx, "conBebida", true); }} />
                    ))}
                  </SeccionOpcional>
                )}

                {dia.postre && (
                  <SeccionOpcional titulo="Postre" activo={c.conPostre} onToggle={() => setComida(idx, "conPostre", !c.conPostre)}>
                    <RadioOpcion nombre={dia.postre.nombre} precio={0} descripcion={dia.postre.descripcion}
                      seleccionado={c.conPostre} onSelect={() => setComida(idx, "conPostre", true)} />
                  </SeccionOpcional>
                )}

                <div className="mb-2">
                  <label className="fw-semibold mb-1 text-muted" style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Comentario <span className="fw-normal">(opcional)</span></label>
                  <textarea
                    className="form-control form-control-sm"
                    rows={2}
                    placeholder="Sin cebolla, extra salsa..."
                    value={c.notas}
                    onChange={(e) => setComida(idx, "notas", e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* ── Paso 2: Datos de entrega ── */}
        {paso === 2 && (
          <div>
            {/* Quién recibe */}
            <div className="mb-4">
              <label className="form-label fw-semibold">¿Quién recibe el pedido?</label>
              <input
                type="text"
                className="form-control form-control-lg"
                placeholder="Nombre completo"
                value={receptor}
                onChange={(e) => setReceptor(e.target.value)}
              />
            </div>

            {/* Dirección */}
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <label className="form-label fw-semibold mb-0">Dirección de entrega</label>
                <button type="button" className="btn btn-link p-0 small" style={{ color: "#ED4137", fontSize: "0.85rem" }} onClick={abrirSheet}>
                  Cambiar
                </button>
              </div>
              {direccionSeleccionada ? (
                <div className="p-3 rounded-3 border d-flex align-items-center gap-2" style={{ background: "#fafafa" }}>
                  <i className="bi bi-geo-alt text-brand" style={{ flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div className="fw-semibold small">{direccionSeleccionada.alias}</div>
                    <div className="text-muted text-truncate" style={{ fontSize: "0.78rem" }}>{direccionSeleccionada.direccion}</div>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn btn-outline-secondary w-100 text-start" onClick={abrirSheet}>
                  <i className="bi bi-plus me-1" /> Agregar dirección
                </button>
              )}
            </div>

            {/* Teléfono */}
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-1">
                <label className="form-label fw-semibold mb-0">Teléfono de contacto</label>
                <button type="button" className="btn btn-link p-0 small" style={{ color: "#ED4137", fontSize: "0.85rem" }}
                  onClick={() => setEditandoTelefono(v => !v)}>
                  {editandoTelefono ? "Cancelar" : "Cambiar"}
                </button>
              </div>
              {!editandoTelefono ? (
                <div className="input-group" style={{ opacity: 0.75, pointerEvents: "none" }}>
                  <div className="btn btn-outline-secondary d-flex align-items-center gap-1 px-2" style={{ minWidth: 88 }}>
                    <span style={{ fontSize: "1.2rem" }}>🇲🇽</span>
                    <span className="small fw-semibold">+52</span>
                  </div>
                  <input
                    type="tel"
                    className="form-control"
                    value={telefonoReceptor.replace(/^\+52/, "")}
                    readOnly
                    style={{ background: "#f5f5f5" }}
                  />
                </div>
              ) : (
                <div>
                  <PhoneInput value={telefonoReceptor} onChange={(v) => setTelefonoReceptor(v)} />
                  <button
                    type="button"
                    className="btn w-100 mt-3 py-3 fw-semibold rounded-3"
                    style={{
                      background: /\d{10}$/.test(telefonoReceptor) ? "#ED4137" : "#e0e0e0",
                      color: /\d{10}$/.test(telefonoReceptor) ? "#fff" : "#aaa",
                      fontSize: "1rem",
                      cursor: /\d{10}$/.test(telefonoReceptor) ? "pointer" : "not-allowed",
                      border: "none",
                    }}
                    disabled={!/\d{10}$/.test(telefonoReceptor)}
                    onClick={() => setEditandoTelefono(false)}
                  >
                    Confirmar número
                  </button>
                </div>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Hora de entrega</label>
              <div className="row g-2">
                {HORAS.map((h) => (
                  <div className="col-4" key={h}>
                    <button
                      type="button"
                      className="btn w-100 rounded-3 fw-semibold"
                      style={{
                        background: horaEntrega === h ? "#ED4137" : "#f5f5f5",
                        color: horaEntrega === h ? "#fff" : "#333",
                        border: "none",
                      }}
                      onClick={() => setHoraEntrega(h)}
                    >
                      {h}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Paso 3: Resumen y pago ── */}
        {paso === 3 && (
          <div>
            {/* Resumen */}
            <div className="rounded-3 p-4 bg-white border mb-4">
              <h6 className="fw-bold mb-3">Confirmación</h6>
              {/* Datos del receptor */}
              <div className="d-flex justify-content-between mb-1">
                <span className="text-muted small">Nombre</span>
                <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{receptor}</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span className="text-muted small">Hora de entrega</span>
                <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{horaEntrega}</span>
              </div>

              <hr className="my-3" />

              <h6 className="fw-bold mb-3">Resumen</h6>
              {comidas.map((c, idx) => {
                const pElegido = c.esAltPlato ? dia?.alternativas_plato?.find(p => p.id === c.platoId) : null;
                const bElegida = c.esAltBebida ? dia?.alternativas_bebida?.find(p => p.id === c.bebidaId) : null;
                const titulo = comidas.length === 1 ? "Comida del día" : `Comida ${idx + 1}`;
                return (
                  <div key={idx} className={idx < comidas.length - 1 ? "mb-3 pb-3 border-bottom" : "mb-3"}>
                    <div className="d-flex justify-content-between mb-1">
                      <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{titulo}</span>
                      <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>${totalComida(c)}</span>
                    </div>
                    {(() => {
                      const cambios = [];
                      if (!c.conEntrada && dia?.entrada) cambios.push({ label: "Sin entrada" });
                      if (c.esAltPlato && pElegido)      cambios.push({ label: pElegido.nombre, precio: `+$${EXTRA_PLATO}` });
                      if (!c.conGuarnicion && dia?.guarniciones?.length) cambios.push({ label: "Sin guarnición" });
                      if (!c.conBebida && dia?.bebida)    cambios.push({ label: "Sin bebida" });
                      else if (c.esAltBebida && bElegida) cambios.push({ label: bElegida.nombre, precio: `+$${EXTRA_BEBIDA}` });
                      if (!c.conPostre && dia?.postre)    cambios.push({ label: "Sin postre" });

                      if (c.notas) cambios.push({ label: `"${c.notas}"` });
                      return cambios.length === 0
                        ? null
                        : cambios.map((ch, i) => (
                          <div key={i} className="d-flex justify-content-between fst-italic text-muted" style={{ fontSize: "0.78rem" }}>
                            <span>{ch.label}</span>
                            {ch.precio && <span>{ch.precio}</span>}
                          </div>
                        ));
                    })()}
                  </div>
                );
              })}

              <hr className="my-3" />

              <div className="d-flex justify-content-between">
                <span className="fw-bold">Total</span>
                <span className="fw-bold">${total}</span>
              </div>
            </div>

            {/* Método de pago */}
            <h6 className="fw-bold mb-3">Método de pago</h6>
            {[
              { value: "efectivo",      icon: "💵", label: "Efectivo" },
              { value: "tarjeta",       icon: "💳", label: "Tarjeta" },
              { value: "transferencia", icon: "🏦", label: "Transferencia" },
            ].map(({ value, icon, label }) => (
              <div key={value} className="mb-2">
                <label
                  className="d-flex align-items-center justify-content-between p-3 border rounded-3"
                  style={{ cursor: "pointer", background: metodoPago === value ? "#fff5f5" : "#fff", borderColor: metodoPago === value ? "#ED4137" : "#dee2e6" }}
                  onClick={() => { setMetodoPago(value); if (value === "transferencia") setSheetTransferencia(true); }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <span style={{ fontSize: "1.2rem" }}>{icon}</span>
                    <span className="fw-semibold">{label}</span>
                  </div>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", border: metodoPago === value ? "6px solid #ED4137" : "2px solid #ccc", flexShrink: 0 }} />
                </label>

                {/* Comprobante cuando ya está seleccionada transferencia */}
                {value === "transferencia" && metodoPago === "transferencia" && (
                  <div className="mt-2 p-3 rounded-3 d-flex align-items-center justify-content-between" style={{ background: "#f9f9f9", border: "1px solid #eee" }}>
                    <div>
                      <div className="fw-semibold small">Ver datos bancarios</div>
                      {comprobante
                        ? <div className="text-success small">✓ {comprobante.name}</div>
                        : <div className="text-muted small">Sube tu comprobante después de transferir</div>
                      }
                    </div>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSheetTransferencia(true)}>
                      Ver
                    </button>
                  </div>
                )}
              </div>
            ))}

            {error && <div className="alert alert-danger py-2 small mt-3">{error}</div>}
          </div>
        )}
      </div>

      {/* ── Botón fijo abajo ── */}
      <div
        className="position-fixed start-0 end-0 p-3 bg-white border-top"
        style={{ bottom: 60, zIndex: 100, maxWidth: 480, margin: "0 auto" }}
      >
        {paso < 3 ? (
          <button
            className="btn btn-brand w-100 py-3 fw-bold rounded-3"
            style={{ fontSize: "1rem" }}
            onClick={() => setPaso(p => p + 1)}
            disabled={paso === 1 && comidas.some(c => !c.platoId)}
          >
            Continuar
            {paso === 1 && <span className="ms-2 opacity-75">· ${total}</span>}
          </button>
        ) : (
          <button
            className="btn btn-brand w-100 py-3 fw-bold rounded-3"
            style={{ fontSize: "1rem" }}
            onClick={confirmar}
            disabled={submitting}
          >
            {submitting ? <span className="spinner-border spinner-border-sm me-2" /> : null}
            Confirmar pedido · ${total}
          </button>
        )}
      </div>

      {/* ── BottomSheet de transferencia ── */}
      <BottomSheet abierto={sheetTransferencia} onCerrar={() => setSheetTransferencia(false)} titulo="Datos para transferencia">
        <div className="mb-4">
          {[
            { label: "Banco",   valor: "Coppel",             copiable: false },
            { label: "Nombre",  valor: "Diego Ballesteros",  copiable: true  },
            { label: "Cuenta",  valor: "10440589524",        copiable: true  },
            { label: "CLABE",   valor: "137180104405895240", copiable: true  },
            { label: "Tarjeta", valor: "4169160819061384",   copiable: true  },
          ].map(({ label, valor, copiable }) => (
            <DatoTransferencia key={label} label={label} valor={valor} copiable={copiable} />
          ))}
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">Comprobante de pago <span className="text-muted fw-normal">(opcional)</span></label>
          <input type="file" accept="image/*,.pdf" className="form-control" onChange={(e) => setComprobante(e.target.files[0])} />
          {comprobante
            ? <p className="text-success small mt-1 mb-0"><i className="bi bi-check-circle me-1" />Archivo adjunto: {comprobante.name}</p>
            : <p className="text-muted small mt-1 mb-0"><i className="bi bi-info-circle me-1" />Si no adjuntas el comprobante, tu pedido quedará como <strong>pago por confirmar</strong>. También puedes enviarlo por WhatsApp.</p>
          }
        </div>

        <button
          className="btn btn-brand w-100 py-3 fw-bold rounded-3"
          style={{ fontSize: "1rem" }}
          onClick={() => setSheetTransferencia(false)}
        >
          Listo
        </button>
      </BottomSheet>

      {/* ── BottomSheet de direcciones ── */}
      <BottomSheet
        abierto={sheetAbierto}
        onCerrar={() => setSheetAbierto(false)}
        titulo={sheetPaso === "lista" ? "¿Dónde te entregamos?" : sheetPaso === "buscar" ? "Nueva dirección" : "Tipo de lugar"}
      >
        {/* Paso: lista de direcciones guardadas */}
        {sheetPaso === "lista" && (
          <div>
            {direccionesGuardadas.map((d) => (
              <div
                key={d.id}
                className="d-flex align-items-center gap-3 p-3 border rounded-3 mb-2"
                style={{
                  cursor: "pointer",
                  background: direccionSeleccionada?.id === d.id ? "#fff5f5" : "#fff",
                  borderColor: direccionSeleccionada?.id === d.id ? "#ED4137" : "#dee2e6",
                }}
                onClick={() => { setDireccionSeleccionada(d); setSheetAbierto(false); }}
              >
                <i className="bi bi-geo-alt text-brand fs-5" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="fw-semibold small">{d.alias}</div>
                  <div className="text-muted text-truncate" style={{ fontSize: "0.75rem" }}>{d.direccion}</div>
                </div>
                {direccionSeleccionada?.id === d.id && <i className="bi bi-check-circle-fill text-brand" />}
              </div>
            ))}
            <button
              className="btn btn-outline-secondary w-100 mt-2 rounded-3"
              onClick={() => { setSheetPaso("buscar"); setBusquedaDir(""); setResultadosDir([]); }}
            >
              <i className="bi bi-plus me-1" /> Agregar nueva dirección
            </button>
          </div>
        )}

        {/* Paso: buscar nueva dirección */}
        {sheetPaso === "buscar" && (
          <div>
            <div className="input-group mb-3">
              <input
                type="text"
                className="form-control"
                placeholder="Busca tu calle, colonia..."
                value={busquedaDir}
                autoFocus
                onChange={(e) => onBusquedaChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscarDireccion()}
              />
              <button className="btn btn-brand px-3" onClick={buscarDireccion} disabled={buscandoDir}>
                {buscandoDir ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-search" />}
              </button>
            </div>
            {resultadosDir.map((r, i) => (
              <div
                key={i}
                className="d-flex align-items-start gap-2 p-3 border-bottom"
                style={{ cursor: "pointer" }}
                onClick={() => seleccionarResultadoDir(r)}
                onMouseEnter={(e) => e.currentTarget.style.background = "#f9f9f9"}
                onMouseLeave={(e) => e.currentTarget.style.background = ""}
              >
                <i className="bi bi-geo-alt text-brand mt-1" style={{ flexShrink: 0 }} />
                <span className="small">{r.display_name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Paso: tipo de vivienda + alias */}
        {sheetPaso === "tipo" && nuevaDireccion && (
          <div>
            <div className="p-3 rounded-3 mb-3" style={{ background: "#f5f5f5" }}>
              <div className="small text-muted text-truncate">{nuevaDireccion.display_name}</div>
            </div>
            <p className="fw-semibold small mb-2">Tipo de lugar</p>
            {TIPOS_VIVIENDA.map((t) => (
              <div
                key={t.value}
                className="d-flex align-items-center gap-3 p-3 border rounded-3 mb-2"
                style={{ cursor: "pointer", background: nuevoTipo === t.value ? "#fff5f5" : "#fff", borderColor: nuevoTipo === t.value ? "#ED4137" : "#dee2e6" }}
                onClick={() => setNuevoTipo(t.value)}
              >
                <span style={{ fontSize: "1.3rem" }}>{t.icon}</span>
                <span className="fw-semibold small">{t.label}</span>
                {nuevoTipo === t.value && <i className="bi bi-check-circle-fill text-brand ms-auto" />}
              </div>
            ))}
            {nuevoTipo && (
              <>
                <div className="mb-3 mt-2">
                  <label className="form-label small fw-semibold">Alias <span className="text-muted fw-normal">(opcional)</span></label>
                  <input type="text" className="form-control" placeholder={`Ej. ${TIPOS_VIVIENDA.find(t=>t.value===nuevoTipo)?.label} del trabajo`} value={nuevoAlias} onChange={(e) => setNuevoAlias(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Referencias <span className="text-muted fw-normal">(opcional)</span></label>
                  <textarea className="form-control" rows={2} placeholder="Color de la fachada, referencias..." value={nuevaReferencia} onChange={(e) => setNuevaReferencia(e.target.value)} />
                </div>
                <button className="btn btn-brand w-100 py-2 fw-bold rounded-3" onClick={usarNuevaDireccion}>
                  Usar esta dirección
                </button>
              </>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
