import { supabaseServer } from './supabase-server';
import type { AppData, Profile, Settings } from './types';

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/** Everything the home + rooms pages need, in one database call (public.get_app_data). */
export const getAppData = () => call<AppData>('get_app_data');

/** One profile (no handle = the signed-in user). Returns null when the username does not exist. */
export const getProfile = (handle?: string) => call<Profile | null>('get_profile', { p_handle: handle ?? null });

/** The signed-in user's settings (public.get_settings). */
export const getSettings = () => call<Settings>('get_settings');
