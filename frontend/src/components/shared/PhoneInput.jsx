import { useState, useRef, useEffect } from "react";

const PAISES = [
  { codigo: "+93",   bandera: "🇦🇫", nombre: "Afganistán" },
  { codigo: "+355",  bandera: "🇦🇱", nombre: "Albania" },
  { codigo: "+213",  bandera: "🇩🇿", nombre: "Argelia" },
  { codigo: "+1684", bandera: "🇦🇸", nombre: "Samoa Americana" },
  { codigo: "+376",  bandera: "🇦🇩", nombre: "Andorra" },
  { codigo: "+244",  bandera: "🇦🇴", nombre: "Angola" },
  { codigo: "+1264", bandera: "🇦🇮", nombre: "Anguila" },
  { codigo: "+1268", bandera: "🇦🇬", nombre: "Antigua y Barbuda" },
  { codigo: "+54",   bandera: "🇦🇷", nombre: "Argentina" },
  { codigo: "+374",  bandera: "🇦🇲", nombre: "Armenia" },
  { codigo: "+297",  bandera: "🇦🇼", nombre: "Aruba" },
  { codigo: "+61",   bandera: "🇦🇺", nombre: "Australia" },
  { codigo: "+43",   bandera: "🇦🇹", nombre: "Austria" },
  { codigo: "+994",  bandera: "🇦🇿", nombre: "Azerbaiyán" },
  { codigo: "+1242", bandera: "🇧🇸", nombre: "Bahamas" },
  { codigo: "+973",  bandera: "🇧🇭", nombre: "Baréin" },
  { codigo: "+880",  bandera: "🇧🇩", nombre: "Bangladés" },
  { codigo: "+1246", bandera: "🇧🇧", nombre: "Barbados" },
  { codigo: "+375",  bandera: "🇧🇾", nombre: "Bielorrusia" },
  { codigo: "+32",   bandera: "🇧🇪", nombre: "Bélgica" },
  { codigo: "+501",  bandera: "🇧🇿", nombre: "Belice" },
  { codigo: "+229",  bandera: "🇧🇯", nombre: "Benín" },
  { codigo: "+1441", bandera: "🇧🇲", nombre: "Bermudas" },
  { codigo: "+975",  bandera: "🇧🇹", nombre: "Bután" },
  { codigo: "+591",  bandera: "🇧🇴", nombre: "Bolivia" },
  { codigo: "+387",  bandera: "🇧🇦", nombre: "Bosnia y Herzegovina" },
  { codigo: "+267",  bandera: "🇧🇼", nombre: "Botsuana" },
  { codigo: "+55",   bandera: "🇧🇷", nombre: "Brasil" },
  { codigo: "+673",  bandera: "🇧🇳", nombre: "Brunéi" },
  { codigo: "+359",  bandera: "🇧🇬", nombre: "Bulgaria" },
  { codigo: "+226",  bandera: "🇧🇫", nombre: "Burkina Faso" },
  { codigo: "+257",  bandera: "🇧🇮", nombre: "Burundi" },
  { codigo: "+238",  bandera: "🇨🇻", nombre: "Cabo Verde" },
  { codigo: "+855",  bandera: "🇰🇭", nombre: "Camboya" },
  { codigo: "+237",  bandera: "🇨🇲", nombre: "Camerún" },
  { codigo: "+1",    bandera: "🇨🇦", nombre: "Canadá" },
  { codigo: "+236",  bandera: "🇨🇫", nombre: "Rep. Centroafricana" },
  { codigo: "+235",  bandera: "🇹🇩", nombre: "Chad" },
  { codigo: "+56",   bandera: "🇨🇱", nombre: "Chile" },
  { codigo: "+86",   bandera: "🇨🇳", nombre: "China" },
  { codigo: "+57",   bandera: "🇨🇴", nombre: "Colombia" },
  { codigo: "+269",  bandera: "🇰🇲", nombre: "Comoras" },
  { codigo: "+243",  bandera: "🇨🇩", nombre: "Congo (RDC)" },
  { codigo: "+242",  bandera: "🇨🇬", nombre: "Congo" },
  { codigo: "+682",  bandera: "🇨🇰", nombre: "Islas Cook" },
  { codigo: "+506",  bandera: "🇨🇷", nombre: "Costa Rica" },
  { codigo: "+385",  bandera: "🇭🇷", nombre: "Croacia" },
  { codigo: "+53",   bandera: "🇨🇺", nombre: "Cuba" },
  { codigo: "+357",  bandera: "🇨🇾", nombre: "Chipre" },
  { codigo: "+420",  bandera: "🇨🇿", nombre: "República Checa" },
  { codigo: "+45",   bandera: "🇩🇰", nombre: "Dinamarca" },
  { codigo: "+253",  bandera: "🇩🇯", nombre: "Yibuti" },
  { codigo: "+1767", bandera: "🇩🇲", nombre: "Dominica" },
  { codigo: "+1809", bandera: "🇩🇴", nombre: "Rep. Dominicana" },
  { codigo: "+593",  bandera: "🇪🇨", nombre: "Ecuador" },
  { codigo: "+20",   bandera: "🇪🇬", nombre: "Egipto" },
  { codigo: "+503",  bandera: "🇸🇻", nombre: "El Salvador" },
  { codigo: "+240",  bandera: "🇬🇶", nombre: "Guinea Ecuatorial" },
  { codigo: "+291",  bandera: "🇪🇷", nombre: "Eritrea" },
  { codigo: "+372",  bandera: "🇪🇪", nombre: "Estonia" },
  { codigo: "+268",  bandera: "🇸🇿", nombre: "Esuatini" },
  { codigo: "+251",  bandera: "🇪🇹", nombre: "Etiopía" },
  { codigo: "+679",  bandera: "🇫🇯", nombre: "Fiyi" },
  { codigo: "+358",  bandera: "🇫🇮", nombre: "Finlandia" },
  { codigo: "+33",   bandera: "🇫🇷", nombre: "Francia" },
  { codigo: "+241",  bandera: "🇬🇦", nombre: "Gabón" },
  { codigo: "+220",  bandera: "🇬🇲", nombre: "Gambia" },
  { codigo: "+995",  bandera: "🇬🇪", nombre: "Georgia" },
  { codigo: "+49",   bandera: "🇩🇪", nombre: "Alemania" },
  { codigo: "+233",  bandera: "🇬🇭", nombre: "Ghana" },
  { codigo: "+350",  bandera: "🇬🇮", nombre: "Gibraltar" },
  { codigo: "+30",   bandera: "🇬🇷", nombre: "Grecia" },
  { codigo: "+1473", bandera: "🇬🇩", nombre: "Granada" },
  { codigo: "+502",  bandera: "🇬🇹", nombre: "Guatemala" },
  { codigo: "+224",  bandera: "🇬🇳", nombre: "Guinea" },
  { codigo: "+245",  bandera: "🇬🇼", nombre: "Guinea-Bisáu" },
  { codigo: "+592",  bandera: "🇬🇾", nombre: "Guyana" },
  { codigo: "+509",  bandera: "🇭🇹", nombre: "Haití" },
  { codigo: "+504",  bandera: "🇭🇳", nombre: "Honduras" },
  { codigo: "+852",  bandera: "🇭🇰", nombre: "Hong Kong" },
  { codigo: "+36",   bandera: "🇭🇺", nombre: "Hungría" },
  { codigo: "+354",  bandera: "🇮🇸", nombre: "Islandia" },
  { codigo: "+91",   bandera: "🇮🇳", nombre: "India" },
  { codigo: "+62",   bandera: "🇮🇩", nombre: "Indonesia" },
  { codigo: "+98",   bandera: "🇮🇷", nombre: "Irán" },
  { codigo: "+964",  bandera: "🇮🇶", nombre: "Irak" },
  { codigo: "+353",  bandera: "🇮🇪", nombre: "Irlanda" },
  { codigo: "+972",  bandera: "🇮🇱", nombre: "Israel" },
  { codigo: "+39",   bandera: "🇮🇹", nombre: "Italia" },
  { codigo: "+1876", bandera: "🇯🇲", nombre: "Jamaica" },
  { codigo: "+81",   bandera: "🇯🇵", nombre: "Japón" },
  { codigo: "+962",  bandera: "🇯🇴", nombre: "Jordania" },
  { codigo: "+7",    bandera: "🇰🇿", nombre: "Kazajistán" },
  { codigo: "+254",  bandera: "🇰🇪", nombre: "Kenia" },
  { codigo: "+686",  bandera: "🇰🇮", nombre: "Kiribati" },
  { codigo: "+850",  bandera: "🇰🇵", nombre: "Corea del Norte" },
  { codigo: "+82",   bandera: "🇰🇷", nombre: "Corea del Sur" },
  { codigo: "+965",  bandera: "🇰🇼", nombre: "Kuwait" },
  { codigo: "+996",  bandera: "🇰🇬", nombre: "Kirguistán" },
  { codigo: "+856",  bandera: "🇱🇦", nombre: "Laos" },
  { codigo: "+371",  bandera: "🇱🇻", nombre: "Letonia" },
  { codigo: "+961",  bandera: "🇱🇧", nombre: "Líbano" },
  { codigo: "+266",  bandera: "🇱🇸", nombre: "Lesoto" },
  { codigo: "+231",  bandera: "🇱🇷", nombre: "Liberia" },
  { codigo: "+218",  bandera: "🇱🇾", nombre: "Libia" },
  { codigo: "+423",  bandera: "🇱🇮", nombre: "Liechtenstein" },
  { codigo: "+370",  bandera: "🇱🇹", nombre: "Lituania" },
  { codigo: "+352",  bandera: "🇱🇺", nombre: "Luxemburgo" },
  { codigo: "+853",  bandera: "🇲🇴", nombre: "Macao" },
  { codigo: "+261",  bandera: "🇲🇬", nombre: "Madagascar" },
  { codigo: "+265",  bandera: "🇲🇼", nombre: "Malaui" },
  { codigo: "+60",   bandera: "🇲🇾", nombre: "Malasia" },
  { codigo: "+960",  bandera: "🇲🇻", nombre: "Maldivas" },
  { codigo: "+223",  bandera: "🇲🇱", nombre: "Malí" },
  { codigo: "+356",  bandera: "🇲🇹", nombre: "Malta" },
  { codigo: "+692",  bandera: "🇲🇭", nombre: "Islas Marshall" },
  { codigo: "+222",  bandera: "🇲🇷", nombre: "Mauritania" },
  { codigo: "+230",  bandera: "🇲🇺", nombre: "Mauricio" },
  { codigo: "+52",   bandera: "🇲🇽", nombre: "México" },
  { codigo: "+691",  bandera: "🇫🇲", nombre: "Micronesia" },
  { codigo: "+373",  bandera: "🇲🇩", nombre: "Moldavia" },
  { codigo: "+377",  bandera: "🇲🇨", nombre: "Mónaco" },
  { codigo: "+976",  bandera: "🇲🇳", nombre: "Mongolia" },
  { codigo: "+382",  bandera: "🇲🇪", nombre: "Montenegro" },
  { codigo: "+212",  bandera: "🇲🇦", nombre: "Marruecos" },
  { codigo: "+258",  bandera: "🇲🇿", nombre: "Mozambique" },
  { codigo: "+95",   bandera: "🇲🇲", nombre: "Myanmar" },
  { codigo: "+264",  bandera: "🇳🇦", nombre: "Namibia" },
  { codigo: "+674",  bandera: "🇳🇷", nombre: "Nauru" },
  { codigo: "+977",  bandera: "🇳🇵", nombre: "Nepal" },
  { codigo: "+31",   bandera: "🇳🇱", nombre: "Países Bajos" },
  { codigo: "+64",   bandera: "🇳🇿", nombre: "Nueva Zelanda" },
  { codigo: "+505",  bandera: "🇳🇮", nombre: "Nicaragua" },
  { codigo: "+227",  bandera: "🇳🇪", nombre: "Níger" },
  { codigo: "+234",  bandera: "🇳🇬", nombre: "Nigeria" },
  { codigo: "+47",   bandera: "🇳🇴", nombre: "Noruega" },
  { codigo: "+968",  bandera: "🇴🇲", nombre: "Omán" },
  { codigo: "+92",   bandera: "🇵🇰", nombre: "Pakistán" },
  { codigo: "+680",  bandera: "🇵🇼", nombre: "Palaos" },
  { codigo: "+970",  bandera: "🇵🇸", nombre: "Palestina" },
  { codigo: "+507",  bandera: "🇵🇦", nombre: "Panamá" },
  { codigo: "+675",  bandera: "🇵🇬", nombre: "Papúa Nueva Guinea" },
  { codigo: "+595",  bandera: "🇵🇾", nombre: "Paraguay" },
  { codigo: "+51",   bandera: "🇵🇪", nombre: "Perú" },
  { codigo: "+63",   bandera: "🇵🇭", nombre: "Filipinas" },
  { codigo: "+48",   bandera: "🇵🇱", nombre: "Polonia" },
  { codigo: "+351",  bandera: "🇵🇹", nombre: "Portugal" },
  { codigo: "+1787", bandera: "🇵🇷", nombre: "Puerto Rico" },
  { codigo: "+974",  bandera: "🇶🇦", nombre: "Catar" },
  { codigo: "+40",   bandera: "🇷🇴", nombre: "Rumanía" },
  { codigo: "+7",    bandera: "🇷🇺", nombre: "Rusia" },
  { codigo: "+250",  bandera: "🇷🇼", nombre: "Ruanda" },
  { codigo: "+1869", bandera: "🇰🇳", nombre: "San Cristóbal y Nieves" },
  { codigo: "+1758", bandera: "🇱🇨", nombre: "Santa Lucía" },
  { codigo: "+1784", bandera: "🇻🇨", nombre: "San Vicente y Granadinas" },
  { codigo: "+685",  bandera: "🇼🇸", nombre: "Samoa" },
  { codigo: "+378",  bandera: "🇸🇲", nombre: "San Marino" },
  { codigo: "+239",  bandera: "🇸🇹", nombre: "Santo Tomé y Príncipe" },
  { codigo: "+966",  bandera: "🇸🇦", nombre: "Arabia Saudita" },
  { codigo: "+221",  bandera: "🇸🇳", nombre: "Senegal" },
  { codigo: "+381",  bandera: "🇷🇸", nombre: "Serbia" },
  { codigo: "+248",  bandera: "🇸🇨", nombre: "Seychelles" },
  { codigo: "+232",  bandera: "🇸🇱", nombre: "Sierra Leona" },
  { codigo: "+65",   bandera: "🇸🇬", nombre: "Singapur" },
  { codigo: "+421",  bandera: "🇸🇰", nombre: "Eslovaquia" },
  { codigo: "+386",  bandera: "🇸🇮", nombre: "Eslovenia" },
  { codigo: "+677",  bandera: "🇸🇧", nombre: "Islas Salomón" },
  { codigo: "+252",  bandera: "🇸🇴", nombre: "Somalia" },
  { codigo: "+27",   bandera: "🇿🇦", nombre: "Sudáfrica" },
  { codigo: "+34",   bandera: "🇪🇸", nombre: "España" },
  { codigo: "+94",   bandera: "🇱🇰", nombre: "Sri Lanka" },
  { codigo: "+249",  bandera: "🇸🇩", nombre: "Sudán" },
  { codigo: "+597",  bandera: "🇸🇷", nombre: "Surinam" },
  { codigo: "+46",   bandera: "🇸🇪", nombre: "Suecia" },
  { codigo: "+41",   bandera: "🇨🇭", nombre: "Suiza" },
  { codigo: "+963",  bandera: "🇸🇾", nombre: "Siria" },
  { codigo: "+886",  bandera: "🇹🇼", nombre: "Taiwán" },
  { codigo: "+992",  bandera: "🇹🇯", nombre: "Tayikistán" },
  { codigo: "+255",  bandera: "🇹🇿", nombre: "Tanzania" },
  { codigo: "+66",   bandera: "🇹🇭", nombre: "Tailandia" },
  { codigo: "+670",  bandera: "🇹🇱", nombre: "Timor Oriental" },
  { codigo: "+228",  bandera: "🇹🇬", nombre: "Togo" },
  { codigo: "+676",  bandera: "🇹🇴", nombre: "Tonga" },
  { codigo: "+1868", bandera: "🇹🇹", nombre: "Trinidad y Tobago" },
  { codigo: "+216",  bandera: "🇹🇳", nombre: "Túnez" },
  { codigo: "+90",   bandera: "🇹🇷", nombre: "Turquía" },
  { codigo: "+993",  bandera: "🇹🇲", nombre: "Turkmenistán" },
  { codigo: "+688",  bandera: "🇹🇻", nombre: "Tuvalu" },
  { codigo: "+256",  bandera: "🇺🇬", nombre: "Uganda" },
  { codigo: "+380",  bandera: "🇺🇦", nombre: "Ucrania" },
  { codigo: "+971",  bandera: "🇦🇪", nombre: "Emiratos Árabes Unidos" },
  { codigo: "+44",   bandera: "🇬🇧", nombre: "Reino Unido" },
  { codigo: "+1",    bandera: "🇺🇸", nombre: "Estados Unidos" },
  { codigo: "+598",  bandera: "🇺🇾", nombre: "Uruguay" },
  { codigo: "+998",  bandera: "🇺🇿", nombre: "Uzbekistán" },
  { codigo: "+678",  bandera: "🇻🇺", nombre: "Vanuatu" },
  { codigo: "+379",  bandera: "🇻🇦", nombre: "Ciudad del Vaticano" },
  { codigo: "+58",   bandera: "🇻🇪", nombre: "Venezuela" },
  { codigo: "+84",   bandera: "🇻🇳", nombre: "Vietnam" },
  { codigo: "+967",  bandera: "🇾🇪", nombre: "Yemen" },
  { codigo: "+260",  bandera: "🇿🇲", nombre: "Zambia" },
  { codigo: "+263",  bandera: "🇿🇼", nombre: "Zimbabue" },
];

