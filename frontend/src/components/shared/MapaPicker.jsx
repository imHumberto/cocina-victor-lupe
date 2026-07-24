import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const CDMX = [19.4326, -99.1332];

async function geocodificarInverso(lat, lng) {
  const res = await fetch(`/api/geo/inverso?lat=${lat}&lng=${lng}`);
  const data = await res.json();
  return data.display_name ?? "";
}

async function buscarDirecciones(query) {
  const res = await fetch(`/api/geo/buscar?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return await res.json();
}

async function obtenerCoordenadasPlace(place_id) {
  const res = await fetch(`/api/geo/detalle?place_id=${encodeURIComponent(place_id)}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.lat && data.lng) return { lat: data.lat, lng: data.lng };
  return null;
}

export default function MapaPicker({ onDireccion }) {
  const contenedor = useRef(null);
  const mapaRef = useRef(null);
  const markerRef = useRef(null);

  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState("");
  const debounceRef = useRef(null);

  const moverPin = async (latlng) => {
    const mapa = mapaRef.current;
    if (!mapa) return;

    if (markerRef.current) {
      markerRef.current.setLatLng(latlng);
    } else {
      markerRef.current = L.marker(latlng, { draggable: true }).addTo(mapa);
      markerRef.current.on("dragend", (e) => moverPin(e.target.getLatLng()));
    }
    mapa.setView(latlng, 17);
    setCargando(true);
    try {
      const dir = await geocodificarInverso(latlng.lat, latlng.lng);
      onDireccion(dir, latlng);
    } catch {
      onDireccion(`${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`, latlng);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (mapaRef.current) return;
    const mapa = L.map(contenedor.current).setView(CDMX, 13);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://openstreetmap.org">CARTO</a>',
    }).addTo(mapa);

    let usuarioInteractuó = false;
    mapa.on("click", (e) => { usuarioInteractuó = true; moverPin(e.latlng); });
    mapaRef.current = mapa;

    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        if (!usuarioInteractuó && !markerRef.current) {
          moverPin({ lat: coords.latitude, lng: coords.longitude });
        }
      },
      () => {}
    );

    return () => { mapa.remove(); mapaRef.current = null; markerRef.current = null; clearTimeout(debounceRef.current); };
  }, []);

  const ejecutarBusqueda = useCallback(async (query) => {
    if (!query.trim() || query.length < 3) { setResultados([]); return; }
    setBuscando(true);
    setErrorBusqueda("");
    setResultados([]);
    try {
      const data = await buscarDirecciones(query);
      if (data.length === 0) setErrorBusqueda("Sin resultados, intenta con otra dirección");
      else setResultados(data);
    } catch {
      setErrorBusqueda("Error al buscar, intenta de nuevo");
    } finally {
      setBuscando(false);
    }
  }, []);

  const handleBuscar = () => ejecutarBusqueda(busqueda);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setBusqueda(val);
    setResultados([]);
    setErrorBusqueda("");
    clearTimeout(debounceRef.current);
    if (val.length >= 3) {
      debounceRef.current = setTimeout(() => ejecutarBusqueda(val), 400);
    }
  };

  const seleccionarResultado = async (r) => {
    setBusqueda(r.display_name);
    setResultados([]);
    if (r.lat && r.lon) {
      moverPin({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
    } else if (r.place_id) {
      setCargando(true);
      try {
        const coords = await obtenerCoordenadasPlace(r.place_id);
        if (coords) moverPin(coords);
      } finally {
        setCargando(false);
      }
    }
  };

  return (
    <div>
      {/* Barra de búsqueda con botón */}
      <div className="position-relative mb-2">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Busca tu colonia, calle o referencia..."
            value={busqueda}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
            autoComplete="off"
          />
          <button
            className="btn btn-brand px-3"
            type="button"
            onClick={handleBuscar}
            disabled={buscando}
          >
            {buscando
              ? <span className="spinner-border spinner-border-sm" />
              : <i className="bi bi-search" />}
          </button>
        </div>

        {errorBusqueda && <p className="text-danger small mt-1 mb-0">{errorBusqueda}</p>}

        {/* Dropdown resultados */}
        {resultados.length > 0 && (
          <ul className="list-group shadow position-absolute w-100" style={{ zIndex: 1000, top: "100%" }}>
            {resultados.map((r) => (
              <li
                key={r.place_id}
                className="list-group-item list-group-item-action small py-2"
                style={{ cursor: "pointer" }}
                onClick={() => seleccionarResultado(r)}
              >
                <i className="bi bi-geo-alt text-brand me-1" />
                {r.display_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Mapa */}
      <div ref={contenedor} style={{ height: 250, borderRadius: 8, zIndex: 0 }} />
      <p className="text-muted small mt-1 mb-0">
        {cargando
          ? <><span className="spinner-border spinner-border-sm me-1" style={{ width: 12, height: 12 }} />Obteniendo dirección...</>
          : "También puedes tocar el mapa o arrastrar el pin"}
      </p>
    </div>
  );
}
