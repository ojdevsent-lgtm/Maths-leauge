import { supabase } from "../supabase.js";

const TIMEOUT_MS = 12000;

function withTimeout(promise, ms = TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("The quiz service timed out. Please try again.")), ms))
  ]);
}

export async function getDailyQuiz() {
  const { data, error } = await withTimeout(supabase.rpc("get_daily_quiz"));
  if (error) throw error;
  return data ?? { completed: false, questions: [] };
}

export async function submitDailyQuiz(answers) {
  const { data, error } = await withTimeout(supabase.rpc("submit_daily_quiz", { p_answers: answers }));
  if (error) throw error;
  return data;
}
