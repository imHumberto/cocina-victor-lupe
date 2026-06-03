import { useEffect, useRef, useState } from "react";
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

export default function MapaPicker({ onDireccion }) {
  const contenedor = useRef(null);
  const mapaRef = useRef(null);
  const markerRef = useRef(null);

  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState("");

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

    return () => { mapa.remove(); mapaRef.current = null; markerRef.current = null; };
  }, []);

  const handleBuscar = async () => {
    if (!busqueda.trim() || busqueda.length < 3) return;
    setBuscando(true);
    setErrorBusqueda("");
    setResultados([]);
    try {
      const data = await buscarDirecciones(busqueda);
      if (data.length === 0) setErrorBusqueda("Sin resultados, intenta con otra dirección");
      else setResultados(data);
    } catch {
      setErrorBusqueda("Error al buscar, intenta de nuevo");
    } finally {
      setBuscando(false);
    }
  };

  const seleccionarResultado = (r) => {
    setBusqueda(r.display_name);
    setResultados([]);
    moverPin({ lat: parseFloat(r.lat), lng: parseFloat(r.lon) });
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
            onChange={(e) => { setBusqueda(e.target.value); setResultados([]); setErrorBusqueda(""); }}
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
