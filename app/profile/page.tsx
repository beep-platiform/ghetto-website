import type { Metadata } from 'next';
import AppShell from '../../components/AppShell';
import { getAppData, getProfile } from '../../lib/data';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Profile — Ghetto' };

/** /profile = your own profile */
export default async function MyProfilePage() {
  const [data, profile] = await Promise.all([getAppData(), getProfile()]);
  return <AppShell page="profile" data={data} profile={profile} />;
}
