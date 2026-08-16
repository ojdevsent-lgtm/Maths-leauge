import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://hlalbqfrufznzhrkjwdk.supabase.co";
const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__;

if (!SUPABASE_ANON_KEY) {
  console.warn("Supabase anon key is not configured. Set window.__SUPABASE_ANON_KEY__ before loading this module.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || "");
