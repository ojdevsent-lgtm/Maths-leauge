import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://hlalbqfrufznzhrkjwdk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4u1A1n7s_xaKCOryJL5WOg_gY9lcSRI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

export async function currentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

// Never run database requests directly inside onAuthStateChange. Supabase's
// auth lock can remain held while the callback is executing, which can cause
// an RPC awaited from the callback to hang indefinitely.
export function watchAuth(callback) {
  let lastUserId = undefined;
  let timer = null;
  const notify = user => {
    const id = user?.id ?? null;
    if (id === lastUserId) return;
    lastUserId = id;
    clearTimeout(timer);
    timer = setTimeout(() => callback(user), 0);
  };

  supabase.auth.getSession().then(({ data }) => notify(data.session?.user ?? null));
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    notify(session?.user ?? null);
  });

  return {
    data: { subscription: data.subscription },
    unsubscribe() {
      clearTimeout(timer);
      data.subscription.unsubscribe();
    }
  };
}

export function friendlyError(error) {
  const message = error?.message || "Something went wrong. Please try again.";
  if (/already registered|already exists/i.test(message)) return "An account with this email already exists. Try logging in instead.";
  if (/invalid.*email/i.test(message)) return "Enter a valid email address.";
  if (/password.*6|password.*weak/i.test(message)) return "Use a stronger password.";
  if (/network|fetch/i.test(message)) return "Network error. Check your internet connection and try again.";
  return message;
}
