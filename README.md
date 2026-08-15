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


## Production admin setup

The admin dashboard is at `admin.html`. Admin operations are protected server-side by Cloud Functions and the Firestore `adminUsers/{uid}` document.

After deploying, create this Firestore document manually for each administrator:

Collection: `adminUsers`
Document ID: the administrator's Firebase Authentication UID
Fields:
- `active`: `true`
- `name`: administrator name (optional)

Do not create admin access from the client.

### Deployment

From the project root:

```bash
firebase login
firebase use mltp-9f154
firebase deploy --only functions,firestore:rules,hosting
```

The current scoring model is 1 correct answer = 1 point.

If the database contains test data from the previous x10 scoring system, sign in as an administrator, open `admin.html`, and use **Rebuild statistics**. It recalculates student totals and leaderboard values from stored quiz attempt scores.
