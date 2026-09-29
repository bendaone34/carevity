import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { patientId, name, relationship, email } = await request.json();

    if (!patientId || !name || !relationship || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify requesting user is admin or manager
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, clinic_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Only admins and managers can invite family members' }, { status: 403 });
    }

    // Verify the patient belongs to this clinic
    const { data: patient } = await supabase
      .from('patients')
      .select('id, first_name, last_name')
      .eq('id', patientId)
      .eq('clinic_id', profile.clinic_id)
      .single();

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Pre-create the family_members record (pending, no user_id yet)
    const { data: familyMember, error: insertError } = await adminClient
      .from('family_members')
      .insert({
        clinic_id: profile.clinic_id,
        patient_id: patientId,
        name,
        relationship,
        email,
        status: 'pending',
        invited_by: user.id,
      })
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'This email has already been invited for this resident' }, { status: 409 });
      }
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Send invite email via Supabase admin
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim();
    const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl}/family/auth/callback`,
      data: {
        full_name: name,
        role: 'family',
        family_member_id: familyMember.id,
        patient_id: patientId,
        clinic_id: profile.clinic_id,
        is_family_member: true,
        resident_name: `${patient.first_name} ${patient.last_name}`,
      },
    });

    if (inviteError) {
      // Rollback the family_members insert
      await adminClient.from('family_members').delete().eq('id', familyMember.id);
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json({ error: 'patientId required' }, { status: 400 });
    }

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: members, error } = await supabase
      .from('family_members')
      .select('id, name, relationship, email, status, created_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ members: members ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { memberId } = await request.json();
    if (!memberId) {
      return NextResponse.json({ error: 'memberId required' }, { status: 400 });
    }

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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, clinic_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Verify the family member belongs to the caller's clinic using the RLS-scoped
    // client. If memberId is in a different clinic, RLS returns nothing → 404.
    const { data: fm } = await supabase
      .from('family_members')
      .select('id')
      .eq('id', memberId)
      .single();

    if (!fm) {
      return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await adminClient
      .from('family_members')
      .update({ status: 'deactivated' })
      .eq('id', memberId)
      .eq('clinic_id', profile.clinic_id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
