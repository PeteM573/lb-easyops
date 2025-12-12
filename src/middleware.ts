// src/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // --- THE NEW, ROBUST FIX ---
  // --- THE NEW, ROBUST FIX ---
  // Check for the unique Square webhook signature header OR the specific path.
  const squareSignature = request.headers.get('x-square-signature');
  const isWebhookRoute = request.nextUrl.pathname.startsWith('/api/square-webhook');

  if (squareSignature || isWebhookRoute) {
    // This is a Square webhook. Let it pass through to the API route directly.
    console.log(`[Middleware] Bypassing auth for ${request.nextUrl.pathname} (Signature: ${!!squareSignature}, Route Match: ${isWebhookRoute})`);
    return NextResponse.next();
  }
  // --- END OF FIX ---
  // --- END OF FIX ---

  // --- All other requests (from normal users) will continue to the auth check ---

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  const { data: { session } } = await supabase.auth.getSession();
  const { pathname } = request.nextUrl;

  // If user is not logged in and not on the login page, redirect to login
  if (!session && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user IS logged in and tries to go to the login page, redirect to dashboard
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

// Config can remain the same. Our code is now smarter than the matcher.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};