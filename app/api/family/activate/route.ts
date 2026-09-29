import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
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

    if (!user.user_metadata?.is_family_member) {
      return NextResponse.json({ error: 'Not a family member account' }, { status: 403 });
    }

    const familyMemberId = user.user_metadata.family_member_id;
    if (!familyMemberId) {
      return NextResponse.json({ error: 'Missing family_member_id in account metadata' }, { status: 400 });
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Verify the invite was sent to this user's email address.
    // This prevents a user from claiming a pending invite that was not meant for them
    // by changing their own family_member_id metadata.
    const { error: updateError } = await adminClient
      .from('family_members')
      .update({ user_id: user.id, status: 'active' })
      .eq('id', familyMemberId)
      .eq('email', user.email!)   // invite must match the authenticated user's email
      .is('user_id', null);       // prevent re-activation of already-claimed records

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
