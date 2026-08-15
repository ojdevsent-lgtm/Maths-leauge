const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 10 });

const db = getFirestore();
const TIME_ZONE = "Africa/Lagos";

const QUESTIONS = [
  { id: "q1", question: "What is the name of Maths League's founder?", answers: ["Akande Great", "Umukoro Efe", "Umukoro Valerie", "None of the above"], correct: 1 },
  { id: "q2", question: "What is the status of Maths League founder?", answers: ["A graduate", "A student", "A married man", "None of the above"], correct: 1 },
  { id: "q3", question: "When was Maths League created?", answers: ["19th Aug, 2026", "19th Aug, 2024", "19th Aug, 2025", "19th Aug, 2023"], correct: 1 },
  { id: "q4", question: "Who is the pioneer president of Maths League?", answers: ["Ezeh Chris", "Umukoro Efe", "Uwayinor Joan", "Akande Great"], correct: 0 },
  { id: "q5", question: "Who is Akande Great in Maths League?", answers: ["She's the VIP", "She's the President", "She's the PRO", "She's the Admin"], correct: 0 },
  { id: "q6", question: "What was one of Maths League's goals toward a 2-year anniversary?", answers: ["Over 100 members on all platforms", "Organising daily challenges", "Organising competitions", "Having maths seminars"], correct: 0 },
  { id: "q7", question: "What position do you think got initiated into Maths League recently?", answers: ["Director of Technology", "Admin of the League", "Pioneer President", "Vice President"], correct: 0 },
  { id: "q8", question: "Which individual won Mathematician of the Year Award (2025)?", answers: ["Onoride Merit", "Favour Anita", "Uwayinor Joan", "Ezeh Chris"], correct: 2 },
  { id: "q9", question: "By 19th August 2030, Maths League would be ____ years old.", answers: ["5 years", "6 years", "4 years", "2 years"], correct: 1 },
  { id: "q10", question: "What topic was the last quiz organised on in Maths League?", answers: ["Probability", "Matrix", "Sequences & Series", "Simultaneous Equations"], correct: 3 }
];

function lagosDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return { year: map.year, month: map.month, day: map.day };
}

function periodKeys(date = new Date()) {
  const p = lagosDateParts(date);
  return { dailyKey: `${p.year}-${p.month}-${p.day}`, monthlyKey: `${p.year}-${p.month}` };
}

function dailyQuizId() {
  const p = lagosDateParts();
  return `daily_${p.year}_${p.month}_${p.day}`;
}

function publicQuestions(questions = QUESTIONS) {
  return questions.map(({ correct, ...q }) => q);
}

function requireAuth(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
  return request.auth.uid;
}

async function requireAdmin(request) {
  const uid = requireAuth(request);
  const snap = await db.doc(`adminUsers/${uid}`).get();
  if (!snap.exists || snap.data()?.active !== true) {
    throw new HttpsError("permission-denied", "Administrator access is required.");
  }
  return uid;
}

async function getDailyConfig() {
  const snap = await db.doc("quizConfig/daily").get();
  if (!snap.exists) return { title: "Daily Quiz", questions: QUESTIONS, active: true };
  const data = snap.data();
  const questions = Array.isArray(data.questions) && data.questions.length ? data.questions : QUESTIONS;
  return { title: data.title || "Daily Quiz", questions, active: data.active !== false };
}

function validateQuestions(questions) {
  if (!Array.isArray(questions) || !questions.length || questions.length > 50) {
    throw new HttpsError("invalid-argument", "Provide between 1 and 50 questions.");
  }
  for (const q of questions) {
    if (!q || typeof q.question !== "string" || q.question.trim().length < 3) {
      throw new HttpsError("invalid-argument", "Every question needs valid text.");
    }
    if (!Array.isArray(q.answers) || q.answers.length !== 4 || q.answers.some(a => typeof a !== "string" || !a.trim())) {
      throw new HttpsError("invalid-argument", "Every question must have four answers.");
    }
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) {
      throw new HttpsError("invalid-argument", "Every question needs a valid correct answer.");
    }
  }
}

