import { auth, functions } from "../js/firebase.js";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

const form = document.getElementById("adminLoginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const message = document.getElementById("adminAuthMessage");

function setMessage(text, error = true) {
  message.textContent = text;
  message.style.color = error ? "#a52222" : "#2f6f44";
}

async function verifyAdmin() {
  return (await httpsCallable(functions, "getAdminDashboard")()).data;
}

async function continueIfAdmin(user) {
  if (!user) return false;
  try {
    await verifyAdmin();
    location.replace("dashboard.html");
    return true;
  } catch (error) {
    await signOut(auth).catch(() => {});
    if (error?.code === "functions/permission-denied") {
      setMessage("This account is not an administrator.");
    } else {
      setMessage("We could not verify administrator access. Please try again.");
    }
    return false;
  }
}

onAuthStateChanged(auth, user => {
  if (user) continueIfAdmin(user);
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  setMessage("");
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) {
    setMessage("Enter the administrator email and password.");
    return;
  }

  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "Verifying…";

  try {
    await signInWithEmailAndPassword(auth, email, password);
    await verifyAdmin();
    setMessage("Administrator verified. Opening dashboard…", false);
    location.replace("dashboard.html");
  } catch (error) {
    await signOut(auth).catch(() => {});
    const code = error?.code || "";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
      setMessage("Incorrect administrator email or password.");
    } else if (code === "functions/permission-denied") {
      setMessage("This account is not an administrator.");
    } else {
      setMessage(error?.message || "Administrator sign-in failed.");
    }
  } finally {
    button.disabled = false;
    button.textContent = "Sign in to Admin";
  }
});
