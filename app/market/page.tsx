import type { Metadata } from 'next';
import AppShell from '../../components/AppShell';
import { getAppData, getSettings } from '../../lib/data';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Marketplace — Ghetto',
  description: 'Buy and sell things around campus: electronics, furniture, books and more.',
};

export default async function MarketRoute() {
  const [data, settings] = await Promise.all([getAppData(), getSettings()]);
  return <AppShell page="market" data={data} settings={settings} />;
}
