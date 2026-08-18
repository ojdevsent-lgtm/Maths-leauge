import { auth, functions } from "../firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

const form = document.getElementById("registerForm");
const message = document.getElementById("authMessage");
const submitButton = form?.querySelector("button[type='submit']");

function friendlyError(error) {
  const code = error?.code || "";
  const text = `${code} ${error?.message || ""}`;
  if (/email-already-in-use/i.test(text)) return "An account with this email already exists. Try signing in instead.";
  if (/invalid-email/i.test(text)) return "Please enter a valid email address.";
  if (/weak-password/i.test(text)) return "Your password is too weak. Use at least 6 characters.";
  if (/operation-not-allowed/i.test(text)) return "Email/password sign-in is not enabled in Firebase Authentication.";
  if (/permission-denied|unauthenticated/i.test(text)) return "Firebase blocked the student profile. Check the deployed Cloud Function and Firestore rules.";
  if (/functions/not-found|not-found.*function|function.*not-found/i.test(text)) return "The student registration service is not deployed yet. Deploy the Firebase Cloud Functions, then try again.";
  if (/network-request-failed|network|fetch/i.test(text)) return "Firebase could not be reached. Check your internet connection and try again.";
  return `Registration failed (${code || "unknown error"}). Please try again.`;
}

form?.addEventListener("submit", async event => {
  event.preventDefault();
  message.className = "form-message";
  message.textContent = "Creating your account…";
  if (submitButton) submitButton.disabled = true;

  try {
    const credential = await createUserWithEmailAndPassword(auth, form.email.value.trim(), form.password.value);
    const registerStudent = httpsCallable(functions, "registerStudent");
    await registerStudent({
      fullName: form.fullName.value.trim(),
      school: form.school.value.trim(),
      state: form.state.value.trim()
    });

    message.className = "form-message success";
    message.textContent = "Account created. Opening your dashboard…";
    window.location.replace("student/dashboard.html");
  } catch (error) {
    console.error("Maths League registration failed", { code: error?.code, message: error?.message });
    message.className = "form-message error";
    message.textContent = friendlyError(error);
    if (submitButton) submitButton.disabled = false;
  }
});
