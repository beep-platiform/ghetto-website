import { supabaseServer } from './supabase-server';
import type { AppData, Profile, Settings } from './types';

async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/** The first screen of everything (first page of posts, notifications and rooms) in one database call (public.get_app_data). More pages load as the user scrolls. */
export async function getAppData(): Promise<AppData> {
  const r = await call<any>('get_app_data');
  const { feed, notifs, rooms, ...rest } = r;
  return {
    ...rest,
    posts: feed.posts, feedNext: feed.next ?? null, comments: {},
    notifications: notifs.items, notifNext: notifs.next ?? null, notifUnread: notifs.unread, notifMaxId: notifs.maxId, notifSession: notifs.session,
    rooms: rooms.rooms, roomsNext: rooms.next ?? null,
  } as AppData;
}

/** One profile (no handle = the signed-in user). Returns null when the username does not exist. */
export const getProfile = (handle?: string) => call<Profile | null>('get_profile', { p_handle: handle ?? null });

/** The signed-in user's settings (public.get_settings). */
export const getSettings = () => call<Settings>('get_settings');
