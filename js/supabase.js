import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://hlalbqfrufznzhrkjwdk.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_4u1A1n7s_xaKCOryJL5WOg_gY9lcSRI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
