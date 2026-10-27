import AppShell from '../components/AppShell';
import { getAppData, getSettings } from '../lib/data';

// Always read fresh data from Supabase.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [data, settings] = await Promise.all([getAppData(), getSettings()]);
  return <AppShell page="home" data={data} settings={settings} />;
}
