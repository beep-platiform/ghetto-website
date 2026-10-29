import AppShell from '../../components/AppShell';
import { getAppData, getSettings } from '../../lib/data';

export const dynamic = 'force-dynamic';

/** Same screen as Home; the script opens the panel on top because of the address. */
export default async function Page() {
  const [data, settings] = await Promise.all([getAppData(), getSettings()]);
  return <AppShell page="home" data={data} settings={settings} />;
}
