import fs from 'fs';
import path from 'path';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';

const PROJECT_ID = 'demo-rules';
let testEnv: any;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: fs.readFileSync(path.join(__dirname, '../../firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

test('authenticated user can create rule with createdBy matching uid', async () => {
  const alice = await testEnv.authenticatedContext('alice', { uid: 'alice' }).firestore();
  const rulesRef = alice.collection('rules');
  await assertSucceeds(rulesRef.add({ name: 'r1', templateId: 'tpl-1', filter: { tag: 'x' }, createdBy: 'alice', createdAt: new Date() }));
});

test('unauthenticated cannot create rule', async () => {
  const unauth = testEnv.unauthenticatedContext().firestore();
  await assertFails(unauth.collection('rules').add({ name: 'r2', templateId: 'tpl-1', createdBy: 'anon', createdAt: new Date() }));
});
