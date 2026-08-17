import { functions, httpsCallable } from "../firebase.js";

const TIMEOUT_MS = 12000;
function withTimeout(promise) { return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error("The leaderboard took too long to respond.")), TIMEOUT_MS))]); }

const getLeaderboardCallable = httpsCallable(functions, "getLeaderboard");

export async function getLeaderboard(mode = "overall") {
  const result = await withTimeout(getLeaderboardCallable({ mode }));
  return result?.data ?? [];
}
