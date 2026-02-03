/**
 * Integration test (emulator) for Staff CRUD as an authenticated user.
 * Ensures client creates include `createdBy` and Firestore rules accept the write.
 */

import fs from "fs";
import { initializeTestEnvironment, assertSucceeds } from "@firebase/rules-unit-testing";

const PROJECT_ID = "demo-staff-crud";
let testEnv: any;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: fs.readFileSync("./firestore.rules", "utf8") },
  });
});

afterAll(async () => await testEnv.cleanup());

describe("staff CRUD (emulator)", () => {
  it("allows an authenticated user to create a staff doc with createdBy", async () => {
    const aliceCtx = testEnv.authenticatedContext("alice", { email: "alice@example.com" });
    const db = aliceCtx.firestore();

    const staffRef = db.collection("staff");
    await assertSucceeds(staffRef.add({
      name: "Alice Dev",
      staffNo: "DEV-001",
      email: "alice+demo@example.com",
      contractEffectiveDate: new Date().toISOString(),
      createdAt: new Date(),
      createdBy: "alice"
    }));
  });

  it("allows the creator to delete their staff doc", async () => {
    const aliceCtx = testEnv.authenticatedContext("alice", { email: "alice@example.com" });
    const db = aliceCtx.firestore();
    const docRef = db.collection("staff");
    const created = await docRef.add({ name: "ToDelete", staffNo: "X", email: "x@example.com", contractEffectiveDate: new Date().toISOString(), createdAt: new Date(), createdBy: "alice" });
    await assertSucceeds(created.delete());
  });

  it("denies deletion by a different authenticated user", async () => {
    const aliceAdmin = testEnv.authenticatedContext("alice", { email: "alice@example.com" });
    const dbAdmin = aliceAdmin.firestore();
    const createdRef = await dbAdmin.collection("staff").add({ name: "NotYours", staffNo: "X2", email: "x2@example.com", contractEffectiveDate: new Date().toISOString(), createdAt: new Date(), createdBy: "alice" });

    const bobCtx = testEnv.authenticatedContext("bob", { email: "bob@example.com" });
    const bobDb = bobCtx.firestore();
    const bobDocRef = bobDb.collection("staff").doc(createdRef.id);

    await assertFails(bobDocRef.delete());
  });
});
