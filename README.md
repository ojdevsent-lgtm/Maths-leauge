# Maths League — Firebase migration

Maths League is a student maths-competition platform with registration, authentication, daily quizzes, trusted server-side scoring, progress tracking, leaderboard rankings, announcements, and an admin dashboard.

## Current architecture

The `firebase-migration` branch moves the application backend from Supabase to Firebase while preserving the existing HTML/CSS/JavaScript frontend and service-layer boundaries.

```text
HTML / UI
   ↓
Page controllers (js/*.js)
   ↓
Services (js/services/*.service.js)
   ↓
Firebase Auth + Firestore + Cloud Functions
```

### Firebase responsibilities

- **Firebase Authentication** — student login, signup, password reset, session state.
- **Cloud Firestore** — students, quizzes, questions, attempts, announcements, and admin authorization.
- **Cloud Functions** — registration-number generation, quiz delivery, authoritative scoring, leaderboard/rank queries, and protected admin mutations.
- **Firestore Security Rules** — student/admin read boundaries and server-owned fields.

## Security model

- Students can read their own profile but cannot directly change points, quiz totals, registration numbers, or statuses.
- Quiz questions containing correct answers are never returned to student clients.
- Quiz scoring runs in a trusted Cloud Function.
- Quiz attempt IDs are deterministic per student/quiz, preventing duplicate submissions.
- Admin functions verify membership in `admin_users` before privileged operations.
- Firestore rules deny direct creation, update, or deletion of quiz attempts.

## Firestore collections

- `students` — student profiles and aggregate statistics.
- `quiz_configs` — quiz metadata and publication state.
- `quiz_questions` — trusted question bank, including correct answers.
- `quiz_attempts` — immutable submitted results.
- `announcements` — published notices.
- `admin_users` — administrator authorization records.
- `meta/registration_counter` — atomic registration-number sequence.

## Firebase configuration

`js/firebase.js` contains placeholders for the Firebase web configuration. Replace them with the configuration from the Firebase console before deployment. Firebase web configuration values are identifiers, not service-account secrets; never put a Firebase Admin SDK service-account key in frontend code.

## Deployment

1. Create/select the Firebase project.
2. Enable Email/Password authentication.
3. Create the Firestore database.
4. Add the first administrator's UID to `admin_users` using a trusted admin workflow.
5. Replace the Firebase web config placeholders.
6. Deploy Firestore rules/indexes and Cloud Functions with the Firebase CLI.
7. Run end-to-end authentication, quiz, scoring, leaderboard, progress, and admin tests.

## Migration status

The migration branch contains the Firebase client foundation, Firestore rules/indexes, trusted Cloud Functions, authentication migration, student/quiz/leaderboard services, and admin dashboard migration. The Supabase files remain untouched on `main` until Firebase is configured and verified end-to-end.

## Repository name

The repository remains `Maths-leauge` intentionally to avoid breaking existing links and deployment references.
