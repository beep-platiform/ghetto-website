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

const BUCKET = 'post-images';
const uuid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

/** Upload one (already compressed) photo into your own folder of the post-images bucket and return its public link. */
export async function uploadPostImage(blob: Blob, ext: string): Promise<string> {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Please log in');
  const path = `${id}/${uuid()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
  if (error) throw new Error(error.message);
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Delete photos from the bucket. Returns the links that could NOT be deleted (so the caller can try again later). */
export async function removePostImages(urls: string[]): Promise<string[]> {
  const marker = `/object/public/${BUCKET}/`;
  const pairs = urls.map(u => { const i = u.indexOf(marker); return { u, p: i < 0 ? '' : decodeURIComponent(u.slice(i + marker.length).split('?')[0]) }; }).filter(x => x.p);
  if (!pairs.length) return [];
  try {
    const { error } = await supabase().storage.from(BUCKET).remove(pairs.map(x => x.p));
    return error ? pairs.map(x => x.u) : [];
  } catch { return pairs.map(x => x.u); }
}
