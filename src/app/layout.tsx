import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from 'next-themes';
import { StoreProvider } from '../store/StoreProvider';
import { RealtimeProvider } from '../common/providers/RealtimeProvider';
import { AuthBootstrap } from '../features/auth/AuthBootstrap';
import { ThemedToaster } from '../common/components/ThemedToaster';
import './globals.css';

export const metadata: Metadata = {
  title: 'DevHub',
  description: 'Chat, whiteboard and meetings for developer teams',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f7fb' },
    { media: '(prefers-color-scheme: dark)', color: '#0c0c14' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Class-based themes; the choice (light / dark / system) is remembered per browser. */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <StoreProvider>
            <AuthBootstrap />
            <RealtimeProvider>{children}</RealtimeProvider>
            <ThemedToaster />
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
