import type { Metadata } from 'next';
import AppShell from '../../components/AppShell';
import { getAppData, getSettings } from '../../lib/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Settings — Ghetto' };

export default async function SettingsRoute() {
  const [data, settings] = await Promise.all([getAppData(), getSettings()]);
  return <AppShell page="settings" data={data} settings={settings} />;
}
