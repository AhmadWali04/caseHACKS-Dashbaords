import * as actions from './actions';
import { createAdminClient } from '@/lib/supabase';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Approve Organizers | CaseHacks',
};

export const dynamic = 'force-dynamic';

type AuthUser = {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
};

async function getApprovalData() {
  const supabaseAdmin = createAdminClient();

  const { data: approved } = await supabaseAdmin
    .from('approved_organizers')
    .select('email, approved_at, approved_by, notes')
    .order('approved_at', { ascending: false });

  // Use RPC function to query auth.users (direct queries don't work)
  const { data: users } = await supabaseAdmin.rpc('get_auth_users') as { data: AuthUser[] | null };

  const approvedEmails = new Set((approved ?? []).map((entry) => entry.email?.toLowerCase()));
  const pending = (users ?? []).filter((user: AuthUser) => {
    if (!user.email) return false;
    return !approvedEmails.has(user.email.toLowerCase());
  });

  return {
    approved: approved ?? [],
    pending,
  };
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default async function ApproveOrganizersPage() {
  const { approved, pending } = await getApprovalData();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-wide text-primary/70 font-semibold">
            Admin
          </p>
          <h1 className="text-4xl font-bold text-primary">Approve Organizers</h1>
          <p className="text-foreground/70">
            Only <strong>jaedon.visva@casehacks.ca</strong> can see this page. Approvals take effect instantly.
          </p>
        </header>

        <section className="bg-card border border-border rounded-xl shadow divide-y divide-border">
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-foreground">Pending Requests</h2>
            <p className="text-sm text-foreground/60 mt-1">
              Users who signed up but are not yet approved.
            </p>
          </div>

          <div className="p-6">
            {pending.length === 0 ? (
              <p className="text-sm text-foreground/60">No pending requests.</p>
            ) : (
              <div className="space-y-4">
                {pending.map((user) => (
                  <div
                    key={user.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-background rounded-lg border border-border"
                  >
                    <div>
                      <p className="font-medium text-foreground">{user.email}</p>
                      <p className="text-xs text-foreground/50">
                        Joined {formatDate(user.created_at)} · Last active {formatDate(user.last_sign_in_at)}
                      </p>
                    </div>
                    <form action={actions.approveOrganizerQuick} className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      <input type="hidden" name="email" value={user.email ?? ''} />
                      <input
                        type="text"
                        name="notes"
                        placeholder="Notes (optional)"
                        className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                      >
                        Approve
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl shadow divide-y divide-border">
          <div className="p-6 flex flex-col gap-1">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Manual Approval</h2>
              <p className="text-sm text-foreground/60">
                Approve someone directly by email, even if they haven’t signed up yet.
              </p>
            </div>
          </div>

          <div className="p-6">
            <form action={actions.approveOrganizerQuick} className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="person@example.com"
                  className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium text-foreground">Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Why you approved them (optional)"
                  className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Approve Email
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl shadow divide-y divide-border">
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-foreground">Approved Organizers</h2>
            <p className="text-sm text-foreground/60">Manage existing approvals.</p>
          </div>

          <div className="p-6 space-y-4">
            {approved.length === 0 ? (
              <p className="text-sm text-foreground/60">No approved organizers yet.</p>
            ) : (
              approved.map((entry) => (
                <div
                  key={entry.email}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-background rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium text-foreground">{entry.email}</p>
                    <p className="text-xs text-foreground/50">
                      Approved {formatDate(entry.approved_at)} by {entry.approved_by ?? '—'}
                    </p>
                    {entry.notes ? (
                      <p className="text-xs text-foreground/70 mt-1">Notes: {entry.notes}</p>
                    ) : null}
                  </div>
                  <form action={actions.revokeOrganizer} className="flex gap-3">
                    <input type="hidden" name="email" value={entry.email ?? ''} />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                    >
                      Revoke
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
