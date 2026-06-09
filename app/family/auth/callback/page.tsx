'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Heart, Lock, Eye, EyeOff } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<'loading' | 'set-password' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    const code      = searchParams.get('code');
    const tokenHash = searchParams.get('token_hash');
    const type      = searchParams.get('type');

    async function run() {
      let user = null;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) { setErrorMsg(error.message); setPhase('error'); return; }
        const { data } = await supabase.auth.getUser();
        user = data.user;
      } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'invite' | 'email' | 'recovery' | 'email_change',
        });
        if (error) { setErrorMsg(error.message); setPhase('error'); return; }
        const { data } = await supabase.auth.getUser();
        user = data.user;
      } else {
        const hash   = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const accessToken  = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) { setErrorMsg(error.message); setPhase('error'); return; }
          const { data } = await supabase.auth.getUser();
          user = data.user;
        } else {
          setErrorMsg('This invite link has expired or is invalid. Please contact the care home to be re-invited.');
          setPhase('error');
          return;
        }
      }

      if (!user?.user_metadata?.is_family_member) {
        setErrorMsg('This invite link is not for a family portal account.');
        setPhase('error');
        return;
      }

      // Show password setup form for invite flow
      setPhase('set-password');
    }

    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) { setFormError(updateError.message); return; }

      // Activate the family_members record via API
      await fetch('/api/family/activate', { method: 'POST' });

      router.replace('/family/dashboard');
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <Heart className="w-7 h-7 text-red-500" />
          </div>
          <p className="text-red-600 dark:text-red-400 text-sm">{errorMsg}</p>
          <a href="/family/login" className="text-sky-600 dark:text-sky-400 hover:underline text-sm">
            Go to family login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl shadow-lg shadow-sky-500/30 mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Set your password</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Choose a password to secure your family portal account</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="relative">
              <Input
                label="New Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                icon={<Lock className="w-5 h-5" />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              icon={<Lock className="w-5 h-5" />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {formError && <p className="text-sm text-red-500 text-center">{formError}</p>}

            <Button type="submit" className="w-full" size="lg" isLoading={isSaving}>
              Set Password &amp; Enter Portal
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function FamilyCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallbackInner />
    </Suspense>
  );
}
