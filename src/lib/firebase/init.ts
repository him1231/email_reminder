import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Resolve env values safely for both browser (import.meta.env) and Node/test (process.env).
let _metaEnv: any | undefined;
try {
  // access import.meta.env via eval so TypeScript/node won't parse the `import.meta` token
  // Vite will still provide import.meta.env at runtime in the browser
  // eslint-disable-next-line no-eval, @typescript-eslint/no-explicit-any
  _metaEnv = eval('typeof import !== "undefined" && import.meta && import.meta.env ? import.meta.env : undefined') as any;
} catch (e) {
  _metaEnv = undefined;
}
const _nodeEnv = (typeof process !== 'undefined' && process.env) ? (process as any).env : undefined;

const firebaseConfig = {
  apiKey: (_metaEnv && _metaEnv.VITE_FIREBASE_API_KEY) || (_nodeEnv && (_nodeEnv.VITE_FIREBASE_API_KEY || _nodeEnv.FIREBASE_API_KEY)) || "",
  authDomain: (_metaEnv && _metaEnv.VITE_FIREBASE_AUTH_DOMAIN) || (_nodeEnv && (_nodeEnv.VITE_FIREBASE_AUTH_DOMAIN || _nodeEnv.FIREBASE_AUTH_DOMAIN)) || "",
  projectId: (_metaEnv && _metaEnv.VITE_FIREBASE_PROJECT_ID) || (_nodeEnv && (_nodeEnv.VITE_FIREBASE_PROJECT_ID || _nodeEnv.FIREBASE_PROJECT_ID)) || "",
  messagingSenderId: (_metaEnv && _metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID) || (_nodeEnv && (_nodeEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || _nodeEnv.FIREBASE_MESSAGING_SENDER_ID)) || "",
  appId: (_metaEnv && _metaEnv.VITE_FIREBASE_APP_ID) || (_nodeEnv && (_nodeEnv.VITE_FIREBASE_APP_ID || _nodeEnv.FIREBASE_APP_ID)) || "",
};

// Export bindings first so TS always sees the named exports
export let auth: any;
export let googleProvider: any;
export let db: any;

// Export a helper so the app can render a friendly dev-banner when config is missing
export const firebaseConfigIsValid = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

// In Jest/unit-test environment don't initialize the real Firebase SDK — return lightweight stubs.
if (_nodeEnv && _nodeEnv.JEST_WORKER_ID) {
  // test-friendly stubs so components can import without contacting Firebase
  const _stub: any = {};
  auth = _stub;
  googleProvider = _stub;
  db = _stub;
} else {
  // Validate required client config before calling into the SDK so we can surface
  // an actionable error rather than the generic Firebase 'invalid-api-key' runtime error.
  const missing: string[] = [];
  if (!firebaseConfig.apiKey) missing.push('VITE_FIREBASE_API_KEY');
  if (!firebaseConfig.projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!firebaseConfig.appId) missing.push('VITE_FIREBASE_APP_ID');

  if (missing.length) {
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const hint = isLocal
      ? `Create a \`.env.local\` at the repo root with the missing values, for example:\n\nVITE_FIREBASE_API_KEY=your_api_key\nVITE_FIREBASE_PROJECT_ID=your_project_id\nVITE_FIREBASE_APP_ID=your_app_id\n\nthen restart the dev server (npm run dev).`
      : `Ensure your build injects the VITE_... variables (GitHub Actions: set repo secrets prefixed with VITE_ and forward them to the build job).`;

    const msg = `Firebase config error — missing env: ${missing.join(', ')}. ${hint}`;
    // Provide a clear console error and throw so callers see an actionable message instead of the
    // opaque `auth/invalid-api-key` Firebase error.
    // eslint-disable-next-line no-console
    console.error(msg);
    throw new Error(msg);
  }

  if (!getApps().length) {
    initializeApp(firebaseConfig as any);
  }

  auth = getAuth();
  googleProvider = new GoogleAuthProvider();
  db = getFirestore();
}
