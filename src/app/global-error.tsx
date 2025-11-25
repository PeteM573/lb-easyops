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
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <html lang="en">
            <body className="bg-background text-foreground antialiased flex min-h-screen flex-col items-center justify-center p-4 text-center">
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Something went wrong!</h2>
                    <p className="text-gray-500">We apologize for the inconvenience.</p>
                    <button
                        onClick={() => reset()}
                        className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
