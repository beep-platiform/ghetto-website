import type { MetadataRoute } from 'next';
import { getSitemap, SITE } from '../lib/public';

export const dynamic = 'force-dynamic';

/** Every public post and room, so Google can find them. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const s = await getSitemap();
  return [
    { url: `${SITE}/login`, changeFrequency: 'monthly', priority: 0.3 },
    ...(s?.rooms ?? []).map((r) => ({ url: `${SITE}/rooms/${encodeURIComponent(r.id)}`, lastModified: r.at, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...(s?.posts ?? []).map((p) => ({ url: `${SITE}/post/${p.id}`, lastModified: p.at, changeFrequency: 'weekly' as const, priority: 0.6 })),
  ];
}
