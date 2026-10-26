'use client';

import { useEffect } from 'react';
import { initGhetto } from '../lib/ghetto';

/**
 * Renders nothing. Once the page markup is in the DOM it wires up all the
 * interactions (stories, post detail, comments, search, notifications, right rail).
 */
export default function GhettoClient() {
  useEffect(() => {
    initGhetto();
  }, []);
  return null;
}
