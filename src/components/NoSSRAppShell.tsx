'use client';

import dynamic from 'next/dynamic';
import React from 'react';

const AppShell = dynamic(() => import('./AppShell'), {
    ssr: false,
    loading: () => (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div>Loading...</div>
        </div>
    ),
});

export default function NoSSRAppShell({ children }: { children: React.ReactNode }) {
    return <AppShell>{children}</AppShell>;
}
