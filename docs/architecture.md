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
Supabase client + database functions
   ↓
PostgreSQL / Supabase Auth
```

### Authentication

`js/core/session.js` is the single entry point for protected student pages. Pages use `requireUser()` on startup and `onSignedOut()` for session invalidation. Do not run database requests inside `onAuthStateChange` callbacks.

### Data access

Student-facing pages use `js/services/student.service.js`. This keeps database column names and response normalization out of individual pages.

When the database schema changes:

1. Create a Supabase migration.
2. Update the affected service.
3. Update the service tests/checks.
4. Update pages only if the public data contract changed.
5. Deploy only after the preview has been verified.

### Error handling

Every page must have explicit loading, success, empty, and error states. Network/database requests must have a timeout so a failed request can never leave the UI in an infinite loading state.

### Student vs admin

Student pages must never expose admin navigation. Admin authorization is a backend concern and the admin application should remain a separate protected area.

### Quiz integrity

The browser is not trusted to calculate authoritative scores. Final scoring and league-impacting values must be calculated by trusted server/database logic.

## Safe change workflow

1. Inspect the relevant service and database contract before editing.
2. Create a feature branch from `main`.
3. Make the smallest coherent change.
4. Run static/syntax checks and test the affected flow.
5. Deploy to a Netlify preview.
6. Test authentication, loading, error, and empty states.
7. Merge only after verification.

Never make unrelated changes on `main` while implementing a feature.
