import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut as firebaseSignOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBdYsOfSibP0OF_r2zYuHnJokwijfjnivU",
  authDomain: "maths-league.firebaseapp.com",
  projectId: "maths-league",
  storageBucket: "maths-league.firebasestorage.app",
  messagingSenderId: "847559537753",
  appId: "1:847559537753:web:6dc7dfdead207428deed48",
  measurementId: "G-2Z467KX0SQ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, firebaseSignOut };

export function currentUser() { return auth.currentUser; }

export function watchAuth(callback) {
  let lastUserId;
  let timer;
  const unsubscribe = onAuthStateChanged(auth, user => {
    const id = user?.uid ?? null;
    if (id === lastUserId) return;
    lastUserId = id;
    clearTimeout(timer);
    timer = setTimeout(() => callback(user), 0);
  });
  return { unsubscribe() { clearTimeout(timer); unsubscribe(); } };
}

export function friendlyError(error) {
  const code = error?.code || "";
  const message = error?.message || "Something went wrong. Please try again.";
  if (/email-already-in-use|already exists/i.test(code + message)) return "An account with this email already exists. Try logging in instead.";
  if (/invalid-email/i.test(code)) return "Enter a valid email address.";
  if (/weak-password/i.test(code)) return "Use a stronger password.";
  if (/invalid-credential|wrong-password|user-not-found/i.test(code)) return "Invalid email or password.";
  if (/network-request-failed|network|fetch/i.test(code + message)) return "Network error. Check your internet connection and try again.";
  if (/permission-denied|unauthenticated/i.test(code + message)) return "You do not have permission to perform that action.";
  return message;
}
