/**
 * Integration test (emulator) for Group Tasks CRUD and Firestore rules.
 * Verifies that tasks require an existing `staff_groups` doc and that only the
 * creator (or admin) can modify/delete.
 */

import fs from "fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";

const PROJECT_ID = "demo-group-tasks";
let testEnv: any;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: fs.readFileSync("./firestore.rules", "utf8") },
  });
});

afterAll(async () => await testEnv.cleanup());

describe("group_tasks CRUD (emulator)", () => {
  it("allows an authenticated user to create a task for an existing group", async () => {
    const admin = testEnv.authenticatedContext("admin", { admin: true }).firestore();
    const alice = testEnv.authenticatedContext("alice", { email: "alice@example.com" }).firestore();

    // seed a group (admin/context-safe)
    const gRef = await admin.collection("staff_groups").add({ name: "HR", createdAt: new Date(), createdBy: "admin", order: 0 });

    await assertSucceeds(alice.collection("group_tasks").add({
      title: "Onboard checklist",
      description: "Welcome kit",
      groupId: gRef.id,
      dueDate: new Date(),
      completed: false,
      createdAt: new Date(),
      createdBy: "alice",
    }));
  });

  it("denies creation when referenced group does not exist", async () => {
    const alice = testEnv.authenticatedContext("alice", { email: "alice@example.com" }).firestore();
    await assertFails(alice.collection("group_tasks").add({
      title: "Orphan task",
      groupId: "does-not-exist",
      completed: false,
      createdAt: new Date(),
      createdBy: "alice",
    }));
  });

  it("accepts client-sent createdAt and omitted completed (common client payload)", async () => {
    const admin = testEnv.authenticatedContext("admin", { admin: true }).firestore();
    const alice = testEnv.authenticatedContext("alice", { email: "alice@example.com" }).firestore();
    const gRef = await admin.collection("staff_groups").add({ name: "HR", createdAt: new Date(), createdBy: "admin", order: 0 });

    // client provides a JS Date and omits `completed`. This previously triggered
    // `Missing or insufficient permissions` in production when rules were stricter.
    await assertSucceeds(alice.collection("group_tasks").add({
      title: "Client timestamp task",
      groupId: gRef.id,
      // completed omitted on purpose
      createdAt: new Date(),
      createdBy: "alice",
    }));
  });

  it("allows creating a relative (dynamic) due spec", async () => {
    const admin = testEnv.authenticatedContext("admin", { admin: true }).firestore();
    const alice = testEnv.authenticatedContext("alice", { email: "alice@example.com" }).firestore();
    const gRef = await admin.collection("staff_groups").add({ name: "HR", createdAt: new Date(), createdBy: "admin", order: 0 });

    await assertSucceeds(alice.collection("group_tasks").add({
      title: "Relative task",
      groupId: gRef.id,
      dueType: 'relative',
      relative: { field: 'contractEffectiveDate', value: 3, unit: 'months' },
      createdAt: new Date(),
      createdBy: 'alice'
    }));
  });

  it("allows creator to delete their task and denies other users", async () => {
    const alice = testEnv.authenticatedContext("alice", { email: "alice@example.com" }).firestore();
    const bob = testEnv.authenticatedContext("bob", { email: "bob@example.com" }).firestore();

    const gRef = await alice.collection("staff_groups").add({ name: "Ops", createdAt: new Date(), createdBy: "alice", order: 0 });
    const tRef = await alice.collection("group_tasks").add({ title: "Do thing", groupId: gRef.id, completed: false, createdAt: new Date(), createdBy: "alice" });

    await assertSucceeds(tRef.delete());

    const t2Ref = await alice.collection("group_tasks").add({ title: "Do other", groupId: gRef.id, completed: false, createdAt: new Date(), createdBy: "alice" });
    const bobDoc = bob.collection("group_tasks").doc(t2Ref.id);
    await assertFails(bobDoc.delete());
  });
});
