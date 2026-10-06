# Firestore rules tests

```bash
# From repo root (Java required for emulator)
firebase emulators:exec --only firestore "cd tests/rules && npm i && npm test"
```

Or:

```bash
firebase emulators:start --only firestore
# other terminal:
cd tests/rules && npm i && npm test
```

## Scenarios

1. New user profile batch (usernames + users + publicProfiles)
1b. Reserved username denied
2. Send message batch (rateLimit + thread + message + thread message)
3. Recipient reads message; other denied
4. Thread get: parties ok, stranger denied
5. users delete denied

Note: `createdAt == request.time` is strict; some emulator setups need `serverTimestamp()`-equivalent for full pass on scenario 2.
