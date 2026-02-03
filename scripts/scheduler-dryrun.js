/*
 * Minimal scheduler dry-run used by CI (Phase-1).
 * - If FIREBASE_SERVICE_ACCOUNT is present, it will initialize the Admin SDK and write a schedulerRuns doc.
 * - Otherwise it will print a summary from client-readable rules (best-effort).
 */

const admin = require("firebase-admin");

async function main() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(svc), projectId: process.env.FIREBASE_PROJECT_ID });
    const db = admin.firestore();
    const rulesSnap = await db.collection("rules").get();
    const summary = { rulesCount: rulesSnap.size, dryRun: true, runAt: new Date().toISOString() };
    await db.collection("schedulerRuns").add(summary);
    console.log("Dry-run wrote schedulerRuns doc:", summary);
    process.exit(0);
  } else {
    console.log("No service account provided — dry-run (no writes). Set FIREBASE_SERVICE_ACCOUNT to enable CI writes.");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
