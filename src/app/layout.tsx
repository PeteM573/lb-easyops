// src/app/layout.tsx
'use client';

import './globals.css';
import NoSSRAppShell from '@/components/NoSSRAppShell';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background">
        <NoSSRAppShell>
          {children}
        </NoSSRAppShell>
      </body>
    </html>
  );
}