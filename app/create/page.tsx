import type { Metadata } from 'next';
import AppShell from '../../components/AppShell';
import { getAppData } from '../../lib/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'New post — Ghetto' };

export default async function CreateRoute() {
  const data = await getAppData();
  return <AppShell page="create" data={data} />;
}
