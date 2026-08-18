import { auth, functions } from "../js/firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

const $ = id => document.getElementById(id);
let state = { students: [], recentAttempts: [], announcements: [], stats: {} };
const showError = message => { $("error").textContent = message; $("error").hidden = false; };
const esc = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const date = value => { if (!value) return "—"; const d = value.seconds ? new Date(value.seconds * 1000) : new Date(value); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString(); };

async function load() {
  $("error").hidden = true;
  try {
    const call = httpsCallable(functions, "getAdminDashboard");
    const result = await call({});
    state = result.data;
    render();
  } catch (e) {
    console.error(e);
    showError(e?.message || "Unable to load the admin dashboard.");
  }
}

function render() {
  const s = state.stats || {};
  $("stats").innerHTML = [
    ["Students", s.students || 0], ["Quizzes completed", s.quizzesTaken || 0], ["Points awarded", s.pointsAwarded || 0], ["Active announcements", s.activeAnnouncements || 0]
  ].map(([label,value]) => `<div class="stat"><small>${label}</small><strong>${esc(value)}</strong></div>`).join("");

  $("attempts").innerHTML = state.recentAttempts?.length ? `<table class="table"><thead><tr><th>Student</th><th>Score</th><th>Accuracy</th><th>Status</th></tr></thead><tbody>${state.recentAttempts.map(a => `<tr><td>${esc(a.studentName)}</td><td>${esc(a.score ?? 0)}</td><td>${esc(a.accuracy ?? 0)}%</td><td>${esc(a.status || "—")}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">No attempts yet.</p>`;
  renderStudents();
  renderAnnouncements();
}

function renderStudents() {
  const q = $("studentSearch").value.trim().toLowerCase();
  const students = (state.students || []).filter(s => !q || `${s.fullName} ${s.email} ${s.school}`.toLowerCase().includes(q));
  $("students").innerHTML = students.length ? `<table class="table"><thead><tr><th>Name</th><th>School</th><th>Points</th><th>Status</th></tr></thead><tbody>${students.map(s => `<tr><td>${esc(s.fullName)}</td><td>${esc(s.school)}</td><td>${esc(s.leaguePoints ?? 0)}</td><td>${esc(s.status || "—")}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">No students found.</p>`;
}

function renderAnnouncements() {
  $("announcements").innerHTML = state.announcements?.length ? state.announcements.map(a => `<div class="card"><strong>${esc(a.title)}</strong><p>${esc(a.body)}</p><small class="muted">${a.active ? "Active" : "Inactive"} · ${date(a.publishedAt)}</small></div>`).join("") : `<p class="muted">No announcements yet.</p>`;
}

$("studentSearch").addEventListener("input", renderStudents);
$("refresh").addEventListener("click", load);
$("logout").addEventListener("click", () => signOut(auth));
$("announcementForm").addEventListener("submit", async e => {
  e.preventDefault();
  showError("Announcement creation is intentionally disabled until its trusted admin write endpoint is deployed.");
});

onAuthStateChanged(auth, async user => {
  if (!user) { location.replace("../index.html"); return; }
  await load();
});
