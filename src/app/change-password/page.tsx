'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { Lock, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

export default function ChangePasswordPage() {
    const router = useRouter();
    const supabase = createClient();

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [checking, setChecking] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Check if user actually needs to change password
    useEffect(() => {
        const checkPasswordChangeRequired = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('force_password_change')
                .eq('id', user.id)
                .single();

            if (!profile?.force_password_change) {
                // User doesn't need to change password, redirect to dashboard
                router.push('/');
                return;
            }

            setChecking(false);
        };

        checkPasswordChangeRequired();
    }, [supabase, router]);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        // Validate password length
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            setIsLoading(false);
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            setError('Not authenticated');
            setIsLoading(false);
            return;
        }

        // Update password
        const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (updateError) {
            setError(updateError.message);
            setIsLoading(false);
            return;
        }

        // Clear force_password_change flag
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ force_password_change: false })
            .eq('id', user.id);

        setIsLoading(false);

        if (profileError) {
            setError('Password updated but failed to update profile. Please contact support.');
            return;
        }

        setSuccess(true);

        // Redirect to dashboard after brief delay
        setTimeout(() => {
            router.push('/');
            router.refresh();
        }, 2000);
    };

    if (checking) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex items-center gap-3 text-gray-500">
                    <Loader2 className="animate-spin" size={24} />
                    <span>Checking...</span>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white p-8 rounded-xl border border-border shadow-sm text-center">
                    <div className="mb-6">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="text-green-600" size={32} />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Password Updated!</h1>
                    <p className="text-gray-600">Redirecting to dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl border border-border shadow-sm">
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Lock className="text-primary" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Change Your Password</h1>
                    <p className="text-gray-600">Please set a new password for your account</p>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-6">
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-foreground mb-2">
                            New Password
                        </label>
                        <input
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={6}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="At least 6 characters"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                            Confirm Password
                        </label>
                        <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            required
                            minLength={6}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="block w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            placeholder="Re-enter password"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                            <p className="text-red-800 text-sm">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 px-6 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                Updating Password...
                            </>
                        ) : (
                            <>
                                <Lock size={20} />
                                Update Password
                            </>
                        )}
                    </button>
                </form>

                <p className="text-xs text-gray-500 text-center mt-6">
                    Your password must be at least 6 characters long
                </p>
            </div>
        </div>
    );
}
