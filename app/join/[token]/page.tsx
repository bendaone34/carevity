'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Heart, UserPlus, LogIn } from 'lucide-react';

function JoinPageContent() {
  const params = useParams();
  // Opaque invite token — validated by accept_join_link after sign-in
  const token = encodeURIComponent(params.token as string);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/30">
            <Heart className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-800 dark:text-white">Carevity</span>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sky-100 dark:bg-sky-900/30 rounded-full mb-4">
            <UserPlus className="w-8 h-8 text-sky-600 dark:text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            You&apos;ve been invited
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            You&apos;ve been invited to join an organisation on Carevity.
            Invite links expire, so use it soon.
          </p>

          <div className="space-y-3">
            <Link
              href={`/auth/signup?join=${token}`}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-md shadow-sky-500/25 transition-all duration-200"
            >
              <UserPlus className="w-5 h-5" />
              Create Account
            </Link>
            <Link
              href={`/auth/login?join=${token}`}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200"
            >
              <LogIn className="w-5 h-5" />
              Sign In to Existing Account
            </Link>
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
            Your access level will be configured by your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  );
}