exports.createStudentProfile = onCall(async request => {
  const uid = requireAuth(request);
  const data = request.data || {};
  const fullName = String(data.fullName || "").trim();
  const phone = String(data.phone || "").trim();
  const school = String(data.school || "").trim();
  const state = String(data.state || "").trim();
  const email = String(request.auth.token.email || "").trim();

  if (fullName.length < 2 || school.length < 2 || state.length < 2) {
    throw new HttpsError("invalid-argument", "Full name, school and state are required.");
  }

  const studentRef = db.doc(`mlTriviaStudents/${uid}`);
  const existing = await studentRef.get();
  if (existing.exists) throw new HttpsError("already-exists", "Student profile already exists.");

  return db.runTransaction(async tx => {
    const counterRef = db.doc("counters/studentRegistration");
    const counterSnap = await tx.get(counterRef);
    const next = Number(counterSnap.exists ? counterSnap.data().value || 0 : 0) + 1;
    const registrationNumber = `MLTP${String(next).padStart(5, "0")}`;
    const now = FieldValue.serverTimestamp();

    tx.set(counterRef, { value: next, updatedAt: now }, { merge: true });
    tx.set(studentRef, {
      userId: uid, fullName, email, phone, school, state, registrationNumber,
      status: "Active", totalPoints: 0, quizzesCompleted: 0, averageScore: 0,
      bestScore: 0, createdAt: now, updatedAt: now
    });

    const periods = periodKeys();
    tx.set(db.doc(`leaderboard/${uid}`), {
      userId: uid, fullName, registrationNumber, totalPoints: 0, quizzesTaken: 0,
      bestScore: 0, dailyPoints: 0, monthlyPoints: 0,
      dailyKey: periods.dailyKey, monthlyKey: periods.monthlyKey, updatedAt: now
    });

    return { registrationNumber };
  });
});

exports.getDailyQuiz = onCall(async request => {
  const uid = requireAuth(request);
  const id = dailyQuizId();
  const config = await getDailyConfig();
  const attempt = await db.doc(`quizAttempts/${uid}/attempts/${id}`).get();

  return {
    quizId: id,
    title: config.title,
    active: config.active,
    completed: attempt.exists,
    questions: attempt.exists || !config.active ? [] : publicQuestions(config.questions),
    totalQuestions: config.questions.length
  };
});

