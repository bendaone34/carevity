import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, fullName, role, clinicName } = await request.json();

    if (!email || !fullName || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['admin', 'manager', 'carer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Verify requesting user is an admin; derive clinicId server-side
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Always derive clinicId from the DB — never trust the request body
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, clinic_id')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can invite staff' }, { status: 403 });
    }

    const clinicId = profile.clinic_id;
    if (!clinicId) {
      return NextResponse.json({ error: 'Admin has no clinic assigned' }, { status: 400 });
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Invite user — only non-privileged display info in user_metadata
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${(process.env.NEXT_PUBLIC_SITE_URL ?? '').trim()}/auth/confirm`,
      data: {
        full_name:        fullName,
        needs_onboarding: true,
      },
    });

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    // Set privileged fields in app_metadata (service-role only — not user-writable)
    // and update the profile row the trigger just created with the correct role/clinic
    const invitedUserId = inviteData.user?.id;
    if (invitedUserId) {
      await Promise.all([
        adminClient.auth.admin.updateUserById(invitedUserId, {
          app_metadata: {
            role,
            clinic_id:   clinicId,
            clinic_name: clinicName ?? '',
          },
        }),
        adminClient
          .from('profiles')
          .update({ role, clinic_id: clinicId })
          .eq('id', invitedUserId),
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
