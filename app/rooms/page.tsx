import type { Metadata } from 'next';
import AppShell from '../../components/AppShell';
import { getAppData, getSettings } from '../../lib/data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Rooms — Ghetto',
  description: 'Find student rooms, houses and apartments near campus.',
};

export default async function RoomsPage() {
  const [data, settings] = await Promise.all([getAppData(), getSettings()]);
  return <AppShell page="rooms" data={data} settings={settings} />;
}
