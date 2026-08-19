import { auth, db } from "../firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const TIMEOUT_MS = 12000;

function withTimeout(promise, ms = TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("The quiz service timed out. Please try again.")), ms))
  ]);
}

const CURRENT_ANSWER_KEY = [1, 1, 1, 0, 0, 0, 0, 2, 1, 3];

async function getLiveQuiz() {
  const snap = await withTimeout(getDocs(query(
    collection(db, "quizzes"),
    where("status", "==", "live"),
    limit(1)
  )));
  if (snap.empty) return null;
  const item = snap.docs[0];
  return { id: item.id, ...item.data() };
}

async function getQuizQuestions(quizId) {
  const snap = await withTimeout(getDocs(collection(db, "quizzes", quizId, "questions")));
  return snap.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(item => item.active !== false)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .map(item => ({
      id: item.id,
      question: item.text ?? item.question ?? "",
      answers: item.options ?? item.answers ?? [],
      points: Number(item.points ?? 1),
      correctIndex: Number.isInteger(Number(item.correctIndex)) ? Number(item.correctIndex) : null,
      order: Number(item.order ?? 0)
    }));
}

export async function getDailyQuiz() {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in before starting the quiz.");

  const quiz = await getLiveQuiz();
  if (!quiz) return { completed: false, questions: [] };

  const attemptId = `${user.uid}_${quiz.id}`;
  const attemptSnap = await withTimeout(getDoc(doc(db, "attempts", attemptId)));
  if (attemptSnap.exists()) return { completed: true, questions: [] };

  const questions = await getQuizQuestions(quiz.id);
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

  const quiz = await getLiveQuiz();
  if (!quiz) throw new Error("No live quiz is available.");

  const questions = await getQuizQuestions(quiz.id);
  if (!questions.length || !Array.isArray(answers) || answers.length !== questions.length) {
    throw new Error("Please answer all quiz questions before submitting.");
  }
  if (answers.some(answer => answer == null || Number.isNaN(Number(answer)))) {
    throw new Error("Please answer every question before submitting.");
  }

  const attemptId = `${user.uid}_${quiz.id}`;
  const attemptRef = doc(db, "attempts", attemptId);
  const existing = await withTimeout(getDoc(attemptRef));
  if (existing.exists()) throw new Error("You have already completed this quiz.");

  const answerKey = questions.map((question, index) => {
    if (question.correctIndex != null) return question.correctIndex;
    return CURRENT_ANSWER_KEY[index] ?? -1;
  });

  const correct = answers.reduce(
    (total, answer, index) => total + (Number(answer) === answerKey[index] ? 1 : 0),
    0
  );
  const totalQuestions = questions.length;
  const accuracy = Math.round((correct / totalQuestions) * 100);
  const points = answers.reduce((total, answer, index) => {
    return total + (Number(answer) === answerKey[index] ? Number(questions[index].points || 1) : 0);
  }, 0);

  await withTimeout(import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js").then(({ setDoc }) => setDoc(attemptRef, {
    studentId: user.uid,
    quizId: quiz.id,
    answers: Object.fromEntries(answers.map((answer, index) => [String(index), Number(answer)])),
    score: correct,
    totalQuestions,
    accuracy,
    leaguePointsAwarded: points,
    status: "submitted",
    submittedAt: serverTimestamp()
  })));

  return { attemptId, score: correct, totalQuestions, points, accuracy };
}
