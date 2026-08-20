import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    "Supabase env vars missing — set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example). Data won't persist until these are set."
  );
}

export const supabase = createClient(url || "", anonKey || "");
