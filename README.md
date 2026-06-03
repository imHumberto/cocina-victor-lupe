# La Cocina de Víctor y Lupe

App de comida corrida a domicilio. Permite a clientes ordenar su menú del día, y al equipo (admin y repartidores) gestionar pedidos en tiempo real.

## Stack

- **Backend**: Flask + PostgreSQL + Socket.IO + JWT
- **Frontend**: React + Vite + Bootstrap 5

## Estructura

```
backend/    Flask API (puerto 5001)
frontend/   React/Vite (puerto 5173)
```

## Roles

- **Cliente**: consulta el menú, ordena, rastrea su pedido en tiempo real
- **Admin**: acepta/rechaza pedidos, gestiona estados, menú semanal y usuarios
- **Repartidor**: toma pedidos listos, marca entregas, ve su historial y contador mensual

## Desarrollo local

### Backend

```bash
cd backend
pipenv install
pipenv run flask db upgrade
pipenv run python run.py
```

Requiere un archivo `.env` con:

```
DATABASE_URL=postgresql://...
JWT_SECRET_KEY=...
SECRET_KEY=...
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

El frontend hace proxy al backend en `localhost:5001`.
