# Maths League Architecture

## Goal

Maths League is a student competition platform. The codebase is organized so that UI pages do not own authentication or database logic. Changes should be isolated behind stable services.

## Layers

```text
HTML / UI
   ↓
Page controllers (js/*page*.js)
   ↓
Services (js/services/*.service.js)
   ↓
Firebase client SDKs / Cloud Functions
   ↓
Firestore + Firebase Auth
```

### Authentication

`js/core/session.js` is the single entry point for protected student pages. Pages use `requireUser()` on startup and `onSignedOut()` for session invalidation.

### Data access

Student-facing pages use `js/services/student.service.js`. Quiz and leaderboard operations are isolated behind their service modules. Direct Firestore access from page controllers should be avoided unless there is a documented reason.

### Trusted backend logic

Cloud Functions are authoritative for operations that affect league state:

- student registration-number creation
- daily quiz delivery without correct answers
- quiz scoring and attempt creation
- points and quiz-total updates
- leaderboard/rank calculation
- administrator mutations

The browser is never trusted to calculate authoritative scores or league-impacting values.

### Firestore security

Firestore Rules provide the baseline data boundary. Student-owned profile reads are permitted for the signed-in student; server-owned fields are protected. Quiz attempts are immutable from clients. Administrator operations are handled by callable Cloud Functions after checking `admin_users`.

### Error handling

Every page must have explicit loading, success, empty, and error states. Network/database requests must have a timeout so a failed request can never leave the UI in an infinite loading state.

### Student vs admin

Student pages must never expose admin navigation. Admin authorization is a backend concern and the admin application remains a separate protected area.

## Safe change workflow

1. Inspect the relevant service and Firebase data contract before editing.
2. Create a feature branch from `main`.
3. Make the smallest coherent change.
4. Run static/syntax checks and test the affected flow.
5. Deploy to a Firebase/Netlify preview when applicable.
6. Test authentication, loading, error, empty, and unauthorized states.
7. Merge only after verification.

Never make unrelated changes on `main` while implementing a feature.
