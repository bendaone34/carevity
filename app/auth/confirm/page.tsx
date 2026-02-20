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
        // Implicit flow — tokens in URL hash fragment.
        // The Supabase browser client picks up the fragment automatically and
        // fires SIGNED_IN on onAuthStateChange.
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Fragment already processed before this ran
          const { data: { user } } = await supabase.auth.getUser();
          await redirect(user);
          return;
        }

        // Wait for the client to parse the fragment
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            subscription.unsubscribe();
            const { data: { user } } = await supabase.auth.getUser();
            await redirect(user);
          }
        });

        // Safety timeout — if nothing fires after 8 s, show an error
        const timeout = setTimeout(() => {
          subscription.unsubscribe();
          setErrorMsg('This invite link has expired or is invalid. Please ask your admin to re-invite you.');
        }, 8000);

        return () => {
          subscription.unsubscribe();
          clearTimeout(timeout);
        };
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
