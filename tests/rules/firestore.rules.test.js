/**
 * Firestore rules tests.
 * Run: firebase emulators:exec --only firestore "cd tests/rules && npm i && npm test"
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  doc, setDoc, getDoc, collection, writeBatch, deleteDoc,
  Timestamp, serverTimestamp,
} from "firebase/firestore";

const __dir = dirname(fileURLToPath(import.meta.url));
const rules = readFileSync(resolve(__dir, "../../firestore/rules/firestore.rules"), "utf8");

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-anonmsg",
    firestore: { rules, host: "127.0.0.1", port: 8080 },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

function authed(uid) {
  return testEnv.authenticatedContext(uid).firestore();
}

function secret() {
  return "a".repeat(32);
}

/** request.time in rules is evaluated at commit; serverTimestamp() maps correctly in emulator. */
test("1) new user creates profile batch", async () => {
  const db = authed("user1");
  const username = "alice";
  const batch = writeBatch(db);
  batch.set(doc(db, "usernames", username), { uid: "user1", createdAt: serverTimestamp() });
  batch.set(doc(db, "users", "user1"), {
    uid: "user1",
    username,
    displayName: "Alice",
    bio: "hi",
    avatarColor: "#5b5ce2",
    inboxOpen: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, "publicProfiles", username), {
    uid: "user1",
    username,
    displayName: "Alice",
    bio: "hi",
    avatarColor: "#5b5ce2",
    inboxOpen: true,
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(batch.commit());
});

test("1b) reserved username denied", async () => {
  const db = authed("user2");
  const batch = writeBatch(db);
  batch.set(doc(db, "usernames", "admin"), { uid: "user2", createdAt: serverTimestamp() });
  batch.set(doc(db, "users", "user2"), {
    uid: "user2", username: "admin", displayName: "x", bio: "x",
    avatarColor: "#5b5ce2", inboxOpen: true,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, "publicProfiles", "admin"), {
    uid: "user2", username: "admin", displayName: "x", bio: "x",
    avatarColor: "#5b5ce2", inboxOpen: true, updatedAt: serverTimestamp(),
  });
  await assertFails(batch.commit());
});

test("2) sender message batch (rateLimit + thread + message + thread message)", async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "usernames", "bob"), { uid: "bob1" });
    await setDoc(doc(db, "users", "bob1"), {
      uid: "bob1", username: "bob", displayName: "Bob", bio: "",
      avatarColor: "#5b5ce2", inboxOpen: true,
    });
  });

  const db = authed("anon1");
  const s = secret();
  const batch = writeBatch(db);
  const msgRef = doc(collection(db, "messages"));
  batch.set(doc(db, "rateLimits", "anon1"), {
    lastSent: serverTimestamp(),
    count: 1,
  });
  batch.set(doc(db, "threads", s), {
    creatorUid: "anon1",
    recipientUid: "bob1",
    messageId: msgRef.id,
    status: "open",
    mutualReveal: false,
    revealByRecipient: false,
    revealBySender: false,
    senderUsername: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(msgRef, {
    recipientUid: "bob1",
    recipientUsername: "bob",
    body: "hello",
    anonymous: true,
    sessionId: null,
    threadSecret: s,
    status: "delivered",
    read: false,
    reaction: null,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(collection(db, "threads", s, "messages")), {
    body: "hello",
    authorUid: "anon1",
    createdAt: serverTimestamp(),
  });
  await assertSucceeds(batch.commit());
});

test("3) recipient can read own messages only", async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "messages", "m1"), {
      recipientUid: "bob1", body: "hi", anonymous: true, status: "delivered", read: false,
    });
  });
  await assertSucceeds(getDoc(doc(authed("bob1"), "messages", "m1")));
  await assertFails(getDoc(doc(authed("other"), "messages", "m1")));
});

test("4) other account denied thread get", async () => {
  const s = secret();
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "threads", s), {
      creatorUid: "anon1", recipientUid: "bob1", mutualReveal: false,
    });
  });
  await assertSucceeds(getDoc(doc(authed("bob1"), "threads", s)));
  await assertSucceeds(getDoc(doc(authed("anon1"), "threads", s)));
  await assertFails(getDoc(doc(authed("other"), "threads", s)));
});

test("5) users delete denied", async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "users", "user1"), { uid: "user1", username: "alice" });
  });
  await assertFails(deleteDoc(doc(authed("user1"), "users", "user1")));
});
