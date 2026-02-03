# Phase‑1 Runbook — Email Reminder (client-only MVP)

This runbook describes how to run and validate the Phase‑1 (free) client-only MVP locally and in CI.

Prereqs
- Node 18+
- Firebase CLI (for emulator): `npm i -g firebase-tools`
- Create a Firebase project for staging (optional). For local dev the emulator is sufficient.

Local dev
1. Copy `.env.example` → `.env.local` and set VITE_* values and any optional keys.
2. Install: `npm ci`
3. Start dev server: `npm run dev` (app available at http://localhost:5173)
4. To run emulator tests: `npm run emulator:test` (starts Firestore emulator and runs integration tests)

Firebase + OAuth setup (for full demo)
1. Create a Firebase project and enable Authentication (Google provider).
2. Add the GitHub Pages origin (https://<your-domain>) to Firebase Authorized Domains.
3. Create a Google Cloud OAuth client for Gmail OAuth if you want experimental per-user send.

Demo steps (happy path)
1. Sign in with Google (Firebase SSO).
2. Create two staff records (use sample data in `docs/SAMPLE_DATA.md`).
3. Create a template and confirm preview renders placeholders and `{{unsubscribeUrl}}`.
4. Create a rule (mark remains Manual/Draft). Example: create a rule with tag `beta-users` and select a saved template.
5. Use the Manual Send button: open mail client or download HTML/CSV. For rules, open the rule, preview the selected template, then click "Send / Export" on a sample recipient.
6. Open the downloaded HTML locally and click the unsubscribe link — the unsubscribe page should write a suppression in the emulator.

CI notes
- The repository contains emulator-based integration tests that run on PRs.
- A scheduled dry-run workflow writes `schedulerRuns/{id}` for QA (no SMTP in Phase‑1).

Troubleshooting
- If Firestore rules block a write during tests, run the emulator UI (`firebase emulators:start`) and inspect rules + request logs.
- For OAuth issues check redirect URIs and Authorized Domains in the Firebase/GCP console.
