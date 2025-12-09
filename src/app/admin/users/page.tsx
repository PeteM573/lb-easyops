'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { UserPlus, Users, Shield, ArrowLeft, Check, X, Loader2, Trash2, Key } from 'lucide-react';
import Link from 'next/link';

interface User {
    id: string;
    email: string;
    role: string;
    created_at: string;
    last_sign_in_at?: string;
}

export default function AdminUsersPage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const router = useRouter();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);

    // Check auth and role
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            const role = profile?.role?.toLowerCase();
            if (role !== 'manager' && role !== 'admin') {
                router.push('/');
                return;
            }

            fetchUsers();
        };

        checkAuth();
    }, [supabase, router]);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users');
            const data = await response.json();

            if (response.ok) {
                setUsers(data.users || []);
            } else {
                setError(data.error || 'Failed to load users');
            }
        } catch (err) {
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail, password: newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess(`User created: ${newEmail}`);
                setNewEmail('');
                setNewPassword('');
                setShowCreateForm(false);
                fetchUsers();
            } else {
                setError(data.error || 'Failed to create user');
            }
        } catch (err) {
            setError('Failed to create user');
        } finally {
            setCreating(false);
        }
    };

    const handleToggleRole = async (userId: string, currentRole: string) => {
        const newRole = currentRole.toLowerCase() === 'manager' ? 'employee' : 'manager';

        try {
            const response = await fetch('/api/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, role: newRole })
            });

            if (response.ok) {
                setSuccess(`Role updated to ${newRole}`);
                fetchUsers();
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to update role');
            }
        } catch (err) {
            setError('Failed to update role');
        }
    };

    const handleDeleteUser = async (userId: string, userEmail: string) => {
        if (!confirm(`Are you sure you want to permanently delete ${userEmail}? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users?userId=${userId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setSuccess(`User ${userEmail} deleted successfully`);
                fetchUsers();
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to delete user');
            }
        } catch (err) {
            setError('Failed to delete user');
        }
    };

    const handleResetPassword = async (userId: string, userEmail: string) => {
        if (!confirm(`Reset password for ${userEmail}?\n\nThis will require them to change their password on next login.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update({ force_password_change: true })
                .eq('id', userId);

            if (error) {
                setError(`Failed to reset password: ${error.message}`);
            } else {
                setSuccess(`Password reset for ${userEmail}. They will be required to change password on next login.`);
                setTimeout(() => setSuccess(null), 5000);
            }
        } catch (err) {
            setError('Failed to reset password');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex items-center gap-3 text-gray-500">
                    <Loader2 className="animate-spin" size={24} />
                    <span>Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-24">
            {/* Header */}
            <div className="bg-white border-b border-border sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <Link
                        href="/"
                        className="text-sm text-gray-500 hover:text-foreground mb-4 inline-flex items-center gap-1"
                    >
                        <ArrowLeft size={16} />
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-3 mt-4">
                        <div className="p-3 bg-primary/10 rounded-xl">
                            <Users className="text-primary" size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
                            <p className="text-sm text-gray-500">Create accounts and manage roles</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

                {/* Success/Error Messages */}
                {success && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
                        <Check className="text-green-600" size={20} />
                        <p className="text-green-800">{success}</p>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
                        <X className="text-red-600" size={20} />
                        <p className="text-red-800">{error}</p>
                        <button onClick={() => setError(null)} className="ml-auto">
                            <X size={18} />
                        </button>
                    </div>
                )}

                {/* Create User Section */}
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 border-b border-border flex justify-between items-center">
                        <h2 className="font-semibold text-foreground flex items-center gap-2">
                            <UserPlus size={18} />
                            Create New User
                        </h2>
                        {!showCreateForm && (
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                + New User
                            </button>
                        )}
                    </div>

                    {showCreateForm && (
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    required
                                    placeholder="user@example.com"
                                    className="w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Initial Password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    placeholder="Minimum 6 characters"
                                    className="w-full h-12 px-4 rounded-xl border border-input bg-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">User can change this on first login</p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowCreateForm(false);
                                        setNewEmail('');
                                        setNewPassword('');
                                    }}
                                    className="flex-1 h-12 px-6 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 h-12 px-6 bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {creating ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={18} />
                                            Create User
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Users List */}
                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
                    <div className="bg-gray-50 px-6 py-3 border-b border-border">
                        <h2 className="font-semibold text-foreground">All Users ({users.length})</h2>
                    </div>

                    <div className="divide-y divide-border">
                        {users.length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                                No users found
                            </div>
                        ) : (
                            users.map((user) => (
                                <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="font-medium text-foreground">{user.email}</p>
                                            <p className="text-sm text-gray-500">
                                                Created: {new Date(user.created_at).toLocaleDateString()}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${user.role.toLowerCase() === 'manager' || user.role.toLowerCase() === 'admin'
                                                ? 'bg-purple-100 text-purple-700'
                                                : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                <Shield size={14} className="inline mr-1" />
                                                {user.role}
                                            </span>

                                            <button
                                                onClick={() => handleToggleRole(user.id, user.role)}
                                                className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Toggle Role
                                            </button>

                                            <button
                                                onClick={() => handleResetPassword(user.id, user.email)}
                                                className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg transition-colors"
                                                title="Reset password"
                                            >
                                                <Key size={18} />
                                            </button>

                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.email)}
                                                className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                                title="Delete user"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
