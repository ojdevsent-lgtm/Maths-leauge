import { supabase, friendlyError } from "../supabase.js";

const AUTH_TIMEOUT_MS = 10000;

function withTimeout(promise, ms = AUTH_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out. Please check your connection and try again.")), ms))
  ]);
}

export async function requireUser({ redirect = "auth.html" } = {}) {
  const { data, error } = await withTimeout(supabase.auth.getSession());
  if (error) throw error;
  const user = data?.session?.user ?? null;
  if (!user) {
    location.replace(redirect);
    return null;
  }
  return user;
}

export function onSignedOut() {
  return supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") location.replace("auth.html");
  });
}

export async function signOut() {
  const { error } = await withTimeout(supabase.auth.signOut());
  if (error) throw error;
}

export function displayError(error, fallback) {
  console.error(error);
  return friendlyError(error) || fallback;
}
