import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase-server';

/** The link in the confirmation email lands here, we turn the code into a session and go home. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const sb = await supabaseServer();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
