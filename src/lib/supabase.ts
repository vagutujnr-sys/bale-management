import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | undefined;

export function getSupabaseClient() {
  const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"];
  const supabaseApiKey =
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || import.meta.env["VITE_SUPABASE_ANON_KEY"];
  if (!supabaseUrl || !supabaseApiKey) return null;
  client ??= createClient(supabaseUrl, supabaseApiKey);
  return client;
}
