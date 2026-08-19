import { auth, db } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { collection, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const root = document.getElementById("leaderboard");

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.replace("../login.html");
    return;
  }

  try {
    const snap = await getDocs(query(
      collection(db, "leaderboard"),
      where("status", "==", "active"),
      limit(100)
    ));

    const rows = snap.docs
      .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => Number(b.leaguePoints ?? 0) - Number(a.leaguePoints ?? 0));

    if (!rows.length) {
      root.innerHTML = '<p class="muted">No rankings yet. Results will appear after the administrator rebuilds the statistics.</p>';
      return;
    }

    root.innerHTML = rows.map((row, index) => `
      <div class="result-item">
        <strong>#${index + 1} ${String(row.displayName || "Student")}</strong>
        <span>${Number(row.leaguePoints || 0).toLocaleString()} pts</span>
      </div>
    `).join("");
  } catch (error) {
    console.error("Leaderboard load failed", error);
    root.innerHTML = '<p class="muted">Leaderboard is not available yet.</p>';
  }
});
