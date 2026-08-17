import { auth } from "../firebase/config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const form = document.getElementById("loginForm");
const message = document.getElementById("authMessage");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.className = "form-message";
  message.textContent = "Signing you in…";
  try {
    await signInWithEmailAndPassword(auth, form.email.value.trim(), form.password.value);
    window.location.href = "student/dashboard.html";
  } catch (error) {
    message.textContent = error.code === "auth/invalid-credential" ? "Email or password is incorrect." : "We couldn't sign you in. Please try again.";
  }
});
