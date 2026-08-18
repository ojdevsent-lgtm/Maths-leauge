import { auth, functions, httpsCallable } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const root = document.getElementById("leaderboard");

onAuthStateChanged(auth, async user => {
  if (!user) { location.replace("../login.html"); return; }
  try {
    const getLeaderboard = httpsCallable(functions, "getLeaderboard");
    const result = await getLeaderboard({});
    const rows = result.data || [];
    if (!rows.length) { root.innerHTML = '<p class="muted">No rankings yet.</p>'; return; }
    root.innerHTML = rows.map(s => `<div class="result-item"><strong>#${s.rank ?? "—"} ${s.fullName || "Student"}</strong><span>${Number(s.points || 0).toLocaleString()} pts</span></div>`).join("");
  } catch (error) {
    console.error("Leaderboard load failed", error);
    root.innerHTML = '<p class="muted">Leaderboard is not available yet.</p>';
  }
});
