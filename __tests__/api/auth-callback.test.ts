// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// The join flow must go through the accept_join_link RPC, which validates the
// invite token server-side. The old flow read a clinic id from user-writable
// metadata and wrote profiles.clinic_id/role directly (audit finding H1).

const supabase = {
  auth: {
    exchangeCodeForSession: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
  },
  rpc: vi.fn(),
  from: vi.fn(),
};

vi.mock('@supabase/ssr', () => ({ createServerClient: () => supabase }));

const { GET } = await import('@/app/auth/callback/route');

function callback(query = 'code=abc') {
  return GET(new NextRequest(`http://localhost/auth/callback?${query}`));
}

function withUser(metadata: Record<string, unknown>) {
  supabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', user_metadata: metadata } } });
}

beforeEach(() => {
  vi.clearAllMocks();
  supabase.auth.exchangeCodeForSession.mockResolvedValue({ error: null });
  supabase.auth.updateUser.mockResolvedValue({ error: null });
});

describe('/auth/callback', () => {
  it('redirects to login when no code is present', async () => {
    const res = await callback('');
    expect(res.headers.get('location')).toBe('http://localhost/auth/login');
  });

  it('goes to the dashboard when there is no pending invite', async () => {
    withUser({});
    const res = await callback();
    expect(res.headers.get('location')).toBe('http://localhost/dashboard');
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it('joins via accept_join_link and never writes profiles or clinics directly', async () => {
    withUser({ pending_join_token: 'tok-123' });
    supabase.rpc.mockResolvedValue({ data: { clinic_id: 'c1', clinic_name: 'Sunfield' }, error: null });

    const res = await callback();

    expect(supabase.rpc).toHaveBeenCalledWith('accept_join_link', { p_token: 'tok-123' });
    expect(supabase.from).not.toHaveBeenCalled();
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      data: {
        clinic_id: 'c1',
        clinic_name: 'Sunfield',
        clinic_is_active: true,
        pending_join_token: null,
        needs_onboarding: true,
      },
    });
    expect(res.headers.get('location')).toBe('http://localhost/onboarding');
  });

  it('rejects an invalid or expired invite and clears the token', async () => {
    withUser({ pending_join_token: 'bad' });
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'Invite link is invalid or has expired' } });

    const res = await callback();

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ data: { pending_join_token: null } });
    expect(res.headers.get('location')).toBe('http://localhost/auth/login?error=invalid_invite');
  });

  it('ignores the legacy pending_clinic_id metadata', async () => {
    withUser({ pending_clinic_id: 'victim-clinic' });
    const res = await callback();
    expect(supabase.rpc).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
    expect(res.headers.get('location')).toBe('http://localhost/dashboard');
  });
});
