import { rpc } from './supabase';
import type { AppData, Profile } from './types';

/** Everything the home + rooms pages need, in one database call (public.get_app_data). */
export async function getAppData(): Promise<AppData> {
  return rpc<AppData>('get_app_data');
}

/** One profile (null handle = the signed-in / demo user). Returns null when the username does not exist. */
export async function getProfile(handle?: string): Promise<Profile | null> {
  return rpc<Profile | null>('get_profile', { p_handle: handle ?? null });
}
