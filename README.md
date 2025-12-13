# Minimal Express + Socket.io Server

Lightweight Node server that serves a health endpoint and a Socket.io gateway for room-based messaging.

## Run
- Install: `npm install`
- Dev: `npm run dev`
- Prod: `npm start`
- Health check: `curl http://localhost:3000/health`

## Configuration
- `PORT`: HTTP/socket port (default `3000`)
- `ALLOWED_ORIGIN`: CORS origin for websockets (default `*`)

## HTTP
- `GET /health` → `{ "status": "ok" }`
