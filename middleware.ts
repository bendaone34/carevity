import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // If env vars are not configured, skip auth checks to avoid crashing
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ── Role-based route blocking (carer cannot access manager/admin routes) ──
  if (user) {
    const userRole = user.user_metadata?.role as string | undefined;
    const carerBlockedPaths = ['/alerts', '/reports'];
    if (userRole === 'carer' && carerBlockedPaths.some(p => request.nextUrl.pathname.startsWith(p))) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // ── Family portal routes ──────────────────────────────────────────────────
  const familyProtectedPaths = ['/family/dashboard', '/family/care-notes', '/family/incidents', '/family/visits', '/family/messages']
  const isFamilyProtected = familyProtectedPaths.some(path => request.nextUrl.pathname.startsWith(path))
  const isFamilyPath = request.nextUrl.pathname.startsWith('/family/')

  if (isFamilyProtected && !user) {
    return NextResponse.redirect(new URL('/family/login', request.url))
  }

  // Family members bypass all staff-specific checks
  if (isFamilyPath) {
    return supabaseResponse
  }

  // ── Staff / clinic routes ─────────────────────────────────────────────────
  const protectedPaths = ['/dashboard', '/patients', '/appointments', '/records', '/settings', '/setup', '/care-plans', '/daily-records', '/staff', '/onboarding', '/reports', '/medications', '/incidents', '/shifts', '/alerts', '/messages']
  const isProtected = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path))

  if (isProtected && !user) {
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // If authenticated and needs onboarding, redirect to /onboarding
  if (user && user.user_metadata?.needs_onboarding === true) {
    if (!request.nextUrl.pathname.startsWith('/onboarding')) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  // If clinic is suspended, redirect to login
  if (user && user.user_metadata?.clinic_is_active === false) {
    if (!request.nextUrl.pathname.startsWith('/auth')) {
      return NextResponse.redirect(new URL('/auth/login?error=suspended', request.url))
    }
  }

  // If authenticated but no clinic set up, redirect to /setup
  if (user && !user.user_metadata?.clinic_id && !user.user_metadata?.is_family_member) {
    if (!request.nextUrl.pathname.startsWith('/setup')) {
      return NextResponse.redirect(new URL('/setup', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
