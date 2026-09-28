"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The publishable key is meant to ship in client code: the database only
// exposes the game's RPC functions, which check each player's secret.
// Both can be overridden per deployment through environment variables.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wcdoavbmexzgjhmmrsvj.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_4b4VyMLTkya-ym4rUy-LWQ_aX3udzhP";

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
