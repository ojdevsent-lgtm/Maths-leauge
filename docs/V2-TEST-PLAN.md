# Maths League V2 — Pre-merge Test Plan

## Gate 1: Authentication
- Register with a fresh email.
- Confirm Firebase Auth user is created.
- Confirm `users/{uid}` and `students/{uid}` are created.
- Confirm the user reaches the dashboard without email verification.
- Log out and confirm protected pages redirect to login.
- Log back in successfully.

## Gate 2: Student data
- Dashboard loads the authenticated student's own profile.
- Another student's document cannot be read by changing the UID.
- Student cannot change role, points, rank, or other protected fields.

## Gate 3: Quiz
- Live quiz is discovered from Firestore.
- Exactly 10 trivia questions load.
- Answer options match the approved question bank.
- Answer key is not readable by the student before submission.
- Previous/next navigation works.
- Selected answers persist while navigating.
- Timer counts down from the server-authoritative attempt start time.
- Refresh does not create a second active attempt.
- Submit confirmation reports unanswered questions.
- Timeout submits the attempt.

## Gate 4: Results
- Score and accuracy are calculated from the authoritative answer key.
- A submitted attempt cannot be edited by the student.
- Student can only read their own attempt.
- League points are written by a trusted server-side path, never by a client-controlled points field.

## Gate 5: Leaderboard
- Ranking reflects authoritative league points.
- Student can see their own rank.
- Tie-breaking is deterministic.
- Student cannot directly edit leaderboard points or rank.

## Gate 6: Admin
- Admin access requires authentication and an admin record/role.
- Student cannot access admin pages or admin data.
- Admin can create/edit quiz drafts.
- Admin can manage questions and announcements.
- Publishing is explicit.

## Gate 7: Deployment
- Test `v2-rebuild` in a Netlify deploy preview.
- Verify Firebase production configuration.
- Verify all pages and relative paths on mobile.
- Verify no Supabase dependency remains.

## Merge gate
Merge `v2-rebuild` into `main` only after all gates pass. Never weaken Firestore rules to make a test pass. If trusted server-side scoring is unavailable, keep competitive scoring disabled rather than exposing the answer key.
