// Ambient types for small runtime dev probes (non-secret)
interface AppEnvProbe {
  firebaseConfigIsValid: boolean;
  hasProjectId: boolean;
  hasApiKey: boolean;
}

declare global {
  interface Window {
    /** presence-only probe set by src/lib/firebase/init.ts (never contains secrets) */
    __APP_ENV?: AppEnvProbe;
  }
}

export {};
