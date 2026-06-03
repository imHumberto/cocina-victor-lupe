import os
import requests
from flask import Blueprint, request, jsonify

geo_bp = Blueprint("geo", __name__)

GOOGLE_KEY = os.getenv("GOOGLE_PLACES_KEY", "")
NOMINATIM_HEADERS = {"User-Agent": "SazonDeVic/1.0 (im.humberto@gmail.com)"}

# Centro de Guadalajara para sesgar resultados
GDL_LAT = 20.6597
GDL_LNG = -103.3496


@geo_bp.get("/buscar")
def buscar():
    q = request.args.get("q", "").strip()
    if len(q) < 3:
        return jsonify([])

    if GOOGLE_KEY:
        try:
            resp = requests.get(
                "https://maps.googleapis.com/maps/api/place/autocomplete/json",
                params={
                    "input": q,
                    "key": GOOGLE_KEY,
                    "language": "es",
                    "components": "country:mx",
                    "location": f"{GDL_LAT},{GDL_LNG}",
                    "radius": 80000,
                },
                timeout=5,
            )
            data = resp.json()
            if data.get("status") == "OK":
                resultados = []
                for p in data.get("predictions", []):
                    resultados.append({
                        "place_id": p["place_id"],
                        "display_name": p["description"],
                        "lat": None,
                        "lon": None,
                    })
                return jsonify(resultados)
        except Exception:
            pass

    # Fallback: Nominatim
    try:
        q_lower = q.lower()
        ciudad = "" if any(w in q_lower for w in ["guadalajara", "jalisco", "zapopan", "tlaquepaque"]) else " Guadalajara México"
        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": q + ciudad, "format": "json", "limit": 5, "accept-language": "es", "viewbox": "-103.7,20.3,-102.9,21.0", "bounded": 0},
            headers=NOMINATIM_HEADERS,
            timeout=6,
        )
        if resp.ok:
            return jsonify([{"place_id": r["place_id"], "display_name": r["display_name"], "lat": r["lat"], "lon": r["lon"]} for r in resp.json()])
    except Exception:
        pass

    return jsonify([])


@geo_bp.get("/detalle")
def detalle():
    """Obtiene lat/lng de un place_id de Google."""
    place_id = request.args.get("place_id", "")
    if not place_id or not GOOGLE_KEY:
        return jsonify({"lat": None, "lng": None})
    try:
        resp = requests.get(
            "https://maps.googleapis.com/maps/api/place/details/json",
            params={"place_id": place_id, "fields": "geometry,formatted_address", "key": GOOGLE_KEY, "language": "es"},
            timeout=5,
        )
        data = resp.json()
        if data.get("status") == "OK":
            loc = data["result"]["geometry"]["location"]
            return jsonify({"lat": loc["lat"], "lng": loc["lng"], "direccion": data["result"].get("formatted_address", "")})
    except Exception:
        pass
    return jsonify({"lat": None, "lng": None})


@geo_bp.get("/inverso")
def inverso():
    lat = request.args.get("lat")
    lng = request.args.get("lng")
    if GOOGLE_KEY:
        try:
            resp = requests.get(
                "https://maps.googleapis.com/maps/api/geocode/json",
                params={"latlng": f"{lat},{lng}", "key": GOOGLE_KEY, "language": "es"},
                timeout=5,
            )
            data = resp.json()
            if data.get("status") == "OK" and data.get("results"):
                return jsonify({"display_name": data["results"][0]["formatted_address"]})
        except Exception:
            pass
    try:
        resp = requests.get(
            "https://api.bigdatacloud.net/data/reverse-geocode-client",
            params={"latitude": lat, "longitude": lng, "localityLanguage": "es"},
            timeout=5,
        )
        if resp.ok:
            data = resp.json()
            partes = [data.get("locality") or data.get("city", ""), data.get("principalSubdivision", ""), data.get("countryName", "")]
            return jsonify({"display_name": ", ".join(p for p in partes if p) or f"{lat}, {lng}"})
    except Exception:
        pass
    return jsonify({"display_name": f"{lat}, {lng}"})
