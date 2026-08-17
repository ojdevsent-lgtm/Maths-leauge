# Maths League V2 Firestore Schema

## Core collections

### users/{uid}
- `uid`: string
- `email`: string
- `role`: `student` | `admin`
- `createdAt`: timestamp

### students/{uid}
- `uid`: string
- `fullName`: string
- `email`: string
- `school`: string
- `state`: string
- `leaguePoints`: number
- `quizzesTaken`: number
- `averageAccuracy`: number
- `status`: `active` | `inactive`
- `createdAt`: timestamp
- `updatedAt`: timestamp

### quizzes/{quizId}
- `title`: string
- `description`: string
- `status`: `draft` | `scheduled` | `live` | `closed` | `archived`
- `durationSeconds`: number
- `pointsPerCorrect`: number
- `startAt`: timestamp
- `endAt`: timestamp
- `createdBy`: uid
- `createdAt`: timestamp
- `updatedAt`: timestamp

### quizzes/{quizId}/questions/{questionId}
- `order`: number
- `text`: string
- `options`: string[]
- `points`: number
- `active`: boolean

The correct answer must not be exposed to students through the question documents.

### quizAnswerKeys/{quizId}
Server/admin controlled only.
- `answers`: map of questionId -> option index/identifier
- `updatedAt`: timestamp

### quizAttempts/{attemptId}
- `studentId`: uid
- `quizId`: string
- `startedAt`: timestamp
- `submittedAt`: timestamp
- `answers`: map of questionId -> selected option
- `score`: number
- `accuracy`: number
- `timeTakenSeconds`: number
- `leaguePointsAwarded`: number
- `status`: `in_progress` | `submitted` | `expired`

Students may create an attempt for themselves and read their own submitted/in-progress attempt, but must not control score or league points.

### leaderboard/{uid}
Derived/server-controlled data:
- `studentId`: uid
- `displayName`: string
- `school`: string
- `leaguePoints`: number
- `quizzesTaken`: number
- `averageAccuracy`: number
- `rank`: number
- `updatedAt`: timestamp

Students must never be able to write their own points or rank.

### announcements/{announcementId}
- `title`: string
- `body`: string
- `active`: boolean
- `publishedAt`: timestamp
- `expiresAt`: timestamp|null
- `createdBy`: uid

## Security principle

The browser is treated as untrusted. Competitive scoring and leaderboard mutations must be performed through a trusted server-side path. If that trusted path is not deployed, do not expose the answer key or allow client-side league-point writes.
