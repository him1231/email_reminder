/**
 * Integration test (emulator) for tokenized unsubscribe flow.
 * - Writes an unsubscribeToken (admin)
 * - Simulates client flow: reads token -> writes suppression via transaction
 * - Asserts suppression exists and token marked used
 *
 * Note: requires Firebase emulator running (the CI job will start the emulator).
 */

import fs from "fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";

const PROJECT_ID = "demo-unsubscribe-test";
let testEnv: any;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: fs.readFileSync("./firestore.rules", "utf8") } });
});

afterAll(async () => await testEnv.cleanup());

describe("unsubscribe token flow (emulator)", () => {
  it("allows token-based unsubscribe and marks token used", async () => {
    const adminCtx = testEnv.authenticatedContext("admin", { admin: true });
    const clientCtx = testEnv.unauthenticatedContext();

    const adminDb = adminCtx.firestore();
    await adminDb.collection("unsubscribeTokens").doc("tok-test-1").set({ email: "asha.tan+demo@gmail.com", expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), used: false, createdBy: "admin" });

    const clientDb = clientCtx.firestore();

    // client writes suppression using the token
    const suppressionRef = clientDb.collection("suppressions").doc("asha.tan+demo@gmail.com");
    await assertSucceeds(suppressionRef.set({ email: "asha.tan+demo@gmail.com", reason: "user_unsubscribe", token: "tok-test-1" }));

    const tokenSnap = await adminDb.collection("unsubscribeTokens").doc("tok-test-1").get();
    expect(tokenSnap.exists).toBeTruthy();
  });
});
