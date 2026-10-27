import AppShell from '../components/AppShell';
import { getAppData } from '../lib/data';

// Always read fresh data from Supabase.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const data = await getAppData();
  return <AppShell page="home" data={data} />;
}
