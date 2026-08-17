import { db, functions, httpsCallable } from "../firebase.js";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const DATA_TIMEOUT_MS = 12000;
function withTimeout(promise, ms = DATA_TIMEOUT_MS) { return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("The server took too long to respond.")), ms))]); }

function normalizeStudent(row, fallbackUser) {
  return {
    id: row?.id ?? fallbackUser?.uid ?? null,
    fullName: row?.full_name ?? "",
    registrationNumber: row?.registration_number ?? "",
    email: row?.email ?? fallbackUser?.email ?? "",
    phone: row?.phone ?? "",
    school: row?.school ?? "",
    state: row?.state ?? "",
    points: Number(row?.points ?? 0),
    quizzesTaken: Number(row?.quizzes_taken ?? 0),
    status: row?.status ?? "active"
  };
}

export async function getStudent(user) {
  const snap = await withTimeout(getDoc(doc(db, "students", user.uid)));
  if (!snap.exists()) throw new Error("Your student profile has not been created yet.");
  return normalizeStudent({ ...snap.data(), id: snap.id }, user);
}

export async function getAttempts(user) {
  const snap = await withTimeout(getDocs(query(
    collection(db, "quiz_attempts"),
    where("student_id", "==", user.uid),
    orderBy("completed_at", "desc"),
    limit(50)
  )));
  const attempts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (!attempts.length) return [];

  const quizIds = [...new Set(attempts.map(a => a.quiz_id).filter(Boolean))];
  const quizzes = await withTimeout(Promise.all(quizIds.map(id => getDoc(doc(db, "quiz_configs", id)))));
  const titles = new Map(quizzes.filter(s => s.exists()).map(s => [s.id, s.data().title]));

  return attempts.map(a => ({
    ...a,
    quizTitle: titles.get(a.quiz_id) || "Daily Quiz",
    totalQuestions: Number(a.total_questions ?? 0),
    points: Number(a.score ?? 0)
  }));
}

export async function getRank(student) {
  try {
    const getStudentRank = httpsCallable(functions, "getStudentRank");
    const result = await withTimeout(getStudentRank());
    const value = result?.data;
    return Number.isFinite(Number(value)) ? Number(value) : null;
  } catch { return null; }
}

export async function getAnnouncements() {
  const snap = await withTimeout(getDocs(query(
    collection(db, "announcements"),
    where("active", "==", true),
    orderBy("created_at", "desc"),
    limit(10)
  )));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function calculateStats(student, attempts) {
  const scored = attempts.filter(a => a.totalQuestions > 0);
  const averageScore = scored.length ? Math.round(scored.reduce((sum, a) => sum + (a.score / a.totalQuestions) * 100, 0) / scored.length) : 0;
  return { totalPoints: student.points, quizzesCompleted: student.quizzesTaken || attempts.length, averageScore };
}

export async function getStudentProgress(user) {
  const [student, attempts] = await Promise.all([getStudent(user), getAttempts(user)]);
  return { student, attempts, stats: calculateStats(student, attempts) };
}

export async function getStudentOverview(user) {
  const [progress, announcements] = await Promise.all([getStudentProgress(user), getAnnouncements()]);
  return { ...progress, announcements };
}
