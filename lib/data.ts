import { rpc } from './supabase';
import type { AppData } from './types';

/** Everything the home + rooms pages need, in one database call (public.get_app_data). */
export async function getAppData(): Promise<AppData> {
  return rpc<AppData>('get_app_data');
}
