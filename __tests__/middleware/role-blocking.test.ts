// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Carers must not reach admin/manager-only pages. The audit trail contains
// every resident's full history, so /audit joins /alerts and /reports.

let role = 'carer';
const supabase = {
  auth: {
    getUser: vi.fn(async () => ({
      data: { user: { id: 'u1', user_metadata: { clinic_id: 'c1' } } },
    })),
  },
  from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { role } }) }) }) }),
};

vi.mock('@supabase/ssr', () => ({ createServerClient: () => supabase }));

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://supabase.test';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';

const { middleware } = await import('@/middleware');

const visit = (p: string) => middleware(new NextRequest(`http://localhost${p}`));

beforeEach(() => { role = 'carer'; });

describe('middleware role blocking', () => {
  it.each(['/audit', '/alerts', '/reports'])('redirects carers away from %s', async (p) => {
    const res = await visit(p);
    expect(res.headers.get('location')).toBe('http://localhost/dashboard');
  });

  it.each(['admin', 'manager'])('lets a %s open /audit', async (r) => {
    role = r;
    const res = await visit('/audit');
    expect(res.headers.get('location')).toBeNull();
  });

  it('sends signed-out visitors to login', async () => {
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } } as never);
    const res = await visit('/audit');
    expect(res.headers.get('location')).toBe('http://localhost/auth/login');
  });
});
