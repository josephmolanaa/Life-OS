'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

// Keep server HTML stable while browser-only preferences become available.
export function useClientReady() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
