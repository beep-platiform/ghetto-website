import type { Metadata } from 'next';
import AppShell from '../../../components/AppShell';
import { getAppData, getSettings } from '../../../lib/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Chat — Ghetto', robots: { index: false } };

/** /messages/<id>: the chat opens on top of the message list (the address works after a refresh too). */
export default async function ChatRoute() {
  const [data, settings] = await Promise.all([getAppData(), getSettings()]);
  return <AppShell page="messages" data={data} settings={settings} />;
}
