import { auth, db } from "../firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const TIMEOUT_MS = 12000;

function withTimeout(promise, ms = TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("The quiz service timed out. Please try again.")), ms)
    )
  ]);
}

// Free/client-only scoring for the current 10-question Maths League quiz.
// This is intentionally kept out of the Firestore question documents so the
// existing question documents remain unchanged.
const CURRENT_ANSWER_KEY = [1, 1, 1, 0, 0, 0, 0, 2, 1, 3];

export async function getDailyQuiz() {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in before starting the quiz.");

  const quizSnap = await withTimeout(getDocs(query(
    collection(db, "quizzes"),
    where("status", "==", "live"),
    limit(1)
  )));

  if (quizSnap.empty) {
    return { completed: false, questions: [] };
  }

  const quizDoc = quizSnap.docs[0];
  const quiz = { id: quizDoc.id, ...quizDoc.data() };

  const attemptsSnap = await withTimeout(getDocs(query(
    collection(db, "attempts"),
    where("studentId", "==", user.uid),
    where("quizId", "==", quiz.id),
    limit(1)
  )));

  if (!attemptsSnap.empty) {
    return { completed: true, questions: [] };
  }

  const questionsSnap = await withTimeout(getDocs(
    collection(db, "quizzes", quiz.id, "questions")
  ));

  const questions = questionsSnap.docs
    .map(snapshot => ({ id: snapshot.id, ...snapshot.data() }))
    .filter(question => question.active !== false)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .map(question => ({
      id: question.id,
      question: question.text ?? question.question ?? "",
      answers: question.options ?? question.answers ?? [],
      points: Number(question.points ?? 1),
      order: Number(question.order ?? 0)
    }));

  return {
    completed: false,
    quizId: quiz.id,
    title: quiz.title ?? "Maths League Quiz",
    questions
  };
}

export async function submitDailyQuiz(answers) {
  const user = auth.currentUser;
  if (!user) throw new Error("Your session has expired. Please sign in again.");
  if (!Array.isArray(answers) || answers.length !== CURRENT_ANSWER_KEY.length) {
    throw new Error("Please answer all quiz questions before submitting.");
  }

  const quizSnap = await withTimeout(getDocs(query(
    collection(db, "quizzes"),
    where("status", "==", "live"),
    limit(1)
  )));

  if (quizSnap.empty) throw new Error("No live quiz is available.");

  const quizDoc = quizSnap.docs[0];
  const quizId = quizDoc.id;
  const quiz = quizDoc.data();

  const existing = await withTimeout(getDocs(query(
    collection(db, "attempts"),
    where("studentId", "==", user.uid),
    where("quizId", "==", quizId),
    limit(1)
  )));

  if (!existing.empty) throw new Error("You have already completed this quiz.");

  const correct = answers.reduce(
    (total, answer, index) => total + (Number(answer) === CURRENT_ANSWER_KEY[index] ? 1 : 0),
    0
  );
  const totalQuestions = CURRENT_ANSWER_KEY.length;
  const accuracy = Math.round((correct / totalQuestions) * 100);
  const pointsPerCorrect = Number(quiz.pointsPerCorrect ?? 1);
  const points = correct * pointsPerCorrect;

  const attemptRef = await withTimeout(addDoc(collection(db, "attempts"), {
    studentId: user.uid,
    quizId,
    answers: Object.fromEntries(answers.map((answer, index) => [String(index), Number(answer)])),
    score: correct,
    accuracy,
    leaguePointsAwarded: points,
    status: "submitted",
    submittedAt: serverTimestamp()
  }));

  const studentRef = doc(db, "students", user.uid);
  const studentSnap = await withTimeout(getDoc(studentRef));
  if (!studentSnap.exists()) throw new Error("Your student profile could not be found.");

  const student = studentSnap.data();
  const quizzesTaken = Number(student.quizzesTaken ?? 0) + 1;
  const leaguePoints = Number(student.leaguePoints ?? 0) + points;
  const previousAccuracy = Number(student.averageAccuracy ?? 0);
  const averageAccuracy = Math.round(
    ((previousAccuracy * (quizzesTaken - 1)) + accuracy) / quizzesTaken
  );

  await withTimeout(updateDoc(studentRef, {
    quizzesTaken,
    leaguePoints,
    averageAccuracy,
    updatedAt: serverTimestamp()
  }));

  const leaderboardRef = doc(db, "leaderboard", user.uid);
  const leaderboardStudent = student;
  await withTimeout(import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js").then(async ({ setDoc }) => {
    await setDoc(leaderboardRef, {
      studentId: user.uid,
      displayName: leaderboardStudent.fullName ?? "Student",
      school: leaderboardStudent.school ?? "",
      leaguePoints,
      quizzesTaken,
      averageAccuracy,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }));

  return {
    attemptId: attemptRef.id,
    score: correct,
    totalQuestions,
    points,
    accuracy
  };
}
