import type { Metadata } from 'next';

import { SessionProvider } from 'next-auth/react';

import './globals.css';

export const metadata: Metadata = {
  title: 'VoiceDoc',
  description: 'Voice-first document editor',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
