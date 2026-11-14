# SoulSync — understand the conversation before you reply

**Demo:** https://soulsinc.netlify.app · **API:** https://soulsync-whatsapp.onrender.com

## The problem

People do not lack things to say — they freeze on what *this person* will understand. Generic
dating advice ignores the evidence already in the chat: who initiates, who carries it, what
changed last week. SoulSync reads that evidence and answers with one well-aimed message.

## What it does

- **Links your real WhatsApp** by QR code or phone pairing, like WhatsApp Web. No account, no password.
- **You choose which chats are read.** Only ticked chats are forwarded, analysed or sent to a model;
  the rest stay in memory and are dropped on disconnect.
- **A Love Guru that listens first.** It asks what is going on and reads the chat only when you ask
  for words. Then it returns three replies — natural, cute, contextual — each with the reason it
  works, plus one recommendation. A tap puts the reply in the composer; nothing sends itself.
- **A real chat app around it:** typing indicator, last seen, delivered/read ticks, media, history
  sync, and an analysis that separates what is observable from what is a guess.

## How it works

1. **Bridge** — one Baileys (WhatsApp Web multi-device) socket per user on a Node server.
   Credentials persist per device, so a returning user needs no QR. Every outgoing frame passes a
   single gate: is this chat in `picked`?
2. **Transport** — WebSocket for chat (messages, presence, receipts, WebRTC signalling); SSE over a
   POSTed fetch for AI streaming, so an answer can be aborted mid-token.
3. **Intelligence** — Gemini with a model fallback list, then OpenAI. Output is a strict JSON
   contract the server coerces and clamps before the UI renders it; a retry never replays tokens
   already on screen, and a failed call is refunded.

## Stack

Vanilla HTML/CSS/JS (no framework, built to `web/`, Netlify) · Node 22 + Express + `ws` (Render) ·
Baileys · Gemini / OpenAI · Razorpay credits · Web Push · Capacitor shell with a share-sheet importer.

## Where it stands

Working end to end: linking by QR and pairing code, chat import, live messages with presence and
read receipts, per-chat AI history, the three-reply contract, streaming, credits, push. On free
tiers the backend sleeps and its disk is ephemeral, so a redeploy asks for a re-scan until a
persistent volume is mounted.

**Next:** sessions and tokens to Redis so more than one instance can serve, media to object storage
instead of process memory, and tests around the Baileys event handlers — where the subtle bugs live.

## Why it matters

The gap between "I like this person" and "I know what to say" is not confidence, it is
understanding — and that understanding is already in the chat.
