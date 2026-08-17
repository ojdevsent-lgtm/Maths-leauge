import { functions, httpsCallable } from "../firebase.js";

const TIMEOUT_MS = 12000;
function withTimeout(promise, ms = TIMEOUT_MS) { return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("The quiz service timed out. Please try again.")), ms))]); }

const getDailyQuizCallable = httpsCallable(functions, "getDailyQuiz");
const submitDailyQuizCallable = httpsCallable(functions, "submitDailyQuiz");

export async function getDailyQuiz() {
  const result = await withTimeout(getDailyQuizCallable());
  return result?.data ?? { completed: false, questions: [] };
}

export async function submitDailyQuiz(answers) {
  const result = await withTimeout(submitDailyQuizCallable({ answers }));
  return result?.data;
}
