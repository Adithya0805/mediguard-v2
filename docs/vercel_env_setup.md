# ⚡ Vercel Production Deployment Guide — MediGuard V2 Frontend

This guide outlines the complete setup and deployment of the Next.js 14 frontend clinical portal utilizing the **Vercel CLI** and dashboard interface.

---

## 🔑 Required Vercel Environment Variables

Set these environment variables inside your **Vercel Project Settings** -> **Environment Variables** tab before triggering a build:

| Variable | Value | Description |
| :--- | :--- | :--- |
| **`NEXT_PUBLIC_API_URL`** | `https://mediguard-backend.up.railway.app` | Points to your public **Railway Backend service URL** (without trailing slash). |
| **`NEXT_PUBLIC_APP_NAME`** | `MediGuard V2` | Header and title brand name displayed in the UI dashboard. |
| **`NEXT_PUBLIC_ENVIRONMENT`** | `production` | Signals the app to route requests locally through Vercel Edge Proxy rewrites (`/api/*`). |

---

## 🚀 Vercel CLI Deployment Steps

Follow these steps to authenticate, link, and deploy your Next.js frontend code securely via the terminal:

### 1. Install the Vercel CLI globally
Install the official Vercel package using npm:
```bash
npm install -g vercel
```

### 2. Authenticate the CLI
Log in to your Vercel account directly in your terminal:
```bash
vercel login
```

### 3. Link Your Project
Navigate to the `frontend/` directory and run the setup command:
```bash
cd frontend/
vercel link
```
* **Vercel Prompt Guide**:
  * *Set up and deploy?* `yes`
  * *Which scope?* Select your personal account or team.
  * *Link to existing project?* `no`
  * *What’s your project name?* `mediguard-v2`
  * *In which directory is your code located?* `./`

### 4. Push Environment Variables
You can add environment variables directly from the CLI or via the Vercel dashboard:
```bash
vercel env add NEXT_PUBLIC_API_URL https://mediguard-backend.up.railway.app production
vercel env add NEXT_PUBLIC_APP_NAME "MediGuard V2" production
vercel env add NEXT_PUBLIC_ENVIRONMENT production production
```

### 5. Deploy to Production
Build and deploy the Next.js application:
```bash
vercel --prod
```
*(Wait ~2 minutes for Next.js to compile and build static page assets.)*

---

## 🔎 Post-Deployment Checks & Management

### How to Check Live Logs
1. Navigate to your [Vercel Dashboard](https://vercel.com).
2. Select your **`mediguard-v2`** project.
3. Open the **Logs** tab to view live browser routing, Next.js routing, and SSR compilation outputs.

### Custom Domain Binding
To bind a professional clinical domain (e.g., `portal.mediguard.net`):
1. In the Vercel Dashboard, go to **Settings** -> **Domains**.
2. Type your domain name and click **Add**.
3. Vercel will generate recommended DNS settings. Add a **CNAME** pointing to `cname.vercel-dns.com` or an **A Record** pointing to Vercel's IP address at your domain registrar.

### How to Rollback a Deployment
If an unexpected error is introduced in production, you can rollback immediately to a previous healthy state without pushing code:
1. Open the **Deployments** tab in your Vercel Dashboard.
2. Find the last healthy build deployment in the history list.
3. Click the **three dots (...)** next to it and select **Instant Rollback**.
4. Confirm the prompt. Vercel redirects 100% of global traffic back to that build within 5 seconds.
