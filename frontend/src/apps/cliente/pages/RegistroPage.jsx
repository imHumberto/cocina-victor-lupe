import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import useAuthStore from "../../../store/authStore";
import { connectSocket } from "../../../services/socket";
import PhoneInput from "../../../components/shared/PhoneInput";
import PasswordInput from "../../../components/shared/PasswordInput";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TIPOS_VIVIENDA = [
  { value: "casa",         icon: "bi-house",        label: "Casa",         desc: "Vivienda unifamiliar o multifamiliar" },
  { value: "departamento", icon: "bi-buildings",    label: "Departamento", desc: "Edificio residencial de unidades múltiples" },
  { value: "oficina",      icon: "bi-briefcase",    label: "Oficina",      desc: "Lugar de trabajo con restricciones de entrada" },
  { value: "empresa",      icon: "bi-building",     label: "Empresa",      desc: "Negocio, fábrica o comercio" },
  { value: "otro",         icon: "bi-geo-alt",      label: "Otro",         desc: "Hospital, parque, exteriores, etc." },
];

export default function RegistroPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);

  const [paso, setPaso] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Paso 1
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");

  // Paso 2 — búsqueda de dirección
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [direccionSeleccionada, setDireccionSeleccionada] = useState(null);
  const debounceRef = useRef(null);
  const mapaRef = useRef(null);
  const mapaContenedor = useRef(null);
  const markerRef = useRef(null);
  const [coordsConfirmadas, setCoordsConfirmadas] = useState(null);

  // Inicializa/actualiza el mapa cuando se selecciona una dirección
  useEffect(() => {
    if (!direccionSeleccionada || !mapaContenedor.current) return;
    const lat = parseFloat(direccionSeleccionada.lat);
    const lng = parseFloat(direccionSeleccionada.lon);

    if (!mapaRef.current) {
      const mapa = L.map(mapaContenedor.current).setView([lat, lng], 17);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://openstreetmap.org">CARTO</a>',
      }).addTo(mapa);
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapa);
      markerRef.current.on("dragend", (e) => {
        const ll = e.target.getLatLng();
        setCoordsConfirmadas({ lat: ll.lat, lng: ll.lng });
      });
      mapaRef.current = mapa;
    } else {
      mapaRef.current.setView([lat, lng], 17);
      markerRef.current.setLatLng([lat, lng]);
    }
    setCoordsConfirmadas({ lat, lng });

    return () => {};
  }, [direccionSeleccionada]);

  // Paso 3 — detalles
  const [tipoVivienda, setTipoVivienda] = useState("");
  const [detalles, setDetalles] = useState("");      // número interior, nombre empresa, etc.
  const [referencias, setReferencias] = useState(""); // instrucciones para el repartidor

  const buscar = async (q) => {
    const query = q ?? busqueda;
    if (!query.trim() || query.length < 3) return;
    setBuscando(true);
    setResultados([]);
    setError("");
    try {
      const res = await fetch(`/api/geo/buscar?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResultados(data);
      if (data.length === 0) setError("Sin resultados, intenta con otra dirección o más detalles");
    } catch {
      setError("Error al buscar dirección");
    } finally {
      setBuscando(false);
    }
  };

  const handleBusquedaChange = (e) => {
    const val = e.target.value;
    setBusqueda(val);
    setDireccionSeleccionada(null);
    setResultados([]);
    setError("");
    clearTimeout(debounceRef.current);
    if (val.length >= 4) {
      debounceRef.current = setTimeout(() => buscar(val), 400);
    }
  };

  const seleccionarDireccion = async (r) => {
    setResultados([]);
    setBusqueda(r.display_name);
    // Si no tiene lat/lng (viene de Google), pedimos el detalle
    if (!r.lat) {
      try {
        const res = await fetch(`/api/geo/detalle?place_id=${r.place_id}`);
        const data = await res.json();
        setDireccionSeleccionada({ ...r, lat: String(data.lat), lon: String(data.lng) });
      } catch {
        setDireccionSeleccionada(r);
      }
    } else {
      setDireccionSeleccionada(r);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post(`/auth/registro/${token}`, {
        nombre,
        telefono_whatsapp: telefono,
        password,
        direccion_entrega: [direccionSeleccionada?.display_name, detalles].filter(Boolean).join(" — "),
        lat: coordsConfirmadas?.lat,
        lng: coordsConfirmadas?.lng,
        tipo_vivienda: tipoVivienda,
        referencias_entrega: referencias,
        empresa: tipoVivienda === "empresa" ? detalles : "",
      });
      localStorage.setItem("token", data.token);
      connectSocket(data.token);
      setUser(data.user);
      navigate("/cliente/inicio");
    } catch (err) {
      setError(err.response?.data?.error ?? "Error al registrarse");
      setPaso(1);
    } finally {
      setLoading(false);
    }
  };

  const pasoValido = () => {
    if (paso === 1) return nombre.trim() && telefono && password.length >= 6;
    if (paso === 2) return !!direccionSeleccionada;
    if (paso === 3) return !!tipoVivienda;
    return false;
  };

  const siguiente = () => {
    if (paso < 3) setPaso(p => p + 1);
    else handleSubmit();
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-3" style={{ background: "var(--color-brand-light)" }}>
      <div className="card card-sazon w-100" style={{ maxWidth: 440 }}>

        {/* Header */}
        <div className="text-center pt-4 pb-2 px-4">
          <h1 className="h5 fw-bold text-brand">Crear cuenta 🎉</h1>
          {/* Indicador de pasos */}
          <div className="d-flex align-items-center justify-content-center gap-2 mt-3 mb-1">
            {[1, 2, 3].map((n) => (
              <div key={n} className="d-flex align-items-center gap-2">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center fw-bold"
                  style={{
                    width: 28, height: 28, fontSize: 12,
                    background: paso > n ? "var(--color-brand)" : paso === n ? "var(--color-brand)" : "#ddd",
                    color: paso >= n ? "#fff" : "#999",
                  }}
                >
                  {paso > n ? <i className="bi bi-check-lg" /> : n}
                </div>
                {n < 3 && <div style={{ width: 32, height: 2, background: paso > n ? "var(--color-brand)" : "#ddd" }} />}
              </div>
            ))}
          </div>
          <p className="text-muted small mt-2">
            {paso === 1 ? "Tus datos" : paso === 2 ? "¿Dónde te entregamos?" : "Detalles de tu dirección"}
          </p>
        </div>

        <div className="px-4 pb-4">
          {error && <div className="alert alert-danger py-2 small mb-3">{error}</div>}

          {/* ── Paso 1: Datos personales ── */}
          {paso === 1 && (
            <div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Nombre completo</label>
                <input type="text" className="form-control" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold">Número de teléfono</label>
                <PhoneInput value={telefono} onChange={setTelefono} required />
              </div>
              <div className="mb-4">
                <label className="form-label fw-semibold">Contraseña</label>
                <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
                <div className="text-muted small mt-1">Mínimo 6 caracteres</div>
              </div>
            </div>
          )}

          {/* ── Paso 2: Dirección ── */}
          {paso === 2 && (
            <div>
              {/* Buscador */}
              <div className="position-relative mb-3">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Busca tu calle, colonia o referencia..."
                    value={busqueda}
                    onChange={handleBusquedaChange}
                    onKeyDown={(e) => e.key === "Enter" && buscar()}
                    autoFocus
                  />
                  <button className="btn btn-brand px-3" type="button" onClick={buscar} disabled={buscando}>
                    {buscando ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-search" />}
                  </button>
                </div>

                {/* Resultados */}
                {resultados.length > 0 && (
                  <div className="border rounded-3 shadow mt-1 bg-white" style={{ maxHeight: 280, overflowY: "auto" }}>
                    {resultados.map((r, i) => (
                      <div
                        key={i}
                        className="d-flex align-items-start gap-2 px-3 py-3 border-bottom"
                        style={{ cursor: "pointer" }}
                        onClick={() => seleccionarDireccion(r)}
                        onMouseEnter={(e) => e.currentTarget.style.background = "#f9f9f9"}
                        onMouseLeave={(e) => e.currentTarget.style.background = ""}
                      >
                        <i className="bi bi-geo-alt text-brand mt-1" style={{ flexShrink: 0 }} />
                        <span className="small">{r.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dirección seleccionada + mapa de confirmación */}
              {direccionSeleccionada && (
                <div>
                  <div className="rounded-3 p-3 d-flex align-items-start gap-2 mb-2" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <i className="bi bi-check-circle-fill text-success mt-1" style={{ flexShrink: 0 }} />
                    <div>
                      <div className="fw-semibold small">{direccionSeleccionada.display_name}</div>
                      <button
                        type="button"
                        className="btn btn-link p-0 small text-muted"
                        style={{ fontSize: "0.75rem" }}
                        onClick={() => { setDireccionSeleccionada(null); setBusqueda(""); setResultados([]); }}
                      >
                        Cambiar dirección
                      </button>
                    </div>
                  </div>

                  {/* Mapa para ajustar el pin */}
                  <div className="rounded-3 overflow-hidden border mb-1" style={{ height: 200 }} ref={mapaContenedor} />
                  <p className="text-muted mb-0" style={{ fontSize: "0.75rem" }}>
                    <i className="bi bi-info-circle me-1" />
                    Arrastra el pin si la ubicación no es exacta
                  </p>
                </div>
              )}

              {!direccionSeleccionada && !buscando && !resultados.length && (
                <p className="text-muted small text-center mt-3">
                  <i className="bi bi-info-circle me-1" />
                  Escribe tu dirección y presiona buscar
                </p>
              )}
            </div>
          )}

          {/* ── Paso 3: Tipo de vivienda y detalles ── */}
          {paso === 3 && (
            <div>
              <p className="text-muted small mb-3">Selecciona el tipo de edificio para que las entregas sean más precisas</p>

              {TIPOS_VIVIENDA.map((t) => (
                <div
                  key={t.value}
                  className="d-flex align-items-center justify-content-between p-3 border rounded-3 mb-2"
                  style={{
                    cursor: "pointer",
                    background: tipoVivienda === t.value ? "#fff5f5" : "#fff",
                    borderColor: tipoVivienda === t.value ? "var(--color-brand)" : "#dee2e6",
                  }}
                  onClick={() => setTipoVivienda(t.value)}
                >
                  <div className="d-flex align-items-center gap-3">
                    <i className={`bi ${t.icon} fs-5 text-muted`} />
                    <div>
                      <div className="fw-semibold small">{t.label}</div>
                      <div className="text-muted" style={{ fontSize: "0.75rem" }}>{t.desc}</div>
                    </div>
                  </div>
                  <i className={`bi bi-chevron-right small text-muted`} />
                </div>
              ))}

              {tipoVivienda && (
                <div className="mt-3">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">
                      {tipoVivienda === "empresa" ? "Nombre de la empresa" : "Detalles adicionales"}
                      <span className="text-muted fw-normal ms-1">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder={
                        tipoVivienda === "departamento" ? "Ej. Depto 4B, torre norte" :
                        tipoVivienda === "empresa" ? "Nombre de la empresa u oficina" :
                        tipoVivienda === "casa" ? "Ej. Casa blanca con portón negro" :
                        "Número interior, piso, nombre..."
                      }
                      value={detalles}
                      onChange={(e) => setDetalles(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">
                      Instrucciones para el repartidor
                      <span className="text-muted fw-normal ms-1">(opcional)</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Ej. Llama al timbre dos veces, no hay acceso por la calle principal..."
                      value={referencias}
                      onChange={(e) => setReferencias(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botones */}
          <div className="d-flex gap-2 mt-2">
            {paso > 1 && (
              <button
                type="button"
                className="btn btn-outline-secondary px-4"
                onClick={() => { setPaso(p => p - 1); setError(""); }}
              >
                <i className="bi bi-arrow-left" />
              </button>
            )}
            <button
              type="button"
              className="btn btn-brand fw-semibold flex-grow-1 py-2"
              onClick={siguiente}
              disabled={!pasoValido() || loading}
            >
              {loading
                ? <span className="spinner-border spinner-border-sm me-2" />
                : paso === 3 ? "Crear cuenta" : "Continuar"
              }
              {paso < 3 && !loading && <i className="bi bi-arrow-right ms-2" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
