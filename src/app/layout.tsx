// src/app/layout.tsx
import './globals.css';
import NoSSRAppShell from '@/components/NoSSRAppShell';

export const dynamic = 'force-dynamic';

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