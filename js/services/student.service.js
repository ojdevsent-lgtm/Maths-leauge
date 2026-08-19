import { db } from "../firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const DATA_TIMEOUT_MS = 12000;

function withTimeout(promise, ms = DATA_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("The server took too long to respond.")), ms))
  ]);
}

function normalizeStudent(row, fallbackUser) {
  return {
    id: row?.uid ?? fallbackUser?.uid ?? null,
    fullName: row?.fullName ?? "",
    registrationNumber: row?.registrationNumber ?? "",
    email: row?.email ?? fallbackUser?.email ?? "",
    phone: row?.phone ?? "",
    school: row?.school ?? "",
    state: row?.state ?? "",
    points: Number(row?.leaguePoints ?? 0),
    quizzesTaken: Number(row?.quizzesTaken ?? 0),
    averageAccuracy: Number(row?.averageAccuracy ?? 0),
    status: row?.status ?? "active"
  };
}

export async function getStudent(user) {
  const snap = await withTimeout(getDoc(doc(db, "students", user.uid)));
  if (!snap.exists()) throw new Error("Your student profile has not been created yet.");
  return normalizeStudent(snap.data(), user);
}

export async function getAttempts(user) {
  const snap = await withTimeout(getDocs(query(
    collection(db, "attempts"),
    where("studentId", "==", user.uid),
    limit(100)
  )));

  const attempts = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const at = a.submittedAt?.toMillis?.() ?? 0;
      const bt = b.submittedAt?.toMillis?.() ?? 0;
      return bt - at;
    });

  if (!attempts.length) return [];

  const quizIds = [...new Set(attempts.map(a => a.quizId).filter(Boolean))];
  const quizzes = await withTimeout(Promise.all(quizIds.map(id => getDoc(doc(db, "quizzes", id)))));
  const titles = new Map(quizzes.filter(s => s.exists()).map(s => [s.id, s.data().title]));

  return attempts.map(a => ({
    ...a,
    quizTitle: titles.get(a.quizId) || "Daily Quiz",
    totalQuestions: Number(a.totalQuestions ?? 10),
    points: Number(a.leaguePointsAwarded ?? 0)
  }));
}

function calculateStats(student, attempts) {
  const scored = attempts.filter(a => a.status === "submitted" && a.totalQuestions > 0);
  const totalPoints = scored.reduce((sum, a) => sum + Number(a.points || 0), 0);
  const quizzesCompleted = scored.length;
  const averageScore = quizzesCompleted
    ? Math.round(scored.reduce((sum, a) => sum + Number(a.accuracy ?? 0), 0) / quizzesCompleted)
    : 0;

  return { totalPoints, quizzesCompleted, averageScore };
}

export async function getRank(student) {
  try {
    const snap = await withTimeout(getDoc(doc(db, "leaderboard", student.id)));
    if (!snap.exists()) return null;
    const points = Number(snap.data().leaguePoints ?? 0);
    const all = await withTimeout(getDocs(collection(db, "leaderboard")));
    const rank = all.docs
      .map(d => Number(d.data().leaguePoints ?? 0))
      .filter(Number.isFinite)
      .filter(value => value > points).length + 1;
    return rank;
  } catch {
    return null;
  }
}

export async function getAnnouncements() {
  const snap = await withTimeout(getDocs(query(
    collection(db, "announcements"),
    where("active", "==", true),
    limit(10)
  )));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.publishedAt?.toMillis?.() ?? 0) - (a.publishedAt?.toMillis?.() ?? 0));
}

export async function getStudentProgress(user) {
  const [student, attempts] = await Promise.all([getStudent(user), getAttempts(user)]);
  const stats = calculateStats(student, attempts);
  const effectiveStudent = { ...student, points: stats.totalPoints, quizzesTaken: stats.quizzesCompleted, averageAccuracy: stats.averageScore };
  return { student: effectiveStudent, attempts, stats };
}

export async function getStudentOverview(user) {
  const [progress, announcements] = await Promise.all([getStudentProgress(user), getAnnouncements()]);
  return { ...progress, announcements };
}
