'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const AppShell = dynamic(() => import('./AppShell'), {
    ssr: false,
});

export default function NoSSRAppShell({ children }: { children: React.ReactNode }) {
    return <AppShell>{children}</AppShell>;
}
