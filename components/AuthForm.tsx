'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Log in / create account. Same look as the rest of the app. */
export default function AuthForm({ linkError }: { linkError?: boolean }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Student' | 'Landlord'>('Student');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(linkError ? 'That confirmation link did not work. Please log in, or sign up again.' : '');
  const [info, setInfo] = useState('');
  const [avail, setAvail] = useState<'idle' | 'checking' | 'ok' | 'taken'>('idle');
  const seq = useRef(0);

  // is the username free? (asks the database while you type)
  useEffect(() => {
    if (mode !== 'signup' || !HANDLE_RE.test(handle)) { setAvail('idle'); return; }
    const mine = ++seq.current;
    setAvail('checking');
    const t = setTimeout(async () => {
      try {
        const { data } = await supabase().rpc('handle_available', { p_handle: handle });
        if (mine === seq.current) setAvail(data ? 'ok' : 'taken');
      } catch { if (mine === seq.current) setAvail('idle'); }
    }, 350);
    return () => clearTimeout(t);
  }, [handle, mode]);

  const switchMode = (m: 'login' | 'signup') => { setMode(m); setError(''); setInfo(''); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setInfo('');
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address');
    if (mode === 'signup') {
      if (!name.trim()) return setError('Please enter your name');
      if (!HANDLE_RE.test(handle)) return setError('Username: 3 to 20 letters, numbers or underscores');
      if (avail === 'taken') return setError('That username is taken');
      if (password.length < 8) return setError('Password must be at least 8 characters');
    } else if (!password) return setError('Enter your password');

    setBusy(true);
    try {
      const sb = supabase();
      if (mode === 'login') {
        const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
        window.location.href = '/';
        return;
      }
      const { data, error } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim(), handle, role }, emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
      if (data.user && data.user.identities && data.user.identities.length === 0) throw new Error('That email is already registered. Try logging in.');
      if (data.session) { window.location.href = '/'; return; }
      setMode('login'); setPassword('');
      setInfo('Account created! We sent a confirmation link to ' + email.trim() + '. Open it, then log in here.');
    } catch (err: any) {
      const m = String(err?.message || 'Something went wrong');
      setError(/invalid login/i.test(m) ? 'Wrong email or password' : /not confirmed/i.test(m) ? 'Please confirm your email first (check your inbox)' : m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="au">
      <div className="au-card">
        <div className="au-brand">
          <span className="au-logo">
            <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 15.5 16 4l13 11.5" stroke="#ffbd16" strokeWidth="3.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/><path d="M7 14v14h7v-8h5v8h6V14" stroke="#14243c" strokeWidth="2.8" fill="none" strokeLinejoin="round"/></svg>
          </span>
          <b>Ghetto</b>
          <small>Live. Learn. Grow...</small>
        </div>

        <div className="tabs au-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={'tab' + (mode === 'login' ? ' on' : '')} onClick={() => switchMode('login')}>Log in</button>
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={'tab' + (mode === 'signup' ? ' on' : '')} onClick={() => switchMode('signup')}>Create account</button>
        </div>

        <form onSubmit={submit} noValidate>
          {mode === 'signup' && (
            <>
              <label className="ep-l" htmlFor="auName">Name</label>
              <input className="cs-in" id="auName" type="text" maxLength={40} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" />

              <label className="ep-l" htmlFor="auHandle">Username</label>
              <div className="ep-at"><span>@</span>
                <input className="cs-in" id="auHandle" type="text" maxLength={20} autoCapitalize="none" autoComplete="username" spellCheck={false}
                  value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="yourname" />
              </div>
              <small className={'ep-h' + (avail === 'taken' || (handle && !HANDLE_RE.test(handle)) ? ' bad' : avail === 'ok' ? ' good' : '')}>
                {avail === 'taken' ? 'That username is taken' : avail === 'ok' ? 'Username is available ✓' : avail === 'checking' ? 'Checking…' : '3 to 20 letters, numbers or underscores'}
              </small>

              <div className="ep-l">I am a</div>
              <div className="ep-seg">
                <button type="button" className={role === 'Student' ? 'on' : ''} onClick={() => setRole('Student')}><i className="fa-solid fa-graduation-cap"></i>Student</button>
                <button type="button" className={role === 'Landlord' ? 'on' : ''} onClick={() => setRole('Landlord')}><i className="fa-solid fa-key"></i>Landlord</button>
              </div>
            </>
          )}

          <label className="ep-l" htmlFor="auEmail">Email</label>
          <input className="cs-in" id="auEmail" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />

          <label className="ep-l" htmlFor="auPass">Password</label>
          <div className="au-pass">
            <input className="cs-in" id="auPass" type={show ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} />
            <button type="button" className="au-eye" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>
              <i className={show ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'}></i>
            </button>
          </div>

          <div className="au-msg err" role="alert">{error}</div>
          {info && <div className="au-msg ok">{info}</div>}

          <button type="submit" className="cs-send au-go" disabled={busy}>
            <i className={busy ? 'fa-solid fa-spinner fa-spin' : mode === 'login' ? 'fa-solid fa-right-to-bracket' : 'fa-solid fa-user-plus'}></i>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>

        <div className="au-or"><span>or</span></div>
        {/* Placeholder: Google sign-in will be connected later */}
        <button type="button" className="au-google" onClick={() => { setInfo(''); setError(''); setInfo('Google sign-in is coming soon. For now, use your email.'); }}>
          <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.6z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
          Continue with Google<em>Soon</em>
        </button>

        <p className="au-note">
          By continuing you agree to Ghetto&apos;s terms. Visit a room and meet the landlord before you pay any money.
        </p>
      </div>
    </main>
  );
}
