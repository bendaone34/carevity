import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login`);
  }

  const response = NextResponse.redirect(`${origin}/dashboard`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return NextResponse.redirect(`${origin}/auth/login?error=invalid_code`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  const joinToken = user?.user_metadata?.pending_join_token;

  // Carry the session cookies set above onto a different redirect target
  const redirectWithSession = (path: string) => {
    const redirect = NextResponse.redirect(`${origin}${path}`);
    response.cookies.getAll().forEach(({ name, value }) => redirect.cookies.set(name, value));
    return redirect;
  };

  if (typeof joinToken === 'string' && joinToken) {
    // The RPC validates the token (expiry, uses, revocation) and sets
    // profiles.clinic_id/role server-side. Metadata below is routing only.
    const { data, error } = await supabase.rpc('accept_join_link', { p_token: joinToken });

    if (error || !data) {
      await supabase.auth.updateUser({ data: { pending_join_token: null } });
      return redirectWithSession('/auth/login?error=invalid_invite');
    }

    await supabase.auth.updateUser({
      data: {
        clinic_id:          data.clinic_id,
        clinic_name:        data.clinic_name,
        clinic_is_active:   true,
        pending_join_token: null,
        needs_onboarding:   true,
      },
    });
    return redirectWithSession('/onboarding');
  }

  return response;
}