exports.submitDailyQuiz = onCall(async request => {
  const uid = requireAuth(request);
  const submitted = request.data?.answers;
  const config = await getDailyConfig();

  if (!config.active) throw new HttpsError("failed-precondition", "Today's Daily Quiz is not available.");
  if (!Array.isArray(submitted) || submitted.length !== config.questions.length ||
      submitted.some(v => !Number.isInteger(v) || v < 0 || v > 3)) {
    throw new HttpsError("invalid-argument", "Invalid answer payload.");
  }

  const id = dailyQuizId();
  const attemptRef = db.doc(`quizAttempts/${uid}/attempts/${id}`);
  const studentRef = db.doc(`mlTriviaStudents/${uid}`);
  const leaderboardRef = db.doc(`leaderboard/${uid}`);
  const score = config.questions.reduce((sum, q, i) => sum + (submitted[i] === q.correct ? 1 : 0), 0);
  const totalQuestions = config.questions.length;
  const points = score;
  const periods = periodKeys();

  return db.runTransaction(async tx => {
    const attemptSnap = await tx.get(attemptRef);
    const studentSnap = await tx.get(studentRef);
    const leaderboardSnap = await tx.get(leaderboardRef);

    if (attemptSnap.exists) throw new HttpsError("already-exists", "You have already completed today's Daily Quiz.");
    if (!studentSnap.exists) throw new HttpsError("failed-precondition", "Student profile not found.");

    const student = studentSnap.data();
    if (student.status === "Suspended") {
      throw new HttpsError("permission-denied", "Your Maths League account is currently suspended.");
    }
    const oldLeaderboard = leaderboardSnap.exists ? leaderboardSnap.data() : {};
    const quizzesCompleted = Number(student.quizzesCompleted || 0) + 1;
    const totalPoints = Number(student.totalPoints || 0) + points;
    const bestScore = Math.max(Number(student.bestScore || 0), score);
    const previousDaily = oldLeaderboard.dailyKey === periods.dailyKey ? Number(oldLeaderboard.dailyPoints || 0) : 0;
    const previousMonthly = oldLeaderboard.monthlyKey === periods.monthlyKey ? Number(oldLeaderboard.monthlyPoints || 0) : 0;
    const averageScore = Math.round(
      ((Number(student.averageScore || 0) * (quizzesCompleted - 1)) +
      (score / totalQuestions * 100)) / quizzesCompleted
    );
    const now = FieldValue.serverTimestamp();

    tx.create(attemptRef, {
      quizId: id, quizTitle: config.title, score, points, totalQuestions,
      answers: submitted, completedAt: now
    });

    tx.set(studentRef, {
      totalPoints, quizzesCompleted, averageScore, bestScore, updatedAt: now
    }, { merge: true });

    tx.set(leaderboardRef, {
      userId: uid, fullName: student.fullName || "Student",
      registrationNumber: student.registrationNumber || "", totalPoints,
      quizzesTaken: quizzesCompleted, bestScore,
      dailyPoints: previousDaily + points, monthlyPoints: previousMonthly + points,
      dailyKey: periods.dailyKey, monthlyKey: periods.monthlyKey, updatedAt: now
    }, { merge: true });

    return { score, points, totalQuestions, totalPoints, quizId: id };
  });
});

exports.getLeaderboard = onCall(async request => {
  requireAuth(request);
  const mode = ["overall", "daily", "monthly"].includes(request.data?.mode) ? request.data.mode : "overall";
  const field = mode === "daily" ? "dailyPoints" : mode === "monthly" ? "monthlyPoints" : "totalPoints";
  const snap = await db.collection("leaderboard").limit(500).get();
  const periods = periodKeys();

  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const filtered = rows.map(r => ({
    ...r,
    points: (mode === "daily" && r.dailyKey !== periods.dailyKey) ||
      (mode === "monthly" && r.monthlyKey !== periods.monthlyKey) ? 0 : Number(r[field] || 0)
  }));

  filtered.sort((a, b) => b.points - a.points || String(a.fullName || "").localeCompare(String(b.fullName || "")));

  return filtered.slice(0, 100).map((r, i) => ({
    rank: i + 1, fullName: r.fullName || "Student",
    registrationNumber: r.registrationNumber || "", points: r.points
  }));
});

exports.getStudentDashboard = onCall(async request => {
  const uid = requireAuth(request);
  const studentSnap = await db.doc(`mlTriviaStudents/${uid}`).get();
  if (!studentSnap.exists) throw new HttpsError("not-found", "Student profile not found.");

  const student = studentSnap.data();
  const attemptsSnap = await db.collection(`quizAttempts/${uid}/attempts`).orderBy("completedAt", "desc").limit(50).get();
  const attempts = attemptsSnap.docs.map(d => {
    const a = d.data();
    return {
      id: d.id, quizTitle: a.quizTitle || "Daily Quiz",
      score: Number(a.score || 0), totalQuestions: Number(a.totalQuestions || 0),
      points: Number(a.points || 0),
      completedAt: a.completedAt?.toDate?.()?.toISOString() || null
    };
  });

  const leaders = await db.collection("leaderboard").orderBy("totalPoints", "desc").limit(500).get();
  const rankIndex = leaders.docs.findIndex(d => d.id === uid);
  const announcementsSnap = await db.collection("announcements").limit(50).get();
  const announcements = announcementsSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(a => a.active === true)
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    .slice(0, 5);

  return {
    student: {
      fullName: student.fullName, registrationNumber: student.registrationNumber,
      email: student.email, status: student.status
    },
    stats: {
      totalPoints: Number(student.totalPoints || 0),
      quizzesCompleted: Number(student.quizzesCompleted || 0),
      averageScore: Number(student.averageScore || 0),
      leagueRank: rankIndex >= 0 ? rankIndex + 1 : null
    },
    recentAttempts: attempts.slice(0, 5),
    attempts,
    announcements
  };
});

