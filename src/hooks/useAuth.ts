import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, User } from "firebase/auth";
import { auth, googleProvider, firebaseConfigIsValid } from "../lib/firebase/init";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If client Firebase config is not present, don't call SDK methods —
    // they will fail because `auth` may be an inert stub. Let the app show
    // the dev-setup banner instead of crashing with a TypeError.
    if (!firebaseConfigIsValid) {
      setUser(null);
      setLoading(false);
      return () => {};
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    if (!firebaseConfigIsValid) throw new Error('Firebase not configured (see README)');
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    if (!firebaseConfigIsValid) return;
    await fbSignOut(auth);
  };

  return { user, loading, signInWithGoogle, signOut };
}
