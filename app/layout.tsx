import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SITE } from '../lib/public';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: 'Ghetto — Live. Learn. Grow.',
  description: 'Student housing and community in Nyabugogo: rooms, prices, tips and neighbours in one place.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
};

/** Puts the saved look (dark mode, text size, calmer motion) on the page before it paints, so there is no flash. */
const LOOK_JS = "try{var l=JSON.parse(localStorage.getItem('ghetto.look')||'null');if(l){var d=document.documentElement;var t=l.theme==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):l.theme;d.dataset.theme=t;d.dataset.ts=l.ts||'normal';d.dataset.rm=l.rm?'1':'0'}}catch(e){}";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOOK_JS }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
