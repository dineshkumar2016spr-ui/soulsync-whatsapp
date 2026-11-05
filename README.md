# Soul Sync

```
web/      static frontend (Netlify publishes only this folder)
server/   Node server: WhatsApp bridge (Baileys) + AI analysis (Gemini, OpenAI fallback)
```

## Run locally
1. `cd server && npm install`
2. `cp .env.example .env` and fill in the keys. For local testing set `ALLOWED_ORIGIN=http://localhost:5173`
3. `npm start`
4. Serve the frontend: `npx serve web -l 5173`, open it, and paste `http://localhost:8080` as the server URL.

## Deploy
- **Frontend:** push the repo to GitHub, create a Netlify site from it. `netlify.toml` already publishes `web/`.
- **Server:** Railway / Fly.io / VPS (not Netlify). Root directory `server/`, start command `npm start`.
  Set the variables from `.env.example` in the dashboard. Mount a volume at `DATA_DIR`.
  Set `ALLOWED_ORIGIN` to your Netlify URL. Use the server's `https://` URL in the frontend.

## How sessions work
A WhatsApp link lives only while the browser tab is connected. When the tab closes (or the user clicks
"Disconnect and delete my data") the server unlinks the device and wipes the session. On a restart, leftover
sessions are wiped. Chats the user does not pick are held in memory only until they press Import, then dropped.

## WebSocket messages
Server to client: `qr`, `pairing_code`, `ready`, `chats`, `imported`, `message`, `sent`, `logged_out`, `deleted`, `error`
Client to server: `pair {phone}`, `import {jids}`, `send {jid,text}`, `disconnect`

## Before real users
- Baileys is unofficial and against WhatsApp's terms. Test on a spare number only.
- Write real Terms and Privacy pages (the consent boxes refer to them) and get them reviewed.
- Chat partners have not consented to their messages going to Gemini/OpenAI. Check DPDP/GDPR obligations.
- Encrypt the volume, keep `ALLOWED_ORIGIN` set to your exact site, and check the AI model names are still current.
