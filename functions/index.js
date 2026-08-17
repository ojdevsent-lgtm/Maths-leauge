const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

function requireAuth(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
  return request.auth.uid;
}

async function requireAdmin(uid) {
  const snap = await db.doc(`admin_users/${uid}`).get();
  if (!snap.exists) throw new HttpsError("permission-denied", "Administrator access is required.");
}

function text(value, max = 500) { return String(value ?? "").trim().slice(0, max); }

async function ensureStudent(uid, input = {}) {
  const ref = db.doc(`students/${uid}`);
  const snap = await ref.get();
  if (snap.exists) return snap.data();
  const user = await getAuth().getUser(uid);
  const student = {
    uid,
    fullName: text(input.fullName, 120) || user.displayName || "Student",
    email: user.email || text(input.email, 200),
    phone: text(input.phone, 40),
    school: text(input.school, 160),
    state: text(input.state, 80),
    leaguePoints: 0,
    quizzesTaken: 0,
    averageAccuracy: 0,
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
  await ref.set(student);
  await db.doc(`users/${uid}`).set({ uid, email: user.email || "", role: "student", createdAt: FieldValue.serverTimestamp() }, { merge: true });
  return student;
}

exports.registerStudent = onCall(async request => {
  const uid = requireAuth(request);
  const input = request.data || {};
  const fullName = text(input.fullName, 120);
  const school = text(input.school, 160);
  const state = text(input.state, 80);
  if (!fullName || !school || !state) throw new HttpsError("invalid-argument", "Full name, school and state are required.");
  const existing = await db.doc(`students/${uid}`).get();
  if (existing.exists) return { ...existing.data(), id: uid };
  const user = await getAuth().getUser(uid);
  const student = {
    uid,
    fullName,
    email: user.email || text(input.email, 200),
    phone: text(input.phone, 40),
    school,
    state,
    leaguePoints: 0,
    quizzesTaken: 0,
    averageAccuracy: 0,
    status: "active",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };
  const batch = db.batch();
  batch.set(db.doc(`users/${uid}`), { uid, email: student.email, role: "student", createdAt: FieldValue.serverTimestamp() }, { merge: true });
  batch.set(db.doc(`students/${uid}`), student);
  await batch.commit();
  return { ...student, id: uid };
});

exports.getQuiz = onCall(async request => {
  const uid = requireAuth(request);
  const student = await ensureStudent(uid);
  if (student.status !== "active") throw new HttpsError("permission-denied", "Your student profile is not active.");
  const quizId = text(request.data?.quizId, 128);
  if (!quizId) throw new HttpsError("invalid-argument", "Quiz ID is required.");
  const quizSnap = await db.doc(`quizzes/${quizId}`).get();
  if (!quizSnap.exists) throw new HttpsError("not-found", "Quiz not found.");
  const quiz = quizSnap.data();
  if (quiz.status !== "live") throw new HttpsError("failed-precondition", "This quiz is not currently live.");
  const qSnap = await db.collection(`quizzes/${quizId}/questions`).orderBy("order", "asc").get();
  const questions = qSnap.docs.map(d => {
    const q = d.data();
    return { id: d.id, text: q.text || q.question || "", options: Array.isArray(q.options) ? q.options : [], order: Number(q.order || 0), points: Number(q.points ?? q.marks ?? 1) };
  });
  if (!questions.length) throw new HttpsError("failed-precondition", "This quiz has no questions.");
  return { quiz: { id: quizId, title: quiz.title || "Maths League Quiz", durationSeconds: Number(quiz.durationSeconds || 600) }, questions };
});

exports.submitQuiz = onCall(async request => {
  const uid = requireAuth(request);
  const quizId = text(request.data?.quizId, 128);
  const attemptId = text(request.data?.attemptId, 128);
  const answers = request.data?.answers && typeof request.data.answers === "object" ? request.data.answers : {};
  if (!quizId || !attemptId) throw new HttpsError("invalid-argument", "quizId and attemptId are required.");

  const [quizSnap, attemptSnap, keySnap, studentSnap] = await Promise.all([
    db.doc(`quizzes/${quizId}`).get(),
    db.doc(`attempts/${attemptId}`).get(),
    db.doc(`quizAnswerKeys/${quizId}`).get(),
    db.doc(`students/${uid}`).get()
  ]);
  if (!quizSnap.exists) throw new HttpsError("not-found", "Quiz not found.");
  if (!attemptSnap.exists) throw new HttpsError("not-found", "Attempt not found.");
  if (!keySnap.exists) throw new HttpsError("failed-precondition", "Quiz scoring is not configured.");
  if (!studentSnap.exists || studentSnap.data().status !== "active") throw new HttpsError("permission-denied", "Your student profile is not active.");

  const attempt = attemptSnap.data();
  if (attempt.studentId !== uid || attempt.quizId !== quizId) throw new HttpsError("permission-denied", "This attempt does not belong to you.");
  if (attempt.status === "submitted" || attempt.status === "expired") throw new HttpsError("already-exists", "This attempt has already been submitted.");

  const answerKey = keySnap.data().answers || {};
  const questionIds = Object.keys(answerKey);
  let score = 0;
  let possiblePoints = 0;
  const questionsSnap = await db.collection(`quizzes/${quizId}/questions`).get();
  const pointsByQuestion = new Map(questionsSnap.docs.map(d => [d.id, Number(d.data().points ?? d.data().marks ?? 1)]));
  for (const id of questionIds) {
    const points = pointsByQuestion.get(id) ?? 1;
    possiblePoints += points;
    if (String(answers[id] ?? "") === String(answerKey[id])) score += points;
  }
  const accuracy = possiblePoints ? Math.round((score / possiblePoints) * 100) : 0;
  const started = attempt.startedAt?.toDate ? attempt.startedAt.toDate() : new Date();
  const timeTakenSeconds = Math.max(0, Math.floor((Date.now() - started.getTime()) / 1000));
  const leaguePointsAwarded = score;
  const studentRef = db.doc(`students/${uid}`);
  const leaderboardRef = db.doc(`leaderboard/${uid}`);

  await db.runTransaction(async tx => {
    const freshAttempt = await tx.get(db.doc(`attempts/${attemptId}`));
    const freshStudent = await tx.get(studentRef);
    if (!freshAttempt.exists || freshAttempt.data().status === "submitted" || freshAttempt.data().status === "expired") throw new HttpsError("already-exists", "This attempt has already been submitted.");
    const current = freshStudent.data() || {};
    const quizzesTaken = Number(current.quizzesTaken || 0) + 1;
    const averageAccuracy = Math.round(((Number(current.averageAccuracy || 0) * (quizzesTaken - 1)) + accuracy) / quizzesTaken);
    const leaguePoints = Number(current.leaguePoints || 0) + leaguePointsAwarded;
    tx.update(db.doc(`attempts/${attemptId}`), { answers, score, accuracy, timeTakenSeconds, leaguePointsAwarded, status: "submitted", submittedAt: FieldValue.serverTimestamp() });
    tx.update(studentRef, { leaguePoints, quizzesTaken, averageAccuracy, updatedAt: FieldValue.serverTimestamp() });
    tx.set(leaderboardRef, { studentId: uid, displayName: current.fullName || "Student", school: current.school || "", leaguePoints, quizzesTaken, averageAccuracy, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  });
  return { score, possiblePoints, accuracy, timeTakenSeconds, leaguePointsAwarded };
});

// Compatibility aliases used by older admin/client code while the V2 schema is consolidated.
exports.getDailyQuiz = exports.getQuiz;
exports.submitDailyQuiz = exports.submitQuiz;

exports.getLeaderboard = onCall(async request => {
  requireAuth(request);
  const snap = await db.collection("students").where("status", "==", "active").orderBy("leaguePoints", "desc").limit(100).get();
  return snap.docs.map((d, i) => { const s = d.data(); return { rank: i + 1, id: d.id, fullName: s.fullName || "Student", school: s.school || "", points: Number(s.leaguePoints || 0), quizzesTaken: Number(s.quizzesTaken || 0) }; });
});

exports.getStudentRank = onCall(async request => {
  const uid = requireAuth(request);
  const snap = await db.doc(`students/${uid}`).get();
  if (!snap.exists) return null;
  const points = Number(snap.data().leaguePoints || 0);
  const higher = await db.collection("students").where("status", "==", "active").where("leaguePoints", ">", points).get();
  return higher.size + 1;
});

exports.getAdminDashboard = onCall(async request => {
  const uid = requireAuth(request);
  await requireAdmin(uid);
  const [studentsSnap, attemptsSnap, announcementsSnap] = await Promise.all([
    db.collection("students").orderBy("createdAt", "desc").limit(500).get(),
    db.collection("attempts").orderBy("submittedAt", "desc").limit(20).get(),
    db.collection("announcements").orderBy("publishedAt", "desc").limit(100).get()
  ]);
  const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const studentMap = new Map(students.map(s => [s.id, s]));
  const recentAttempts = attemptsSnap.docs.map(d => { const a = d.data(); const s = studentMap.get(a.studentId) || {}; return { id: d.id, ...a, studentName: s.fullName || "Student" }; });
  const announcements = announcementsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  return { students, recentAttempts, announcements, stats: { students: students.length, quizzesTaken: students.reduce((n, s) => n + Number(s.quizzesTaken || 0), 0), pointsAwarded: students.reduce((n, s) => n + Number(s.leaguePoints || 0), 0), activeAnnouncements: announcements.filter(a => a.active === true).length } };
});

exports.setStudentStatus = onCall(async request => {
  const uid = requireAuth(request); await requireAdmin(uid);
  const studentId = text(request.data?.studentId, 128); const status = text(request.data?.status, 30);
  if (!studentId || !["active", "inactive"].includes(status)) throw new HttpsError("invalid-argument", "Invalid student status.");
  await db.doc(`students/${studentId}`).update({ status, updatedAt: FieldValue.serverTimestamp() }); return { ok: true };
});

exports.setAnnouncementStatus = onCall(async request => {
  const uid = requireAuth(request); await requireAdmin(uid);
  const announcementId = text(request.data?.announcementId, 128); const active = request.data?.active === true;
  if (!announcementId) throw new HttpsError("invalid-argument", "Announcement ID is required.");
  await db.doc(`announcements/${announcementId}`).update({ active, updatedAt: FieldValue.serverTimestamp() }); return { ok: true };
});
