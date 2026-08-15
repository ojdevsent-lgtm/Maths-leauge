# Maths League — Production Clean Build

This build keeps the existing UI while moving trusted operations to Firebase Cloud Functions.

## Security model
- Client can read its own student profile and quiz attempts.
- Client cannot write profiles, attempts, leaderboard records, or counters directly.
- Correct quiz answers exist only in Cloud Functions.
- Final scores and points are calculated server-side.
- Daily attempts are enforced by a deterministic server-side quiz ID and a Firestore transaction.
- Registration numbers are generated atomically by a server-side transaction.

## Deploy

1. Install Firebase CLI and authenticate.
2. From this directory run `firebase use mltp-9f154`.
3. Install function dependencies: `cd functions && npm install && cd ..`.
4. Deploy functions, Firestore rules and hosting: `firebase deploy`.

Before production, review Firebase Authentication authorized domains, enable App Check, and configure the required billing plan for Cloud Functions if Firebase requires it for your project.

## Data collections

- `mlTriviaStudents/{uid}` — authoritative student profile and aggregate stats.
- `quizAttempts/{uid}/attempts/{quizId}` — immutable quiz results.
- `leaderboard/{uid}` — public ranking projection maintained by the backend.
- `counters/studentRegistration` — private registration-number counter.
