# Maths League V2 — Pre-Merge Checklist

## Branch
- [x] Work is isolated on `v2-rebuild`.
- [ ] Do not merge into `main` until the end-to-end checks below pass.

## Authentication
- [x] Email/password registration flow exists.
- [x] Registration does not require email verification.
- [x] Registration creates `users/{uid}` and `students/{uid}`.
- [x] Firebase registration errors are surfaced clearly for testing.
- [ ] Verify Email/Password provider is enabled in Firebase Authentication.
- [ ] Verify a fresh account reaches the student dashboard.
- [ ] Verify logout and protected-page redirects.

## Firestore security
- [x] Student documents are owner-readable.
- [x] Student-controlled writes cannot change points, rank, or aggregate statistics.
- [x] Admin access is separated through `admin_users/{uid}`.
- [ ] Deploy and test the current Firestore rules against the live project.
- [ ] Confirm students cannot read other students' private documents.

## Quiz
- [x] Ten-question Maths League Trivia bank is defined.
- [x] Quiz seed flow writes quiz metadata, questions, and a protected answer key.
- [x] Quiz UI supports question-by-question answering.
- [ ] Verify all ten questions render from Firestore.
- [ ] Verify timer, refresh recovery, submit confirmation, and timeout behavior.
- [ ] Replace the current callable-function scoring dependency or explicitly enable the trusted scoring backend.

## Results and leaderboard
- [x] Result page and leaderboard screens exist.
- [ ] Verify submitted attempts are persisted.
- [ ] Verify scoring is performed by trusted logic before league points are awarded.
- [ ] Verify leaderboard writes cannot be performed by students.
- [ ] Verify the student's own rank is visible.

## Admin
- [x] Admin dashboard exists.
- [x] Student management, quiz editing, and announcements UI exist.
- [x] Admin quiz seed flow exists.
- [ ] Verify admin account exists in `admin_users/{uid}`.
- [ ] Verify non-admin users are rejected.

## Deployment
- [ ] Deploy `v2-rebuild` as a Netlify preview.
- [ ] Test on Android/mobile.
- [ ] Test production Firebase configuration.
- [ ] Confirm no Supabase dependency remains in the V2 runtime path.
- [ ] Confirm no accidental production changes.

## Merge gate
Merge only when all unchecked runtime/security tests pass. Keep `main` untouched until then.
