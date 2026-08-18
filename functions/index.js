const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

function requireAuth(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
  return request.auth.uid;
}

async function requireAdmin(uid) {
  const snap = await db.collection("admin_users").doc(uid).get();
  if (!snap.exists) throw new HttpsError("permission-denied", "Administrator access is required.");
}

function cleanText(value, max = 500) {
  return String(value ?? "").trim().slice(0, max);
}

exports.registerStudent = onCall(async request => {
  const uid = requireAuth(request);
  const input = request.data || {};
  const fullName = cleanText(input.fullName, 120);
  const phone = cleanText(input.phone, 40);
  const school = cleanText(input.school, 160);
  const state = cleanText(input.state, 80);
  if (!fullName || !phone || !school || !state) throw new HttpsError("invalid-argument", "Full name, phone, school and state are required.");

  const { getAuth } = require("firebase-admin/auth");
  const userRecord = await getAuth().getUser(uid);
  const studentRef = db.collection("students").doc(uid);
  const counterRef = db.collection("meta").doc("registration_counter");

  return db.runTransaction(async tx => {
    const existing = await tx.get(studentRef);
    if (existing.exists) return { ...existing.data(), id: uid };
    const counter = await tx.get(counterRef);
    const next = Number(counter.exists ? counter.data().value || 0 : 0) + 1;
    const registrationNumber = `ML-${new Date().getUTCFullYear()}-${String(next).padStart(6, "0")}`;
    const now = new Date().toISOString();
    const student = {
      id: uid,
      registration_number: registrationNumber,
      full_name: fullName,
      email: userRecord.email || "",
      phone,
      school,
      state,
      points: 0,
      quizzes_taken: 0,
      status: "active",
      created_at: now,
      updated_at: now
    };
    tx.set(counterRef, { value: next, updated_at: now }, { merge: true });
    tx.set(studentRef, student);
    return student;
  });
});

exports.getDailyQuiz = onCall(async request => {
  const uid = requireAuth(request);
  const student = await db.collection("students").doc(uid).get();
  if (!student.exists || student.data().status !== "active") throw new HttpsError("permission-denied", "Your student profile is not active.");

  const quizSnap = await db.collection("quiz_configs").where("published", "==", true).orderBy("quiz_date", "desc").limit(1).get();
  if (quizSnap.empty) return { completed: false, questions: [] };
  const quizDoc = quizSnap.docs[0];
  const quiz = { id: quizDoc.id, ...quizDoc.data() };
  const attemptRef = db.collection("quiz_attempts").doc(`${uid}_${quiz.id}`);
  const attempt = await attemptRef.get();
  if (attempt.exists) return { completed: true, questions: [], result: publicAttempt(attempt.data()) };

  const questionsSnap = await db.collection("quiz_questions").where("quiz_id", "==", quiz.id).orderBy("order", "asc").get();
  const questions = questionsSnap.docs.map(doc => {
    const q = doc.data();
    return { id: doc.id, question: q.question, options: Array.isArray(q.options) ? q.options : [], order: q.order ?? 0, marks: Number(q.marks ?? 1) };
  });
  return { completed: false, quiz: { id: quiz.id, title: quiz.title, quiz_date: quiz.quiz_date }, questions };
});

function publicAttempt(data) {
  return { score: Number(data.score || 0), totalQuestions: Number(data.total_questions || 0), points: Number(data.points || 0), completedAt: data.completed_at || null };
}

