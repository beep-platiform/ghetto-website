'use client';

import { useEffect } from 'react';
import { initGhetto } from '../lib/ghetto';
import type { AppData, Profile, Settings } from '../lib/types';

/**
 * Renders nothing. Once the page markup is in the DOM it wires up all the interactions
 * (stories, post detail, comments, search, notifications, rooms) using the data loaded from Supabase.
 */
export default function GhettoClient({ data, profile, settings }: { data: AppData; profile?: Profile | null; settings?: Settings | null }) {
  useEffect(() => {
    initGhetto(data, profile ?? null, settings ?? null);
  }, [data, profile, settings]);
  return null;
}
