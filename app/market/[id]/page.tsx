import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AppShell from '../../../components/AppShell';
import { PublicProductView } from '../../../components/PublicView';
import { getAppData, getSettings } from '../../../lib/data';
import { getPublicProduct, SITE, snippet } from '../../../lib/public';
import { supabaseServer } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getPublicProduct(id);
  if (!p) return { title: 'Product — Ghetto', robots: { index: false } };
  const img = p.photos.find((x) => /^https?:/.test(x));
  const desc = snippet(`${p.price.toLocaleString('en-US')} RWF · ${p.description}`);
  return {
    title: `${p.title} — ${p.price.toLocaleString('en-US')} RWF · Ghetto`,
    description: desc,
    alternates: { canonical: `${SITE}/market/${id}` },
    openGraph: { type: 'website', title: p.title, description: desc, url: `${SITE}/market/${id}`, siteName: 'Ghetto', images: img ? [img] : undefined },
    twitter: { card: img ? 'summary_large_image' : 'summary', title: p.title, description: desc, images: img ? [img] : undefined },
  };
}

/** /market/<id>: opens the product on top of the Marketplace for people who are logged in; everyone else gets a readable public page. */
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let user = null;
  try { user = (await (await supabaseServer()).auth.getUser()).data.user; } catch {}
  if (user) {
    const [data, settings] = await Promise.all([getAppData(), getSettings()]);
    return <AppShell page="market" data={data} settings={settings} />;
  }
  const product = await getPublicProduct(id);
  if (!product) notFound();
  return <PublicProductView product={product} />;
}
