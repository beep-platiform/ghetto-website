import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import { PublicPostView } from '../../../components/PublicView';
import { getAppData, getSettings } from '../../../lib/data';
import { getPublicPost, isUuid, SITE, snippet } from '../../../lib/public';
import { supabaseServer } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getPublicPost(id);
  if (!p) return { title: 'Post — Ghetto', robots: { index: false } };
  const img = p.photos.find((x) => /^https?:/.test(x));
  const desc = snippet(p.body);
  return {
    title: `${p.title} — ${p.author.name} · Ghetto`,
    description: desc,
    alternates: { canonical: `${SITE}/post/${id}` },
    openGraph: { type: 'article', title: p.title, description: desc, url: `${SITE}/post/${id}`, siteName: 'Ghetto', images: img ? [img] : undefined },
    twitter: { card: img ? 'summary_large_image' : 'summary', title: p.title, description: desc, images: img ? [img] : undefined },
  };
}

/** /post/<id>: the post opens on top of the feed for people who are logged in; everyone else gets a readable public page. */
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  let user = null;
  try { user = (await (await supabaseServer()).auth.getUser()).data.user; } catch {}
  if (user) {
    const [data, settings] = await Promise.all([getAppData(), getSettings()]);
    return <AppShell page="home" data={data} settings={settings} />;
  }
  const post = await getPublicPost(id);
  if (!post) notFound();
  return <PublicPostView post={post} />;
}
