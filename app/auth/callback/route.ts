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
  const pendingClinicId = user?.user_metadata?.pending_clinic_id;

  if (pendingClinicId) {
    const { data: clinic } = await supabase
      .from('clinics')
      .select('id, name, is_active')
      .eq('id', pendingClinicId)
      .single();

    if (clinic?.is_active) {
      await supabase
        .from('profiles')
        .update({ clinic_id: pendingClinicId, role: 'carer', is_onboarded: false })
        .eq('id', user!.id);

      await supabase.auth.updateUser({
        data: {
          clinic_id:        pendingClinicId,
          clinic_name:      clinic.name,
          clinic_is_active: true,
          pending_clinic_id: null,
          needs_onboarding:  true,
        },
      });

      const onboardingRedirect = NextResponse.redirect(`${origin}/onboarding`);
      response.cookies.getAll().forEach(({ name, value }) => {
        onboardingRedirect.cookies.set(name, value);
      });
      return onboardingRedirect;
    }
  }

  return response;
}
