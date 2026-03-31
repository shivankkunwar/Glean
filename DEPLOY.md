# Glean Deployment Guide (Dokploy Nixpacks)

If you prefer a direct Nuxt setup without a custom Dockerfile, Dokploy uses **Nixpacks** to automatically detect and build your app. 

## 1. Dokploy Setup (Nixpacks)

1.  **New Application**:
    *   Create a new Application in Dokploy.
    *   Select your `glean` GitHub repository.
    *   **Build Type**: Select **Nixpacks**. This is the default and will auto-detect Nuxt/Node.

2.  **Environment Variables**:
    *   Under **Environment Variables**, add:
        *   `NODE_ENV=production`
        *   `ADMIN_PASSWORD=your_secure_password`
        *   `DATABASE_PATH=/data/glean.db`
        *   `AI_OPENROUTER_API_KEY=sk-or-v1-xxxx`
        *   `GEMINI_API_KEY=xxxx`

3.  **Volumes (CRITICAL for SQLite)**:
    *   Go to the **Volumes** tab.
    *   **Mount Path**: `/data`
    *   **Host Path**: Something permanent like `/var/lib/dokploy/glean-db`
    *   *Without this, your database will be wiped every time you redeploy.*

4.  **Install commands (Pre-build)**:
    Since `better-sqlite3` and `sqlite-vec` need to compile binaries, make sure your VPS has build-essentials.
    ```bash
    sudo apt-get update && sudo apt-get install -y build-essential python3
    ```

## 2. Cloudflare Tunnel

To connect your VPS to the internet securely:

1.  **Install Cloudflared**:
    ```bash
    curl -L --output /tmp/cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && sudo dpkg -i /tmp/cloudflared.deb
    ```

2.  **Authenticate & Create**:
    ```bash
    cloudflared tunnel login
    cloudflared tunnel create glean-vps
    ```

3.  **Point to Dokploy**:
    If your app is running on port 3000 in Dokploy:
    ```bash
    cloudflared tunnel route dns glean-vps glean.yourdomain.com
    cloudflared tunnel run --url http://localhost:3000 glean-vps
    ```

## 3. Deployment Build

In Dokploy, click **Deploy**. Nixpacks will:
1. Run `npm install`
2. Run `npm run build` (Nuxt build)
3. Run `npm run start` (`node .output/server/index.mjs`)

Your AI vault is now live!
