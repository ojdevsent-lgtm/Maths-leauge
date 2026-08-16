import { supabase } from "../supabase.js";

const TIMEOUT_MS = 12000;

function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("The leaderboard took too long to respond.")), TIMEOUT_MS))
  ]);
}

export async function getLeaderboard(mode = "overall") {
  const { data, error } = await withTimeout(supabase.rpc("get_leaderboard", { p_mode: mode }));
  if (error) throw error;
  return data ?? [];
}
