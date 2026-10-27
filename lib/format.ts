import type { Post } from './types';

export const IMG_BASE = 'https://images.unsplash.com/';
export const photoUrl = (id: string, size: string) => `${IMG_BASE}${id}?${size}&fit=crop`;
export const faceUrl = (id: string) => `${IMG_BASE}${id}?w=100&h=100&fit=crop&crop=faces`;

/** "Student · 2h ago · Nyabugogo" (the place is only shown on the big orange cards). */
export function metaOf(p: Post): string {
  const when = p.ago === 'Just now' ? p.ago : `${p.ago} ago`;
  const parts = [p.author.role, when];
  if (p.kind === 'featured' && p.location) parts.push(p.location);
  return parts.join(' · ');
}
