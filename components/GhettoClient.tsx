'use client';

import { useEffect } from 'react';
import { initGhetto } from '../lib/ghetto';
import type { AppData, Profile } from '../lib/types';

/**
 * Renders nothing. Once the page markup is in the DOM it wires up all the interactions
 * (stories, post detail, comments, search, notifications, rooms) using the data loaded from Supabase.
 */
export default function GhettoClient({ data, profile }: { data: AppData; profile?: Profile | null }) {
  useEffect(() => {
    initGhetto(data, profile ?? null);
  }, [data, profile]);
  return null;
}
