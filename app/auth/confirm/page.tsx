'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function ConfirmInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const supabase = createClient();
    const code      = searchParams.get('code');
    const tokenHash = searchParams.get('token_hash');
    const type      = searchParams.get('type');

    async function redirect(user: { user_metadata?: Record<string, unknown> } | null) {
      if (user?.user_metadata?.needs_onboarding === true) {
        router.replace('/onboarding');
      } else {
        router.replace('/dashboard');
      }
    }

    async function run() {
      if (code) {
        // PKCE flow — code in query string
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) { setErrorMsg(error.message); return; }
        const { data: { user } } = await supabase.auth.getUser();
        await redirect(user);

      } else if (tokenHash && type) {
        // OTP flow — token_hash + type in query string
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'invite' | 'email' | 'recovery' | 'email_change',
        });
        if (error) { setErrorMsg(error.message); return; }
        const { data: { user } } = await supabase.auth.getUser();
        await redirect(user);

      } else {
        // Implicit flow — access_token in URL hash fragment.
        // Parse it manually so we always use the INVITE session, not whatever
        // session was already active in the browser (e.g. admin still logged in).
        const hash   = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken  = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) { setErrorMsg(error.message); return; }
          const { data: { user } } = await supabase.auth.getUser();
          await redirect(user);
        } else {
          setErrorMsg('This invite link has expired or is invalid. Please ask your admin to re-invite you.');
        }
      }
    }

    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <p className="text-red-600 dark:text-red-400 text-sm">{errorMsg}</p>
          <a href="/auth/login" className="text-sky-600 dark:text-sky-400 hover:underline text-sm">
            Go to login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ConfirmInner />
    </Suspense>
  );
}
