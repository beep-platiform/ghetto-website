import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

/** Browser client. The login session lives in cookies, so the server pages see the same user. */
export function supabase(): SupabaseClient {
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copy .env.example to .env.local.');
  }
  if (!client) client = createBrowserClient(url, key);
  return client;
}

/** Call one of the database functions (see supabase/migrations). Runs as the signed-in user. Throws on error. */
export async function rpc<T = any>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase().rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/** Sign out and go to the login page. */
export async function signOut() {
  try { await supabase().auth.signOut(); } catch {}
  window.location.href = '/login';
}
