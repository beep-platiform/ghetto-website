'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div>
        <div style={{ fontSize: 44 }}>😕</div>
        <h1 style={{ fontSize: 20, margin: '8px 0' }}>We couldn't load Ghetto</h1>
        <p style={{ color: '#667', fontSize: 14, maxWidth: 360 }}>
          The database did not answer. Check your internet connection and the Supabase keys in .env.local, then try again.
        </p>
        <button onClick={reset} style={{ marginTop: 14, height: 46, padding: '0 24px', borderRadius: 23, border: 0, background: '#ffc928', fontWeight: 800, cursor: 'pointer' }}>
          Try again
        </button>
        {process.env.NODE_ENV !== 'production' && <pre style={{ marginTop: 16, fontSize: 11, color: '#a33' }}>{error.message}</pre>}
      </div>
    </div>
  );
}
