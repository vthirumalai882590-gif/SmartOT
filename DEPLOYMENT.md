# SmartOT Command Platform — Deployment & Production Guide

This guide details how to deploy the **SmartOT Hospital Operating Theatre Command Center & CSSD System** into production.

---

## 🚀 Option 1: Docker Compose Deployment (Recommended)

The entire platform (PostgreSQL Database + Express Backend + React Production Frontend) is containerized into a single production stack.

### Steps:
1. Ensure Docker Desktop or Docker Engine is installed.
2. Run the deployment command in the project root:
   ```bash
   docker compose up --build -d
   ```
3. Open your browser and navigate to:
   - **Production App**: `http://localhost:4000` (or `http://<SERVER_IP>:4000`)
   - **Health Check API**: `http://localhost:4000/api/health`

---

## 🌐 Option 2: Cloud PaaS Deployment (Render / Railway / Fly.io)

### Render.com
1. Connect your GitHub repository to Render.com.
2. Select **New Blueprint** and connect `render.yaml`.
3. Deploy! Render will build the monorepo and expose the unified endpoint.

### Railway / Fly.io
1. Install Railway CLI: `npm i -g @railway/cli`
2. Login and deploy:
   ```bash
   railway login
   railway init
   railway up
   ```

---

## 🏥 Option 3: Local Hospital LAN Network Launch

To allow all handheld devices, tablets, and laptops on the hospital Wi-Fi network to access the web app:

1. Build the production bundle:
   ```bash
   npm run build
   ```
2. Start the production backend server:
   ```bash
   npm run start
   ```
3. Find your local machine IP address:
   - Windows: `ipconfig` (e.g. `192.168.1.105`)
4. Staff can access the application from any handheld scanner or laptop on the local network via:
   `http://192.168.1.105:4000`

---

## 🔐 Environment Variables (`.env`)

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Server Port | `4000` |
| `NODE_ENV` | Environment Mode | `production` |
| `JWT_SECRET` | Secret Key for Auth | `smartot_super_secret_jwt_key_2026_production_safe` |
| `CORS_ORIGIN` | Allowed Origins | `*` |
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://postgres:pass@localhost:5432/smartot` |
| `AI_PROVIDER` | AI Engine Provider | `local` |
