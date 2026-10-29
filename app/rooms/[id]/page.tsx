import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import { PublicRoomView } from '../../../components/PublicView';
import { getAppData, getSettings } from '../../../lib/data';
import { getPublicRoom, SITE, snippet } from '../../../lib/public';
import { supabaseServer } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = await getPublicRoom(decodeURIComponent(id));
  if (!r) return { title: 'Room — Ghetto', robots: { index: false } };
  const img = r.photos.find((x) => /^https?:/.test(x));
  const desc = snippet(`${r.price.toLocaleString('en-US')} RWF / month · ${r.area}. ${r.about}`);
  return {
    title: `${r.title} — ${r.area} · Ghetto`,
    description: desc,
    alternates: { canonical: `${SITE}/rooms/${id}` },
    openGraph: { type: 'website', title: r.title, description: desc, url: `${SITE}/rooms/${id}`, siteName: 'Ghetto', images: img ? [img] : undefined },
    twitter: { card: img ? 'summary_large_image' : 'summary', title: r.title, description: desc, images: img ? [img] : undefined },
  };
}

/** /rooms/<id>: opens the room on top of the Rooms page for people who are logged in; everyone else gets a readable public page. */
export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rid = decodeURIComponent(id);
  let user = null;
  try { user = (await (await supabaseServer()).auth.getUser()).data.user; } catch {}
  if (user) {
    const [data, settings] = await Promise.all([getAppData(), getSettings()]);
    return <AppShell page="rooms" data={data} settings={settings} />;
  }
  const room = await getPublicRoom(rid);
  if (!room) notFound();
  return <PublicRoomView room={room} />;
}
