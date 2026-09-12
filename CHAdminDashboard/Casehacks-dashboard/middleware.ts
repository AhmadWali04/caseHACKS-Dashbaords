import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const APPROVER_EMAIL = process.env.ADMIN_APPROVER_EMAIL ?? 'jaedon.visva@casehacks.ca';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protect /dashboard, /events, and /scan routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/events') || pathname.startsWith('/scan')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // /events and /scan only require login — no organizer approval check needed for scanning
    if (pathname.startsWith('/dashboard')) {
      // Check if user is approved organizer
      const { data: approvedOrg, error } = await supabase
        .from('approved_organizers')
        .select('email')
        .eq('email', user.email)
        .single();

      if (error || !approvedOrg) {
        return NextResponse.redirect(new URL('/access-denied', request.url));
      }
    }
  }

  // Protect admin routes for specific approver
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    if (user.email !== APPROVER_EMAIL) {
      return NextResponse.redirect(new URL('/access-denied', request.url));
    }
  }

  // Redirect authenticated users away from login/signup
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/events/:path*', '/events', '/scan/:path*', '/scan', '/login', '/signup'],
};
