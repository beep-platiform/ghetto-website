import type { MetadataRoute } from 'next';
import { SITE } from '../lib/public';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: ['/post/', '/rooms/', '/login'], disallow: ['/profile', '/settings', '/create', '/notifications', '/search', '/auth/'] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
