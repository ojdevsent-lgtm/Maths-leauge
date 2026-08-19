import { db } from "../firebase.js";
import {
  collection,
  getDocs,
  limit,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const TIMEOUT_MS = 12000;
function withTimeout(promise) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("The leaderboard took too long to respond.")), TIMEOUT_MS))
  ]);
}

export async function getLeaderboard() {
  const snap = await withTimeout(getDocs(query(
    collection(db, "leaderboard"),
    where("status", "==", "active"),
    limit(100)
  ))).catch(async () => withTimeout(getDocs(query(collection(db, "leaderboard"), limit(100)))));

  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => Number(b.leaguePoints ?? 0) - Number(a.leaguePoints ?? 0))
    .map((row, index) => ({ ...row, rank: index + 1, points: Number(row.leaguePoints ?? 0) }));
}
