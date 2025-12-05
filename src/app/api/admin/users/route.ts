import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Create Supabase Admin client with service role
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Helper to get current user and verify manager role
async function verifyManagerRole(req: NextRequest) {
    const cookieStore = cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { authorized: false, user: null };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const role = profile?.role?.toLowerCase();
    if (role !== 'manager' && role !== 'admin') {
        return { authorized: false, user };
    }

    return { authorized: true, user };
}

// GET: List all users with their roles
export async function GET(req: NextRequest) {
    const { authorized } = await verifyManagerRole(req);

    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        // Get all users from auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

        if (authError) {
            console.error('Error listing users:', authError);
            return NextResponse.json({ error: authError.message }, { status: 500 });
        }

        // Get profiles for all users (email and created_at come from auth data, not profiles)
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('id, role');

        if (profilesError) {
            console.error('Error fetching profiles:', profilesError);
            return NextResponse.json({ error: profilesError.message }, { status: 500 });
        }

        // Combine auth users with profile data
        const users = authData.users.map(authUser => {
            const profile = profiles?.find(p => p.id === authUser.id);
            return {
                id: authUser.id,
                email: authUser.email,
                role: profile?.role || 'employee',
                created_at: authUser.created_at,
                last_sign_in_at: authUser.last_sign_in_at
            };
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error('Error in GET /api/admin/users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST: Create new user
export async function POST(req: NextRequest) {
    const { authorized } = await verifyManagerRole(req);

    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
        }

        // Check if service role key is configured
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error('SUPABASE_SERVICE_ROLE_KEY is not configured');
            return NextResponse.json({
                error: 'Server configuration error',
                details: 'Admin API key not configured'
            }, { status: 500 });
        }

        // Create user in Supabase Auth
        console.log('Creating user with email:', email);
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email in admin creation
        });

        if (authError) {
            console.error('Error creating user:', authError);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        console.log('User created successfully, ID:', authData.user.id);

        // Create/update profile entry (use upsert in case there's a trigger that auto-creates profiles)
        console.log('Upserting profile for user:', authData.user.id);
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: authData.user.id,
                role: 'employee', // Default role
                force_password_change: true // Require password change on first login
            }, {
                onConflict: 'id'
            });

        if (profileError) {
            console.error('Error creating profile:', profileError);
            // Try to clean up auth user if profile creation failed
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return NextResponse.json({ error: 'Failed to create user profile', details: profileError.message }, { status: 500 });
        }

        console.log('Profile upserted successfully');

        const responseData = {
            success: true,
            user: {
                id: authData.user.id,
                email: authData.user.email,
                role: 'employee'
            }
        };

        console.log('Returning success response:', responseData);
        return NextResponse.json(responseData);
    } catch (error) {
        console.error('Error in POST /api/admin/users:', error);
        // Return more detailed error for debugging
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({
            error: 'Internal server error',
            details: errorMessage
        }, { status: 500 });
    }
}

// PATCH: Update user role
export async function PATCH(req: NextRequest) {
    const { authorized, user } = await verifyManagerRole(req);

    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const { userId, role } = body;

        if (!userId || !role) {
            return NextResponse.json({ error: 'userId and role required' }, { status: 400 });
        }

        if (role !== 'employee' && role !== 'manager' && role !== 'admin') {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        // Security: Prevent users from modifying their own role
        if (userId === user?.id) {
            return NextResponse.json({ error: 'Cannot modify your own role' }, { status: 400 });
        }

        // Update profile role
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ role })
            .eq('id', userId);

        if (error) {
            console.error('Error updating role:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in PATCH /api/admin/users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE: Remove user
export async function DELETE(req: NextRequest) {
    const { authorized, user } = await verifyManagerRole(req);

    if (!authorized) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        // Security: Prevent users from deleting themselves
        if (userId === user?.id) {
            return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
        }

        // Security: Prevent deleting the last admin
        // First check if this user is an admin
        const { data: targetProfile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();

        if (targetProfile?.role?.toLowerCase() === 'admin') {
            // Count total admins
            const { count } = await supabaseAdmin
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .ilike('role', 'admin');

            if (count && count <= 1) {
                return NextResponse.json({
                    error: 'Cannot delete the last admin account'
                }, { status: 400 });
            }
        }

        // Delete from profiles table first
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .delete()
            .eq('id', userId);

        if (profileError) {
            console.error('Error deleting profile:', profileError);
        }

        // Delete user from auth
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (authError) {
            console.error('Error deleting user:', authError);
            return NextResponse.json({ error: authError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in DELETE /api/admin/users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
