import { auth, db } from "../firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const form = document.getElementById("registerForm");
const message = document.getElementById("authMessage");
const submitButton = form?.querySelector("button[type='submit']");

function friendlyError(error) {
  const text = `${error?.code || ""} ${error?.message || ""}`;
  if (/email-already-in-use/i.test(text)) return "An account with this email already exists. Try signing in instead.";
  if (/invalid-email/i.test(text)) return "Please enter a valid email address.";
  if (/weak-password/i.test(text)) return "Your password is too weak. Use at least 6 characters.";
  if (/permission-denied/i.test(text)) return "Firebase blocked the student profile. Check the Firestore rules.";
  if (/network-request-failed|network|fetch/i.test(text)) return "Firebase could not be reached. Check your internet connection and try again.";
  return `Registration failed (${error?.code || "unknown error"}). Please try again.`;
}

form?.addEventListener("submit", async event => {
  event.preventDefault();
  message.className = "form-message";
  message.textContent = "Creating your account…";
  if (submitButton) submitButton.disabled = true;
  try {
    const credential = await createUserWithEmailAndPassword(auth, form.email.value.trim(), form.password.value);
    const uid = credential.user.uid;
    const student = { uid, fullName: form.fullName.value.trim(), email: credential.user.email || form.email.value.trim(), phone: "", school: form.school.value.trim(), state: form.state.value.trim(), leaguePoints: 0, quizzesTaken: 0, averageAccuracy: 0, status: "active", createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await setDoc(doc(db, "users", uid), { uid, email: student.email, role: "student", createdAt: serverTimestamp() }, { merge: true });
    await setDoc(doc(db, "students", uid), student);
    message.className = "form-message success";
    message.textContent = "Account created. Opening your dashboard…";
    window.location.replace("../student/dashboard.html");
  } catch (error) {
    console.error("Maths League registration failed", error);
    message.className = "form-message error";
    message.textContent = friendlyError(error);
    if (submitButton) submitButton.disabled = false;
  }
});
