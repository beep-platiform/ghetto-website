import type { Metadata } from 'next';
import AppShell from '../../components/AppShell';

export const metadata: Metadata = {
  title: 'Rooms — Ghetto',
  description: 'Find student rooms, houses and apartments near campus.',
};

export default function RoomsPage() {
  return <AppShell page="rooms" />;
}
