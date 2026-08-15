import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  onAuthStateChanged,
  deleteUser
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

const functions = getFunctions(auth.app, "europe-west1");
const createStudentProfile = httpsCallable(functions, "createStudentProfile");

const $ = id => document.getElementById(id);

function message(id, text, type = "error") {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.className = `auth-message show ${type}`;
}

function friendlyError(error) {
  const code = error?.code || "";
  const map = {
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/weak-password": "Use a stronger password.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/too-many-requests": "Too many attempts. Please wait and try again.",
    "functions/already-exists": "A student profile already exists for this account."
  };
  return map[code] || error?.message || "Something went wrong. Please try again.";
}

document.addEventListener("DOMContentLoaded", () => {
  const signupPanel = $("signupPanel");
  const loginPanel = $("loginPanel");

  $("showLogin")?.addEventListener("click", () => {
    signupPanel?.classList.remove("active");
    loginPanel?.classList.add("active");
  });

  $("showSignup")?.addEventListener("click", () => {
    loginPanel?.classList.remove("active");
    signupPanel?.classList.add("active");
  });

  document.querySelectorAll(".password-toggle").forEach(button => {
    button.addEventListener("click", () => {
      const input = $(button.dataset.target);
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      const icon = button.querySelector("i");
      icon?.classList.toggle("ri-eye-line");
      icon?.classList.toggle("ri-eye-off-line");
    });
  });

  $("signupForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const fullName = $("fullName")?.value.trim();
    const email = $("signupEmail")?.value.trim();
    const phone = $("phone")?.value.trim();
    const school = $("school")?.value.trim();
    const state = $("state")?.value.trim();
    const password = $("signupPassword")?.value || "";
    const confirmPassword = $("confirmPassword")?.value || "";

    if (!fullName || !email || !school || !state) return message("signupMessage", "Complete all required fields.");
    if (password.length < 6) return message("signupMessage", "Password must be at least 6 characters.");
    if (password !== confirmPassword) return message("signupMessage", "Passwords do not match.");
    if (!( $("terms")?.checked )) return message("signupMessage", "Accept the terms to continue.");

    const submit = $("signupForm")?.querySelector("button[type=submit]");
    if (submit) submit.disabled = true;

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await createStudentProfile({ fullName, phone, school, state });
      message("signupMessage", "Account created. Redirecting…", "success");
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error(error);
      if (error?.code?.startsWith("functions/") && auth.currentUser?.uid) {
        try { await deleteUser(auth.currentUser); } catch (cleanupError) { console.error("Signup cleanup failed:", cleanupError); }
      }
      message("signupMessage", friendlyError(error));
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  $("loginForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const email = $("loginEmail")?.value.trim();
    const password = $("loginPassword")?.value || "";
    if (!email || !password) return message("loginMessage", "Enter your email and password.");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error(error);
      message("loginMessage", friendlyError(error));
    }
  });

  $("forgotPassword")?.addEventListener("click", async event => {
    event.preventDefault();
    const email = $("loginEmail")?.value.trim();
    if (!email) return message("loginMessage", "Enter your email first, then choose Forgot password.");
    try {
      await sendPasswordResetEmail(auth, email);
      message("loginMessage", "Password reset instructions have been sent if the account exists.", "success");
    } catch (error) {
      console.error(error);
      message("loginMessage", friendlyError(error));
    }
  });

  onAuthStateChanged(auth, user => {
    if (user && location.pathname.endsWith("auth.html")) {
      // Keep the auth page usable for users who intentionally want to switch accounts.
    }
  });
});
