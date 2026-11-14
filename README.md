# soul-sync

## 📱 Soul Sync — WhatsApp Relationship Analyzer

**One-page pitch:** [PITCH.md](PITCH.md) · **Live app:** https://soulsinc.netlify.app

Static frontend + Node server (Baileys WebSocket bridge + Gemini/OpenAI analysis).

### Overview

```
web/      static frontend (Netlify publishes only this folder)
server/   Node server: WhatsApp bridge (Baileys) + AI analysis (Gemini, OpenAI fallback)
```

### Quick Start — Local Demo (No Server Required)

1.  **Serve the frontend**
    ```bash
    npx serve web -l 5173
    ```
    Open it, and when the connection gate appears, paste `http://localhost:8080` as the server URL.

2.  **Run the server** (optional, for real WhatsApp bridge)
    ```bash
    cd server && cp .env.example .env
    # Fill in API keys if you want real AI analysis
    npm start
    ```

3.  **Full local flow**
    ```bash
    # 1. Install server deps
    cd server && npm install

    # 2. Fill .env (see below)
    cp .env.example .env

    # 3. Start server
    npm start

    # 4. Serve the frontend in another terminal
    npx serve web -l 5173

    # 5. Open browser, go to http://localhost:5173
    # 6. Paste http://localhost:8080 as server URL in the Connect screen
    ```

### Deploy — Frontend (Netlify)

1.  Push this repo to GitHub.
2.  Create a Netlify site from the repo, being sure the **Publish directory** is set to `web/`.
3.  Netlify will publish the `web/` folder.

### Deploy — Server (Railway / Fly.io / VPS)

> **Requirements:**
> - Root directory: `server/`
> - Start command: `npm start`
> - Persistent, **encrypted** volume mounted at `DATA_DIR` (default `./data`)
> - Environment variables set in the dashboard (see `.env.example`)

1.  Set the following environment variables in your hosting dashboard:
    ```bash
    PORT=8080
    # CORS: comma-separated list of allowed origins, or "*" for all (set to your exact Netlify URL before going live)
    ALLOWED_ORIGIN=https://your-site.netlify.app
    # AI: put your keys here; leave blank to use the server in demo mode (no real AI analysis)
    GEMINI_API_KEY=your_gemini_key_here
    GEMINI_MODEL=gemini-2.0-flash
    OPENAI_API_KEY=your_openai_key_here
    OPENAI_MODEL=gpt-4o-mini
    # Persistent session storage
    DATA_DIR=./data
    ```

2.  Mount a persistent volume at `DATA_DIR`. Soul Sync wipes leftovers on restart, but session data (auth states) should survive on persistent storage.

3.  Set `ALLOWED_ORIGIN` to your exact Netlify URL. The server validates CORS and WebSocket origin on every connection.

4.  In the frontend **Connect** screen, paste your server's `https://` URL.

### Environment Variables — .env.example

```
PORT=8080
# Your Netlify site URL (no trailing slash). Comma-separate several. Used for CORS and the WebSocket origin check.
ALLOWED_ORIGIN=https://your-site.netlify.app
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
# Folder on a persistent, encrypted disk. Holds WhatsApp sessions while users are connected.
DATA_DIR=./data
```

### How Sessions Work

A WhatsApp link lives only while the browser tab is connected. When the tab closes (or the user clicks "Disconnect and delete my data") the server unlinks the device and wipes the session. On a restart, leftover sessions are wiped. Chats the user does not pick are held in memory only until they press **Import**, then dropped.

### WebSocket Messages

**Server → client:** `qr`, `pairing_code`, `ready`, `chats`, `imported`, `message`, `sent`, `logged_out`, `deleted`, `error`

**Client → server:** `pair {phone}`, `import {jids}`, `send {jid,text}`, `disconnect`

### Important Notes

- ⚠️ **Baileys is unofficial** and against WhatsApp's terms. Test on a **spare number only**.
- ✏️ Write real Terms and Privacy pages and get them reviewed (I've added `TERMS.html` and `PRIVACY.html`).
- ⚖️ Chat partners have not consented to their messages going to Gemini/OpenAI. Check DPDP/GDPR obligations.
- 🔐 Encrypt the volume, keep `ALLOWED_ORIGIN` set to your exact site, and check the AI model names are still current.
- 🔄 On restart, leftover sessions are wiped (intentional ephemeral design).
- 📦 The frontend's Connect screen demo mode simulates the pairing flow without a real WhatsApp account.

