import { createClient } from '@supabase/supabase-js';

/** Where the site lives (used for links in search results). Set NEXT_PUBLIC_SITE_URL on Vercel to your own domain. */
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://ghetto-website.vercel.app').replace(/\/$/, '');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

/** A server client with no login. It can only call the three public read-only functions (0009_public_pages.sql). */
function anon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase settings');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (i, init) => fetch(i, { ...init, next: { revalidate: 300 } }) } });
}

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    const { data, error } = await anon().rpc(fn, args);
    return error ? null : (data as T);
  } catch { return null; }
}

export type PublicPost = { id: string; title: string; body: string; location: string | null; photos: string[]; type: string; price: number | null; tags: string[]; alt: string | null; createdAt: string; author: { name: string; handle: string; role: string; verified: boolean } };
export type PublicRoom = { id: string; title: string; type: string; area: string; price: number; beds: number; bath: string; fac: string[]; photos: string[]; about: string; rate: number; rev: number; from: string; deposit: string | null; minStay: string | null; createdAt: string; landlord: { name: string; handle: string; verified: boolean } };

export const getPublicPost = (id: string) => (isUuid(id) ? call<PublicPost>('get_public_post', { p_post: id }) : Promise.resolve(null));
export const getPublicRoom = (id: string) => call<PublicRoom>('get_public_room', { p_room: id });
export const getSitemap = () => call<{ posts: { id: string; at: string }[]; rooms: { id: string; at: string }[] }>('public_sitemap');

export const snippet = (s: string, n = 155) => { const t = s.replace(/\s+/g, ' ').trim(); return t.length <= n ? t : t.slice(0, n - 1).trimEnd() + '…'; };
