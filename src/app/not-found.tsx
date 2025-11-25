'use client';

import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-4 text-center space-y-6">
            <div className="p-6 bg-gray-100 rounded-full">
                <FileQuestion size={48} className="text-gray-400" />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Page Not Found</h2>
                <p className="text-gray-500 max-w-md">
                    We couldn't find the page you were looking for. It might have been moved or deleted.
                </p>
            </div>
            <Link
                href="/"
                className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity"
            >
                Return Home
            </Link>
        </div>
    );
}