exports.submitDailyQuiz = onCall(async request => {
  const uid = requireAuth(request);
  const answers = Array.isArray(request.data?.answers) ? request.data.answers : [];
  if (answers.length > 100) throw new HttpsError("invalid-argument", "Too many answers.");

  const quizSnap = await db.collection("quiz_configs").where("published", "==", true).orderBy("quiz_date", "desc").limit(1).get();
  if (quizSnap.empty) throw new HttpsError("failed-precondition", "No active quiz is available.");
  const quizDoc = quizSnap.docs[0];
  const quizId = quizDoc.id;
  const attemptRef = db.collection("quiz_attempts").doc(`${uid}_${quizId}`);
  const studentRef = db.collection("students").doc(uid);
  const questionsSnap = await db.collection("quiz_questions").where("quiz_id", "==", quizId).get();
  const questions = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const answerMap = new Map(answers.map(a => [String(a.questionId), a.answer]));
  let score = 0;
  let points = 0;
  const normalizedAnswers = [];

  for (const q of questions) {
    const submitted = answerMap.get(q.id);
    const correct = submitted != null && String(submitted) === String(q.correct_answer);
    if (correct) { score += 1; points += Number(q.marks ?? 1); }
    normalizedAnswers.push({ questionId: q.id, answer: submitted ?? null, correct });
  }

  const now = new Date().toISOString();
  await db.runTransaction(async tx => {
    const attempt = await tx.get(attemptRef);
    const student = await tx.get(studentRef);
    if (attempt.exists) throw new HttpsError("already-exists", "You have already submitted this quiz.");
    if (!student.exists || student.data().status !== "active") throw new HttpsError("permission-denied", "Your student profile is not active.");
    tx.create(attemptRef, { id: attemptRef.id, student_id: uid, quiz_id: quizId, quiz_title: quizDoc.data().title || "Daily Quiz", score, total_questions: questions.length, points, answers: normalizedAnswers, started_at: cleanText(request.data?.startedAt, 60) || null, completed_at: now });
    tx.update(studentRef, { points: FieldValue.increment(points), quizzes_taken: FieldValue.increment(1), updated_at: now });
  });
  return { score, totalQuestions: questions.length, points, completedAt: now };
});

exports.getLeaderboard = onCall(async request => {
  requireAuth(request);
  const snap = await db.collection("students").where("status", "==", "active").orderBy("points", "desc").limit(100).get();
  return snap.docs.map((doc, index) => { const s = doc.data(); return { rank: index + 1, id: doc.id, fullName: s.full_name || "Student", registrationNumber: s.registration_number || "", school: s.school || "", points: Number(s.points || 0), quizzesTaken: Number(s.quizzes_taken || 0) }; });
});

exports.getStudentRank = onCall(async request => {
  const uid = requireAuth(request);
  const student = await db.collection("students").doc(uid).get();
  if (!student.exists) return null;
  const points = Number(student.data().points || 0);
  const higher = await db.collection("students").where("status", "==", "active").where("points", ">", points).get();
  return higher.size + 1;
});

exports.getAdminAccess = onCall(async request => {
  const uid = requireAuth(request);
  await requireAdmin(uid);
  return { isAdmin: true };
});

exports.getAdminDashboard = onCall(async request => {
  const uid = requireAuth(request);
  await requireAdmin(uid);
  const [studentsSnap, attemptsSnap, announcementsSnap] = await Promise.all([
    db.collection("students").orderBy("created_at", "desc").limit(500).get(),
    db.collection("quiz_attempts").orderBy("completed_at", "desc").limit(20).get(),
    db.collection("announcements").orderBy("created_at", "desc").limit(100).get()
  ]);
  const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const studentMap = new Map(students.map(s => [s.id, s]));
  const recentAttempts = attemptsSnap.docs.map(d => { const a = d.data(); const s = studentMap.get(a.student_id) || {}; return { ...a, studentName: s.full_name || "Student", registrationNumber: s.registration_number || "", quizTitle: a.quiz_title || "Daily Quiz", completedAt: a.completed_at || null }; });
  const announcements = announcementsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  return { students, recentAttempts, announcements, stats: { students: students.length, quizzesTaken: students.reduce((n, s) => n + Number(s.quizzes_taken || 0), 0), pointsAwarded: students.reduce((n, s) => n + Number(s.points || 0), 0), activeAnnouncements: announcements.filter(a => a.active === true).length } };
});

exports.setStudentStatus = onCall(async request => {
  const uid = requireAuth(request);
  await requireAdmin(uid);
  const studentId = cleanText(request.data?.studentId, 128);
  const status = cleanText(request.data?.status, 30);
  if (!studentId || !["active", "Suspended"].includes(status)) throw new HttpsError("invalid-argument", "Invalid student status.");
  await db.collection("students").doc(studentId).update({ status, updated_at: new Date().toISOString() });
  return { ok: true };
});

exports.setAnnouncementStatus = onCall(async request => {
  const uid = requireAuth(request);
  await requireAdmin(uid);
  const announcementId = cleanText(request.data?.announcementId, 128);
  const active = request.data?.active === true;
  if (!announcementId) throw new HttpsError("invalid-argument", "Announcement ID is required.");
  await db.collection("announcements").doc(announcementId).update({ active });
  return { ok: true };
});
