import { auth, db } from "../js/firebase.js";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const form = document.getElementById("adminLoginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const message = document.getElementById("adminAuthMessage");
function setMessage(text, error = true) { message.textContent = text; message.style.color = error ? "#a52222" : "#2f6f44"; }
async function verifyAdmin(user) { const snap = await getDoc(doc(db, "admin_users", user.uid)); if (!snap.exists()) throw Object.assign(new Error("not-admin"), { code: "admin/not-authorized" }); return snap.data(); }
async function continueIfAdmin(user) { if (!user) return false; try { await verifyAdmin(user); location.replace("dashboard.html"); return true; } catch { await signOut(auth).catch(() => {}); setMessage("This account is not an administrator."); return false; } }
onAuthStateChanged(auth, user => { if (user) continueIfAdmin(user); });
form.addEventListener("submit", async event => {
  event.preventDefault(); setMessage("");
  const email = emailInput.value.trim(), password = passwordInput.value, button = form.querySelector("button[type=submit]");
  if (!email || !password) { setMessage("Enter the administrator email and password."); return; }
  button.disabled = true; button.textContent = "Verifying…";
  try { const credential = await signInWithEmailAndPassword(auth, email, password); await verifyAdmin(credential.user); setMessage("Administrator verified. Opening dashboard…", false); location.replace("dashboard.html"); }
  catch (error) { await signOut(auth).catch(() => {}); const code = error?.code || ""; if (/invalid-credential|wrong-password|user-not-found/.test(code)) setMessage("Incorrect administrator email or password."); else if (code === "admin/not-authorized" || /permission-denied/.test(code)) setMessage("This account is not an administrator."); else setMessage(error?.message || "Administrator sign-in failed."); }
  finally { button.disabled = false; button.textContent = "Sign in to Admin"; }
});