exports.isAdmin = onCall(async request => {
  const uid = requireAuth(request);
  const snap = await db.doc(`adminUsers/${uid}`).get();
  return { admin: snap.exists && snap.data()?.active === true };
});


exports.rebuildStats = onCall(async request => {
  await requireAdmin(request);

  const [studentsSnap, attemptsSnap] = await Promise.all([
    db.collection("mlTriviaStudents").limit(1000).get(),
    db.collectionGroup("attempts").limit(5000).get()
  ]);

  const byStudent = new Map();

  for (const docSnap of attemptsSnap.docs) {
    const uid = docSnap.ref.parent.parent?.id;
    if (!uid) continue;
    const a = docSnap.data();
    const score = Number(a.score || 0);
    const points = score;
    const totalQuestions = Number(a.totalQuestions || 0);
    const completedAt = a.completedAt?.toDate?.() || null;
    const periods = completedAt ? periodKeys(completedAt) : null;

    if (!byStudent.has(uid)) {
      byStudent.set(uid, {
        totalPoints: 0, quizzesCompleted: 0, bestScore: 0,
        scorePercentSum: 0, dailyPoints: 0, monthlyPoints: 0,
        dailyKey: null, monthlyKey: null
      });
    }

    const stat = byStudent.get(uid);
    stat.totalPoints += points;
    stat.quizzesCompleted += 1;
    stat.bestScore = Math.max(stat.bestScore, score);
    if (totalQuestions > 0) stat.scorePercentSum += (score / totalQuestions) * 100;

    if (periods) {
      const current = periodKeys();
      if (periods.dailyKey === current.dailyKey) stat.dailyPoints += points;
      if (periods.monthlyKey === current.monthlyKey) stat.monthlyPoints += points;
      stat.dailyKey = current.dailyKey;
      stat.monthlyKey = current.monthlyKey;
    }
  }

  const currentPeriods = periodKeys();
  let batch = db.batch();
  let operations = 0;
  const commit = async () => {
    if (!operations) return;
    await batch.commit();
    batch = db.batch();
    operations = 0;
  };

  for (const studentDoc of studentsSnap.docs) {
    const uid = studentDoc.id;
    const student = studentDoc.data();
    const stat = byStudent.get(uid) || {
      totalPoints: 0, quizzesCompleted: 0, bestScore: 0,
      scorePercentSum: 0, dailyPoints: 0, monthlyPoints: 0
    };

    const quizzes = stat.quizzesCompleted;
    const averageScore = quizzes ? Math.round(stat.scorePercentSum / quizzes) : 0;
    const ref = db.doc(`mlTriviaStudents/${uid}`);
    const leaderboardRef = db.doc(`leaderboard/${uid}`);

    batch.set(ref, {
      totalPoints: stat.totalPoints,
      quizzesCompleted: quizzes,
      averageScore,
      bestScore: stat.bestScore,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    batch.set(leaderboardRef, {
      userId: uid,
      fullName: student.fullName || "Student",
      registrationNumber: student.registrationNumber || "",
      totalPoints: stat.totalPoints,
      quizzesTaken: quizzes,
      bestScore: stat.bestScore,
      dailyPoints: stat.dailyPoints,
      monthlyPoints: stat.monthlyPoints,
      dailyKey: currentPeriods.dailyKey,
      monthlyKey: currentPeriods.monthlyKey,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    operations += 2;
    if (operations >= 450) await commit();
  }

  await commit();
  return { success: true, students: studentsSnap.size, attempts: attemptsSnap.size };
});

exports.getAdminDashboard = onCall(async request => {
  await requireAdmin(request);

  const [studentsSnap, leaderboardSnap, attemptsSnap, announcementsSnap] = await Promise.all([
    db.collection("mlTriviaStudents").limit(1000).get(),
    db.collection("leaderboard").limit(1000).get(),
    db.collectionGroup("attempts").limit(2000).get(),
    db.collection("announcements").orderBy("createdAt", "desc").limit(20).get()
  ]);

  const students = studentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const attempts = attemptsSnap.docs.map(d => ({
      id: d.id,
      studentId: d.ref.parent.parent?.id || "",
      ...d.data()
    }));
  const leaderboard = leaderboardSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  return {
    stats: {
      students: students.length,
      quizzesTaken: attempts.length,
      pointsAwarded: leaderboard.reduce((sum, r) => sum + Number(r.totalPoints || 0), 0),
      activeAnnouncements: announcementsSnap.docs.filter(d => d.data()?.active === true).length
    },
    students: students.map(s => ({
      id: s.id, fullName: s.fullName || "Student", email: s.email || "",
      registrationNumber: s.registrationNumber || "", school: s.school || "",
      state: s.state || "", status: s.status || "Active",
      totalPoints: Number(s.totalPoints || 0), quizzesCompleted: Number(s.quizzesCompleted || 0),
      averageScore: Number(s.averageScore || 0)
    })),
    recentAttempts: attempts.sort((a, b) => {
      const at = a.completedAt?.toMillis?.() || 0;
      const bt = b.completedAt?.toMillis?.() || 0;
      return bt - at;
    }).slice(0, 100).map(a => ({
      id: a.id, quizId: a.quizId || "", quizTitle: a.quizTitle || "Quiz",
      score: Number(a.score || 0), totalQuestions: Number(a.totalQuestions || 0),
      points: Number(a.points || 0), completedAt: a.completedAt?.toDate?.()?.toISOString() || null
    })),
    announcements
  };
});

exports.getAdminQuiz = onCall(async request => {
  await requireAdmin(request);
  const config = await getDailyConfig();
  return { title: config.title, active: config.active, questions: config.questions };
});

exports.saveAdminQuiz = onCall(async request => {
  await requireAdmin(request);
  const title = String(request.data?.title || "Daily Quiz").trim().slice(0, 120);
  const active = request.data?.active !== false;
  const questions = request.data?.questions;
  validateQuestions(questions);

  const normalized = questions.map((q, index) => ({
    id: String(q.id || `q${index + 1}`),
    question: q.question.trim(),
    answers: q.answers.map(a => a.trim()),
    correct: q.correct
  }));

  await db.doc("quizConfig/daily").set({
    title, active, questions: normalized, updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  return { success: true };
});

exports.updateStudentStatus = onCall(async request => {
  await requireAdmin(request);
  const uid = String(request.data?.uid || "");
  const status = String(request.data?.status || "");
  if (!uid || !["Active", "Suspended"].includes(status)) {
    throw new HttpsError("invalid-argument", "Invalid student status.");
  }

  const ref = db.doc(`mlTriviaStudents/${uid}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Student not found.");

  await ref.update({ status, updatedAt: FieldValue.serverTimestamp() });
  return { success: true };
});

exports.createAnnouncement = onCall(async request => {
  const uid = await requireAdmin(request);
  const title = String(request.data?.title || "").trim().slice(0, 120);
  const body = String(request.data?.body || "").trim().slice(0, 1000);
  if (!title || !body) throw new HttpsError("invalid-argument", "Title and message are required.");

  const ref = db.collection("announcements").doc();
  await ref.set({
    title, body, active: true, createdBy: uid, createdAt: FieldValue.serverTimestamp()
  });
  return { id: ref.id };
});

exports.toggleAnnouncement = onCall(async request => {
  await requireAdmin(request);
  const id = String(request.data?.id || "");
  if (!id) throw new HttpsError("invalid-argument", "Announcement ID is required.");
  const ref = db.doc(`announcements/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Announcement not found.");
  await ref.update({ active: request.data?.active === true });
  return { success: true };
});
