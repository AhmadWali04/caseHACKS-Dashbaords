'use client';

import { createBrowserClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AccessDeniedPage() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || null);
      }
    };
    getUser();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-4">Access Denied</h1>
          <p className="text-foreground/80 mb-2">
            Your account is not approved to access this part of the dashboard.
          </p>
          {email && (
            <p className="text-sm text-foreground/60 mb-6">
              Account: <span className="font-medium">{email}</span>
            </p>
          )}
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
            <p className="text-sm text-yellow-800">
              Please contact an administrator to request access approval for the CaseHacks organizer dashboard.
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
