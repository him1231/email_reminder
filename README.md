# Email Reminder — Phase 1 (client-only MVP)

This repository contains the Email Reminder frontend (Phase-1): a client-only, GitHub Pages–deployable SPA that uses Firebase Auth + Firestore (client SDK) and provides manual-send workflows, template editing, and tokenized unsubscribe.

Quick start
1. Copy `.env.example` to `.env.local` and fill in values.
2. Install: `npm ci`
3. Run dev: `npm run dev`
4. Run emulator tests: `npm run emulator:test`

Local development — Firebase setup

If you see an error like `Firebase config error — missing env: VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_APP_ID`, create a `.env.local` at the repo root and add your Firebase *Web app* credentials (do **not** commit secrets):

```bash
# .env.local (local only)
VITE_FIREBASE_API_KEY=AIza...YOUR_WEB_API_KEY...
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=1:123456:web:abcdef
```
Quick-start (choose one):
- Recommended (explicit):

  npm run dev:env

  This uses `dotenv-cli` to load `.env.local` and start Vite (cross-shell).

- Shell one-liner (no deps):

  set -a && source .env.local && set +a && npm run dev
Helpful checks:
- Use the **Web app** credentials from Firebase Console → Project settings → Your apps.
- Add `localhost` and `127.0.0.1` to Authentication → Authorized domains.
- For CI / GitHub Pages: add repo secrets named `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID` and forward them into the build environment.

For full setup and the Phase‑1 runbook see `docs/PHASE1-RUNBOOK.md`.
