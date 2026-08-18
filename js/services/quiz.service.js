import { auth, db } from "../firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const TIMEOUT_MS = 12000;

function withTimeout(promise, ms = TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("The quiz service timed out. Please try again.")), ms
    )
  ]);
}

// Free/client-only scoring for the current 10-question Maths League quiz.
// This is intentionally kept out of the Firestore question documents so the
// existing question documents remain unchanged.
const CURRENT_ANSWER_KEY = [1, 1, 1, 0, 0, 0, 0, 2, 1, 3];

async function getLiveQuiz() {
  const quizSnap = await withTimeout(getDocs(query(
    collection(db, "quizzes"),
    where("status", "==", "live"),
    limit(1)
  )));

  if (quizSnap.empty) return null;

  const quizDoc = quizSnap.docs[0];
  return { id: quizDoc.id, ...quizDoc.data() };
}

export async function getDailyQuiz() {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in before starting the quiz.");

  const quiz = await getLiveQuiz();
  if (!quiz) return { completed: false, questions: [] };

  // One attempt is permanently associated with this exact student + quiz.
  const attemptId = `${user.uid}_${quiz.id}`;
  const attemptSnap = await withTimeout(getDoc(doc(db, "attempts", attemptId)));

  if (attemptSnap.exists()) {
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

  const quiz = await getLiveQuiz();
  if (!quiz) throw new Error("No live quiz is available.");

  // Deterministic attempt ID makes one submission slot per student per quiz.
  // Firestore rules also reject any second client-created attempt at this ID.
  const attemptId = `${user.uid}_${quiz.id}`;
  const attemptRef = doc(db, "attempts", attemptId);
  const existing = await withTimeout(getDoc(attemptRef));

  if (existing.exists()) {
    throw new Error("You have already completed this quiz.");
  }

  const correct = answers.reduce(
    (total, answer, index) => total + (Number(answer) === CURRENT_ANSWER_KEY[index] ? 1 : 0),
    0
  );
  const totalQuestions = CURRENT_ANSWER_KEY.length;
  const accuracy = Math.round((correct / totalQuestions) * 100);
  const pointsPerCorrect = Number(quiz.pointsPerCorrect ?? 1);
  const points = correct * pointsPerCorrect;

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

  const leaderboardRef = doc(db, "leaderboard", user.uid);
  const batch = writeBatch(db);

  batch.set(attemptRef, {
    studentId: user.uid,
    quizId: quiz.id,
    answers: Object.fromEntries(answers.map((answer, index) => [String(index), Number(answer)])),
    score: correct,
    accuracy,
    leaguePointsAwarded: points,
    status: "submitted",
    submittedAt: serverTimestamp()
  });

  batch.update(studentRef, {
    quizzesTaken,
    leaguePoints,
    averageAccuracy,
    updatedAt: serverTimestamp()
  });

  batch.set(leaderboardRef, {
    studentId: user.uid,
    displayName: student.fullName ?? "Student",
    school: student.school ?? "",
    leaguePoints,
    quizzesTaken,
    averageAccuracy,
    updatedAt: serverTimestamp()
  }, { merge: true });

  await withTimeout(batch.commit());

  return {
    attemptId,
    score: correct,
    totalQuestions,
    points,
    accuracy
  };
}
