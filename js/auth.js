import { auth, functions, friendlyError, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, httpsCallable } from "./firebase.js";

const $ = id => document.getElementById(id);
const registerStudent = httpsCallable(functions, "registerStudent");

function message(id, text, type = "error") { const el = $(id); if (!el) return; el.textContent = text; el.className = `auth-message show ${type}`; }
function setSubmitting(form, disabled) { const button = form?.querySelector("button[type=submit]"); if (button) { button.disabled = disabled; button.setAttribute("aria-busy", String(disabled)); } }

document.addEventListener("DOMContentLoaded", () => {
  const signupPanel = $("signupPanel");
  const loginPanel = $("loginPanel");
  $("showLogin")?.addEventListener("click", () => { signupPanel?.classList.remove("active"); loginPanel?.classList.add("active"); });
  $("showSignup")?.addEventListener("click", () => { loginPanel?.classList.remove("active"); signupPanel?.classList.add("active"); });

  document.querySelectorAll(".password-toggle").forEach(button => button.addEventListener("click", () => { const input = $(button.dataset.target); if (input) input.type = input.type === "password" ? "text" : "password"; }));

  $("signupForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const fullName = $("fullName")?.value.trim();
    const email = $("signupEmail")?.value.trim().toLowerCase();
    const phone = $("phone")?.value.trim();
    const school = $("school")?.value.trim();
    const state = $("state")?.value.trim();
    const password = $("signupPassword")?.value || "";
    const confirmPassword = $("confirmPassword")?.value || "";
    if (!fullName || !email || !phone || !school || !state) return message("signupMessage", "Complete all required fields.");
    if (password.length < 8) return message("signupMessage", "Password must be at least 8 characters.");
    if (password !== confirmPassword) return message("signupMessage", "Passwords do not match.");
    if (!$("terms")?.checked) return message("signupMessage", "Accept the terms to continue.");

    setSubmitting(form, true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      await registerStudent({ fullName, phone, school, state });
      message("signupMessage", "Account created. Redirecting…", "success");
      window.location.replace("dashboard.html");
    } catch (error) {
      console.error("Signup failed", error);
      message("signupMessage", friendlyError(error));
    } finally { setSubmitting(form, false); }
  });

  $("loginForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = $("loginEmail")?.value.trim().toLowerCase();
    const password = $("loginPassword")?.value || "";
    if (!email || !password) return message("loginMessage", "Enter your email and password.");
    setSubmitting(form, true);
    try { await signInWithEmailAndPassword(auth, email, password); window.location.replace("dashboard.html"); }
    catch (error) { console.error("Login failed", error); message("loginMessage", friendlyError(error)); }
    finally { setSubmitting(form, false); }
  });

  $("forgotPassword")?.addEventListener("click", async event => {
    event.preventDefault();
    const email = $("loginEmail")?.value.trim().toLowerCase();
    if (!email) return message("loginMessage", "Enter your email first, then choose Forgot password.");
    try { await sendPasswordResetEmail(auth, email, { url: `${location.origin}/auth.html` }); message("loginMessage", "Password reset instructions have been sent if the account exists.", "success"); }
    catch (error) { message("loginMessage", friendlyError(error)); }
  });
});
