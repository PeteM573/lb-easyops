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

        // Get profiles for all users
        const { data: profiles, error: profilesError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, role, created_at');

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

        // Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email in admin creation
        });

        if (authError) {
            console.error('Error creating user:', authError);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        // Create profile entry
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: authData.user.id,
                email: email,
                role: 'employee' // Default role
            });

        if (profileError) {
            console.error('Error creating profile:', profileError);
            // Try to clean up auth user if profile creation failed
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            user: {
                id: authData.user.id,
                email: authData.user.email,
                role: 'employee'
            }
        });
    } catch (error) {
        console.error('Error in POST /api/admin/users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH: Update user role
export async function PATCH(req: NextRequest) {
    const { authorized } = await verifyManagerRole(req);

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
