import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as firebaseSignOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-functions.js";

// Firebase web configuration is intentionally public. It identifies the app;
// authorization is enforced by Firebase Auth, Firestore Rules, and Functions.
// Replace these placeholders with the configuration from the Firebase console.
const firebaseConfig = {
  apiKey: "REPLACE_WITH_FIREBASE_API_KEY",
  authDomain: "REPLACE_WITH_FIREBASE_PROJECT.firebaseapp.com",
  projectId: "REPLACE_WITH_FIREBASE_PROJECT_ID",
  storageBucket: "REPLACE_WITH_FIREBASE_PROJECT.firebasestorage.app",
  messagingSenderId: "REPLACE_WITH_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_FIREBASE_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");

export { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, firebaseSignOut, httpsCallable };

export function currentUser() {
  return auth.currentUser;
}

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

  return {
    unsubscribe() {
      clearTimeout(timer);
      unsubscribe();
    }
  };
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
