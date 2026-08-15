const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
setGlobalOptions({ region: "europe-west1", maxInstances: 10 });
const db = getFirestore();
const TIME_ZONE = "Africa/Lagos";
function periodKeys(date = new Date()) { const p = lagosDateParts(date); return { dailyKey: `${p.year}-${p.month}-${p.day}`, monthlyKey: `${p.year}-${p.month}` }; }

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
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return { year: map.year, month: map.month, day: map.day };
}
function dailyQuizId() {
  const p = lagosDateParts();
  return `daily_${p.year}_${p.month}_${p.day}`;
}
function publicQuestions() {
  return QUESTIONS.map(({ correct, ...q }) => q);
}
function requireAuth(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
  return request.auth.uid;
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

  const result = await db.runTransaction(async tx => {
    const counterRef = db.doc("counters/studentRegistration");
    const counterSnap = await tx.get(counterRef);
    const next = Number(counterSnap.exists ? counterSnap.data().value || 0 : 0) + 1;
    const registrationNumber = `MLTP${String(next).padStart(5, "0")}`;
    const profile = {
      userId: uid, fullName, email, phone, school, state,
      registrationNumber, status: "Active", totalPoints: 0,
      quizzesCompleted: 0, averageScore: 0, bestScore: 0,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
    };
    tx.set(counterRef, { value: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(studentRef, profile);
    tx.set(db.doc(`leaderboard/${uid}`), {
      userId: uid, fullName, registrationNumber, totalPoints: 0,
      quizzesTaken: 0, bestScore: 0, dailyPoints: 0, monthlyPoints: 0, dailyKey: periodKeys().dailyKey, monthlyKey: periodKeys().monthlyKey, updatedAt: FieldValue.serverTimestamp()
    });
    return { registrationNumber };
  });
  return result;
});

exports.getDailyQuiz = onCall(async request => {
  const uid = requireAuth(request);
  const id = dailyQuizId();
  const attempt = await db.doc(`quizAttempts/${uid}/attempts/${id}`).get();
  return { quizId: id, completed: attempt.exists, questions: attempt.exists ? [] : publicQuestions(), totalQuestions: QUESTIONS.length };
});

exports.submitDailyQuiz = onCall(async request => {
  const uid = requireAuth(request);
  const submitted = request.data?.answers;
  if (!Array.isArray(submitted) || submitted.length !== QUESTIONS.length || submitted.some(v => !Number.isInteger(v) || v < 0 || v > 3)) {
    throw new HttpsError("invalid-argument", "Invalid answer payload.");
  }

  const id = dailyQuizId();
  const attemptRef = db.doc(`quizAttempts/${uid}/attempts/${id}`);
  const studentRef = db.doc(`mlTriviaStudents/${uid}`);
  const leaderboardRef = db.doc(`leaderboard/${uid}`);
  const score = QUESTIONS.reduce((sum, q, i) => sum + (submitted[i] === q.correct ? 1 : 0), 0);
  const totalQuestions = QUESTIONS.length;
  const points = score;
  const periods = periodKeys();

  const result = await db.runTransaction(async tx => {
    const [attemptSnap, studentSnap, leaderboardSnap] = await Promise.all([tx.get(attemptRef), tx.get(studentRef), tx.get(leaderboardRef)]);
    if (attemptSnap.exists) throw new HttpsError("already-exists", "You have already completed today's Daily Quiz.");
    if (!studentSnap.exists) throw new HttpsError("failed-precondition", "Student profile not found.");

    const student = studentSnap.data();
    const oldLeaderboard = leaderboardSnap.exists ? leaderboardSnap.data() : {};
    const quizzesCompleted = Number(student.quizzesCompleted || 0) + 1;
    const oldPoints = Number(student.totalPoints || 0);
    const totalPoints = oldPoints + points;
    const oldBest = Number(student.bestScore || 0);
    const bestScore = Math.max(oldBest, score);
    const previousDaily = oldLeaderboard.dailyKey === periods.dailyKey ? Number(oldLeaderboard.dailyPoints || 0) : 0;
    const previousMonthly = oldLeaderboard.monthlyKey === periods.monthlyKey ? Number(oldLeaderboard.monthlyPoints || 0) : 0;
    const averageScore = Math.round(((Number(student.averageScore || 0) * (quizzesCompleted - 1)) + (score / totalQuestions * 100)) / quizzesCompleted);

    tx.create(attemptRef, {
      quizId: id, quizTitle: "Daily Quiz", score, points, totalQuestions,
      answers: submitted, completedAt: FieldValue.serverTimestamp()
    });
    tx.set(studentRef, { totalPoints, quizzesCompleted, averageScore, bestScore, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(leaderboardRef, {
      userId: uid, fullName: student.fullName || "Student",
      registrationNumber: student.registrationNumber || "",
      totalPoints, quizzesTaken: quizzesCompleted, bestScore,
      dailyPoints: previousDaily + points, monthlyPoints: previousMonthly + points,
      dailyKey: periods.dailyKey, monthlyKey: periods.monthlyKey,
      updatedAt: FieldValue.serverTimestamp(), previousTotalPoints: Number(oldLeaderboard.totalPoints || 0)
    }, { merge: true });
    return { score, points, totalQuestions, quizId: id };
  });
  return result;
});

exports.getLeaderboard = onCall(async request => {
  requireAuth(request);
  const mode = ["overall", "daily", "monthly"].includes(request.data?.mode) ? request.data.mode : "overall";
  const field = mode === "daily" ? "dailyPoints" : mode === "monthly" ? "monthlyPoints" : "totalPoints";
  const snap = await db.collection("leaderboard").limit(500).get();
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const periods = periodKeys();
  const filtered = rows.map(r => ({ ...r, points: (mode === "daily" && r.dailyKey !== periods.dailyKey) || (mode === "monthly" && r.monthlyKey !== periods.monthlyKey) ? 0 : Number(r[field] || 0) }));
  filtered.sort((a,b) => b.points - a.points || String(a.fullName || "").localeCompare(String(b.fullName || "")));
  return filtered.slice(0, 100).map((r, i) => ({ rank: i + 1, fullName: r.fullName || "Student", registrationNumber: r.registrationNumber || "", points: r.points }));
});

exports.getStudentDashboard = onCall(async request => {
  const uid = requireAuth(request);
  const studentSnap = await db.doc(`mlTriviaStudents/${uid}`).get();
  if (!studentSnap.exists) throw new HttpsError("not-found", "Student profile not found.");
  const student = studentSnap.data();
  const attemptsSnap = await db.collection(`quizAttempts/${uid}/attempts`).orderBy("completedAt", "desc").limit(50).get();
  const attempts = attemptsSnap.docs.map(d => {
    const a = d.data();
    return { id: d.id, quizTitle: a.quizTitle || "Daily Quiz", score: Number(a.score || 0), totalQuestions: Number(a.totalQuestions || 0), points: Number(a.points || 0), completedAt: a.completedAt?.toDate?.()?.toISOString() || null };
  });
  const leaders = await db.collection("leaderboard").orderBy("totalPoints", "desc").limit(500).get();
  const rankIndex = leaders.docs.findIndex(d => d.id === uid);
  return {
    student: { fullName: student.fullName, registrationNumber: student.registrationNumber, email: student.email, status: student.status },
    stats: { totalPoints: Number(student.totalPoints || 0), quizzesCompleted: Number(student.quizzesCompleted || 0), averageScore: Number(student.averageScore || 0), leagueRank: rankIndex >= 0 ? rankIndex + 1 : null },
    recentAttempts: attempts.slice(0, 5), attempts
  };
});
