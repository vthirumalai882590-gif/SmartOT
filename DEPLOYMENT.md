# SmartOT Command — Complete Deployment Guide

This guide details how to deploy the entire **SmartOT Command** platform (Frontend + Express Backend + SQLite/JSON Database + Groq Cloud AI Engine).

---

## 🚀 Option 1: One-Click Unified Deployment on Render (Recommended & Free)

Render allows running the entire application (Frontend + Backend + Database) as a single Web Service on their free tier.

### Steps:
1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - SmartOT Command"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/smartot-command.git
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** → **Web Service**.
   - Connect your GitHub repository.
   - Configure the following:
     - **Name**: `smartot-command`
     - **Runtime**: `Node`
     - **Build Command**: `npm run build`
     - **Start Command**: `npm start`
     - **Plan**: `Free`

3. **Add Environment Variables in Render**:
   | Key | Recommended Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` |
   | `JWT_SECRET` | *(Generate any random 32-char string)* |
   | `AI_PROVIDER` | `groq` |
   | `GROQ_API_KEY` | `your_groq_api_key_here` |
   | `GROQ_MODEL_NAME` | `llama-3.3-70b-versatile` |

4. Click **Deploy Web Service**! Your live app will be accessible at `https://smartot-command.onrender.com`.

---

## ⚡ Option 2: One-Click Deployment on Railway

Railway automatically detects Node monorepos and deploys in under 2 minutes.

### Steps:
1. Go to [railway.app](https://railway.app) and click **New Project** → **Deploy from GitHub repo**.
2. Select your repository.
3. In **Settings** → **Variables**, add:
   - `PORT` = `4000`
   - `NODE_ENV` = `production`
   - `GROQ_API_KEY` = `your_groq_api_key_here`
   - `AI_PROVIDER` = `groq`
   - `JWT_SECRET` = `smartot_super_secret_jwt_key_2026_production_safe`
4. Under **Networking**, click **Generate Domain**. Your app is live!

---

## 🐳 Option 3: Deploy with Docker (AWS, DigitalOcean, VPS)

SmartOT Command includes a multi-stage production Dockerfile.

### 1. Build the Docker Image:
```bash
docker build -t smartot-command:latest .
```

### 2. Run the Container:
```bash
docker run -d \
  --name smartot \
  -p 4000:4000 \
  -e NODE_ENV=production \
  -e GROQ_API_KEY=your_groq_api_key_here \
  -e AI_PROVIDER=groq \
  smartot-command:latest
```

### 3. Open in Browser:
Navigate to `http://YOUR_SERVER_IP:4000`.

---

## 📱 Default Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| **Administrator** | `admin@smartot.hospital` | `Admin@123password` |
| **OT Manager** | `otmanager@smartot.hospital` | `OTManager@123password` |
| **CSSD Staff** | `cssd@smartot.hospital` | `CSSDStaff@123password` |
| **Ward Nurse** | `ward@smartot.hospital` | `WardStaff@123password` |
