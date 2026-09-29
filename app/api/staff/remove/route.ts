import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { staffId } = await request.json();
    if (!staffId) return NextResponse.json({ error: 'Missing staffId' }, { status: 400 });

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
    if (user.id === staffId) {
      return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 });
    }

    // Derive role and clinicId from the DB — never trust the request body
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, clinic_id')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can remove staff' }, { status: 403 });
    }

    // Verify the target staff member belongs to the requesting admin's clinic.
    // Using the RLS-scoped client means this query returns nothing if staffId is
    // in a different clinic, preventing cross-tenant staff removal.
    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', staffId)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await Promise.all([
      adminClient.auth.admin.updateUserById(staffId, {
        user_metadata:  { clinic_id: null, clinic_name: null },
        app_metadata:   { role: 'carer', clinic_id: null, clinic_name: null },
      }),
      adminClient.from('profiles').update({ clinic_id: null }).eq('id', staffId),
    ]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
