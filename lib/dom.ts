import type { SyntheticEvent } from 'react';

export function hideBroken(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.style.display = 'none';
}
