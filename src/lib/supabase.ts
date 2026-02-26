import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Cliente Supabase. `null` si VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
 * no están configuradas — la app funciona en modo local sin ellas.
 *
 * SQL para crear la tabla en Supabase:
 * ─────────────────────────────────────────────────────────────
 * create table conversions (
 *   id          uuid primary key default gen_random_uuid(),
 *   user_id     uuid references auth.users on delete cascade not null,
 *   filename    text not null,
 *   tool        text not null,
 *   created_at  timestamptz default now() not null
 * );
 * alter table conversions enable row level security;
 * create policy "own rows" on conversions for all
 *   using (auth.uid() = user_id)
 *   with check (auth.uid() = user_id);
 * ─────────────────────────────────────────────────────────────
 */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;
