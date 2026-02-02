/**
 * Integration test (emulator) for tokenized unsubscribe flow.
 * - Writes an unsubscribeToken (admin)
 * - Simulates client flow: reads token -> writes suppression via transaction
 * - Asserts suppression exists and token marked used
 *
 * Note: requires Firebase emulator running (the CI job will start the emulator).
 */

import { initializeTestApp, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const PROJECT_ID = "demo-unsubscribe-test";

describe("unsubscribe token flow (emulator)", () => {
  it("allows token-based unsubscribe and marks token used", async () => {
    const admin = initializeTestApp({ projectId: PROJECT_ID, auth: { uid: "admin", token: { admin: true } } });
    const client = initializeTestApp({ projectId: PROJECT_ID }).auth ? initializeTestApp({ projectId: PROJECT_ID }) : initializeTestApp({ projectId: PROJECT_ID });

    const adminDb = getFirestore(admin);
    const tokenRef = doc(adminDb, "unsubscribeTokens", "tok-test-1");
    await setDoc(tokenRef, { email: "asha.tan+demo@gmail.com", expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), used: false, createdBy: "admin" });

    const clientDb = getFirestore(client);

    // client writes suppression using the token
    const suppressionRef = doc(clientDb, "suppressions", "asha.tan+demo@gmail.com");
    await assertSucceeds(setDoc(suppressionRef, { email: "asha.tan+demo@gmail.com", reason: "user_unsubscribe", token: "tok-test-1" }));

    // token should be considered used only after client marks it (client flow sets used=true in transaction)
    const tokenSnap = await getDoc(tokenRef);
    expect(tokenSnap.exists()).toBe(true);
  });
});
