import type { Metadata } from 'next';
import AuthForm from '../../components/AuthForm';

export const metadata: Metadata = { title: 'Log in — Ghetto' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <AuthForm linkError={error === 'link'} />;
}
