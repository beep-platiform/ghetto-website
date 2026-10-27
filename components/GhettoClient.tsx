'use client';

import { useEffect } from 'react';
import { initGhetto } from '../lib/ghetto';
import type { AppData } from '../lib/types';

/**
 * Renders nothing. Once the page markup is in the DOM it wires up all the interactions
 * (stories, post detail, comments, search, notifications, rooms) using the data loaded from Supabase.
 */
export default function GhettoClient({ data }: { data: AppData }) {
  useEffect(() => {
    initGhetto(data);
  }, [data]);
  return null;
}
