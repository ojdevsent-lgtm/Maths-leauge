import { auth, friendlyError, onAuthStateChanged, firebaseSignOut } from "../firebase.js";

const AUTH_TIMEOUT_MS = 10000;

function withTimeout(promise, ms = AUTH_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out. Please check your connection and try again.")), ms))
  ]);
}

export async function requireUser({ redirect = "auth.html" } = {}) {
  const user = auth.currentUser;
  if (user) return user;

  return withTimeout(new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(auth, nextUser => {
      unsubscribe();
      if (!nextUser) {
        location.replace(redirect);
        resolve(null);
        return;
      }
      resolve(nextUser);
    });
  }));
}

export function onSignedOut() {
  return onAuthStateChanged(auth, user => {
    if (!user) location.replace("auth.html");
  });
}

export async function signOut() {
  await withTimeout(firebaseSignOut(auth));
}

export function displayError(error, fallback) {
  console.error(error);
  return friendlyError(error) || fallback;
}
