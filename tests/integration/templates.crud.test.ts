import fs from "fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";

const PROJECT_ID = "demo-templates-crud";
let testEnv: any;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: fs.readFileSync("./firestore.rules", "utf8") } });
});

afterAll(async () => await testEnv.cleanup());

describe("templates CRUD (emulator)", () => {
  it("allows creator to delete their template", async () => {
    const alice = testEnv.authenticatedContext("alice", { email: "alice@example.com" });
    const db = alice.firestore();
    const tplRef = db.collection("templates");
    const created = await tplRef.add({ subject: "T1", htmlBody: "<p>{{name}}</p>", placeholders: ["name"], createdAt: new Date(), createdBy: "alice" });
    await assertSucceeds(created.delete());
  });

  it("denies deletion by non-creator", async () => {
    const alice = testEnv.authenticatedContext("alice", { email: "alice@example.com" });
    const db = alice.firestore();
    const created = await db.collection("templates").add({ subject: "T2", htmlBody: "x", placeholders: [], createdAt: new Date(), createdBy: "alice" });

    const bob = testEnv.authenticatedContext("bob", { email: "bob@example.com" });
    const bobDb = bob.firestore();
    await assertFails(bobDb.collection("templates").doc(created.id).delete());
  });
});
