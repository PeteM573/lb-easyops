// src/app/layout.tsx
import './globals.css';
import AppShell from '@/components/AppShell';

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