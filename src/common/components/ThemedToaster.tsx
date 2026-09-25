'use client';

import { useTheme } from 'next-themes';
import { Toaster } from 'sonner';

/** Toasts follow the app's chosen theme rather than only the OS setting. */
export function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster richColors position="top-right" theme={resolvedTheme === 'light' ? 'light' : 'dark'} />
  );
}
