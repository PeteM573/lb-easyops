// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import NavBar from '@/components/NavBar'; // Import the NavBar

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Loud Baby Easy Ops',
  description: 'Inventory and Operations Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <NavBar /> {/* Add the NavBar here */}
        <main>{children}</main>
      </body>
    </html>
  );
}