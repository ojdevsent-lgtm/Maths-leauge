import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

const functions = getFunctions(auth.app, "europe-west1");
const getLeaderboard = httpsCallable(functions, "getLeaderboard");
const rankingList = document.getElementById("rankingList");
const topThree = document.getElementById("topThree");
const message = document.getElementById("leaderboardMessage");
const status = document.getElementById("rankingStatus");

function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c])); }

async function load(mode = "overall") {
  if (status) status.textContent = mode[0].toUpperCase() + mode.slice(1);
  if (rankingList) rankingList.innerHTML = '<div class="leaderboard-loading">Loading rankings...</div>';
  try {
    const { data } = await getLeaderboard({ mode });
    const rows = data || [];
    if (!rows.length) {
      topThree.innerHTML = "";
      rankingList.innerHTML = '<div class="leaderboard-empty">No rankings yet.</div>';
      return;
    }
    topThree.innerHTML = rows.slice(0, 3).map(r => `<div class="top-player"><span class="ranking-number">#${r.rank}</span><span class="ranking-name">${escapeHtml(r.fullName)}</span><span class="ranking-points"><strong>${r.points}</strong><span>pts</span></span></div>`).join("");
    rankingList.innerHTML = rows.map(r => `<div class="ranking-row"><span class="ranking-number">#${r.rank}</span><div><span class="ranking-name">${escapeHtml(r.fullName)}</span><span class="ranking-id">${escapeHtml(r.registrationNumber)}</span></div><div class="ranking-points"><strong>${r.points}</strong><span>points</span></div></div>`).join("");
  } catch (error) {
    console.error(error);
    if (message) { message.textContent = "Unable to load the leaderboard."; message.classList.add("show"); }
  }
}

document.querySelectorAll(".leaderboard-tab").forEach(tab => tab.addEventListener("click", () => {
  document.querySelectorAll(".leaderboard-tab").forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  load(tab.dataset.ranking || "overall");
}));

onAuthStateChanged(auth, user => { if (!user) location.href = "auth.html"; else load("overall"); });
