import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  // ── Family portal routes ──────────────────────────────────────────────────
  const familyProtectedPaths = ['/family/dashboard', '/family/care-notes', '/family/incidents', '/family/visits', '/family/messages']
  const isFamilyProtected = familyProtectedPaths.some(path => request.nextUrl.pathname.startsWith(path))
  const isFamilyPath = request.nextUrl.pathname.startsWith('/family/')

  if (isFamilyProtected && !user) {
    return NextResponse.redirect(new URL('/family/login', request.url))
  }

  // Block non-family-member accounts from the family portal
  if (isFamilyProtected && user && !user.user_metadata?.is_family_member) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
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

  if (user) {
    // ── Role-based route blocking: query DB for authoritative role ──────────
    // Never trust user_metadata.role — it is user-writable via supabase.auth.updateUser()
    const carerBlockedPaths = ['/alerts', '/reports']
    const isCarerBlocked = carerBlockedPaths.some(p => request.nextUrl.pathname.startsWith(p))

    if (isCarerBlocked) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'carer') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // Onboarding redirect (user_metadata is safe for non-security flow control here)
    if (user.user_metadata?.needs_onboarding === true) {
      if (!request.nextUrl.pathname.startsWith('/onboarding')) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }

    // Suspended clinic
    if (user.user_metadata?.clinic_is_active === false) {
      if (!request.nextUrl.pathname.startsWith('/auth')) {
        return NextResponse.redirect(new URL('/auth/login?error=suspended', request.url))
      }
    }

    // No clinic assigned yet
    if (!user.user_metadata?.clinic_id && !user.user_metadata?.is_family_member) {
      if (!request.nextUrl.pathname.startsWith('/setup')) {
        return NextResponse.redirect(new URL('/setup', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
