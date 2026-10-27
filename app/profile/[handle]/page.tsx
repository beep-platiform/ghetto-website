import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import { getAppData, getProfile, getSettings } from '../../../lib/data';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle} — Ghetto` };
}

/** /profile/<username> = anyone's profile */
export default async function UserProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [data, settings, profile] = await Promise.all([getAppData(), getSettings(), getProfile(decodeURIComponent(handle))]);
  if (!profile) notFound();
  return <AppShell page="profile" data={data} profile={profile} settings={settings} />;
}