const DEFAULT = PAISES.find((p) => p.nombre === "México");

export default function PhoneInput({ onChange, required }) {
  const [pais, setPais] = useState(DEFAULT);
  const [numero, setNumero] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const cerrar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, []);

  useEffect(() => {
    if (abierto) { setBusqueda(""); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [abierto]);

  const seleccionarPais = (p) => {
    setPais(p);
    setAbierto(false);
    onChange(p.codigo + numero);
  };

  const handleNumero = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
    setNumero(val);
    onChange(pais.codigo + val);
  };

  const filtrados = busqueda
    ? PAISES.filter((p) => p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo.includes(busqueda))
    : PAISES;

  return (
    <div className="input-group position-relative" ref={ref}>
      <button
        type="button"
        className="btn btn-outline-secondary d-flex align-items-center gap-1 px-2"
        style={{ minWidth: 88, whiteSpace: "nowrap" }}
        onClick={() => setAbierto((a) => !a)}
      >
        <span style={{ fontSize: "1.2rem" }}>{pais.bandera}</span>
        <span className="small fw-semibold">{pais.codigo}</span>
        <i className="bi bi-chevron-down small" />
      </button>

      {abierto && (
        <div
          className="bg-white border rounded shadow"
          style={{ position: "absolute", top: "100%", left: 0, zIndex: 1050, width: 260 }}
        >
          <div className="p-2 border-bottom">
            <input
              ref={inputRef}
              type="text"
              className="form-control form-control-sm"
              placeholder="Buscar país o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <ul className="list-unstyled mb-0" style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtrados.map((p, i) => (
              <li
                key={i}
                className={`d-flex align-items-center gap-2 px-3 py-2 ${p === pais ? "bg-brand text-white" : "hover-bg"}`}
                style={{ cursor: "pointer" }}
                onClick={() => seleccionarPais(p)}
                onMouseEnter={(e) => { if (p !== pais) e.currentTarget.style.background = "#f5f5f5"; }}
                onMouseLeave={(e) => { if (p !== pais) e.currentTarget.style.background = ""; }}
              >
                <span style={{ fontSize: "1.1rem" }}>{p.bandera}</span>
                <span className="small flex-grow-1">{p.nombre}</span>
                <span className="small text-muted">{p.codigo}</span>
              </li>
            ))}
            {filtrados.length === 0 && <li className="px-3 py-2 text-muted small">Sin resultados</li>}
          </ul>
        </div>
      )}

      <input
        type="tel"
        className="form-control"
        placeholder="10 dígitos"
        value={numero}
        onChange={handleNumero}
        required={required}
        inputMode="numeric"
      />
    </div>
  );
}
