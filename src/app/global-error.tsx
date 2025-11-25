'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html lang="en">
            <head>
                <meta charSet="utf-8" />
            </head>
            <body
                style={{
                    margin: 0,
                    padding: '1rem',
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    backgroundColor: '#fafaf9',
                    color: '#292524',
                }}
            >
                <div style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
                        Something went wrong!
                    </h2>
                    <p style={{ color: '#6b7280', margin: 0 }}>
                        We apologize for the inconvenience.
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: '#ea580c',
                            color: 'white',
                            fontWeight: 600,
                            borderRadius: '0.75rem',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1rem',
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
