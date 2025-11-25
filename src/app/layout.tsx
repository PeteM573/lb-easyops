// src/app/layout.tsx
import './globals.css';
import dynamic from 'next/dynamic';

const AppShell = dynamic(() => import('@/components/AppShell'), {
  ssr: false,
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background">
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}