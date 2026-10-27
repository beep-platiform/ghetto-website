import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Server client that acts as the signed-in user (reads the session cookies). */
export async function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.');
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        // Server components cannot set cookies; the proxy refreshes the session, so this is safe to ignore.
        try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {}
      },
    },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
}
