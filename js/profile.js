import { requireUser, onSignedOut, signOut, displayError } from "./core/session.js";
import { getStudent } from "./services/student.service.js";

const $ = id => document.getElementById(id);

function set(id, value) {
  const element = $(id);
  if (element) element.textContent = value ?? "—";
}

function finishLoading() {
  $("profileLoading")?.classList.add("hidden");
}

function showError(error) {
  finishLoading();
  const errorEl = $("profileError");
  if (!errorEl) return;
  errorEl.textContent = displayError(error, "We couldn't load your profile. Please try again.");
  errorEl.classList.add("show");
}

async function loadProfile() {
  try {
    const user = await requireUser();
    if (!user) return;
    const student = await getStudent(user);

    set("fullName", student.fullName || "—");
    set("registrationNumber", student.registrationNumber || "—");
    set("memberStatus", student.status === "active" ? "Active" : student.status || "Active");
    set("email", student.email || user.email || "—");
    set("phone", student.phone || "—");
    set("school", student.school || "—");
    set("state", student.state || "—");
    finishLoading();
    $("profileError")?.classList.remove("show");
  } catch (error) {
    showError(error);
  }
}

loadProfile();
onSignedOut();

$("logoutButton")?.addEventListener("click", async () => {
  try {
    await signOut();
  } catch (error) {
    showError(error);
  }
});
$("backButton")?.addEventListener("click", () => history.back());

document.querySelectorAll(".nav-item[data-page]").forEach(item => item.addEventListener("click", () => {
  const routes = { home: "dashboard.html", rank: "leaderboard.html", progress: "progress.html", profile: "profile.html" };
  if (routes[item.dataset.page]) location.href = routes[item.dataset.page];
}));
