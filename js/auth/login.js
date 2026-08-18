import { auth } from "../firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

const form = document.getElementById("loginForm");
const message = document.getElementById("authMessage");
const button = form?.querySelector("button[type='submit']");

form?.addEventListener("submit", async event => {
  event.preventDefault();
  message.className = "form-message";
  message.textContent = "Signing you in…";
  if (button) button.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, form.email.value.trim(), form.password.value);
    window.location.replace("student/dashboard.html");
  } catch (error) {
    console.error("Maths League login failed", { code: error?.code, message: error?.message });
    message.className = "form-message error";
    message.textContent = error?.code === "auth/invalid-credential" ? "Email or password is incorrect." : "We couldn't sign you in. Please try again.";
    if (button) button.disabled = false;
  }
});
