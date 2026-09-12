'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { createAdminClient } from '@/lib/supabase';

const APPROVER_EMAIL = process.env.ADMIN_APPROVER_EMAIL ?? 'jaedon.visva@casehacks.ca';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function assertApprover() {
  const cookieStore = await cookies();

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set() {
        // No-op in server actions
      },
      remove() {
        // No-op in server actions
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.email !== APPROVER_EMAIL) {
    throw new Error('Unauthorized approver');
  }

  return user.email!;
}

async function upsertApproval(email: string, notes: string | null, approvedBy: string) {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('approved_organizers')
    .upsert(
      {
        email,
        notes,
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    );

  if (error) {
    throw new Error(error.message);
  }
}

async function deleteApproval(email: string) {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('approved_organizers')
    .delete()
    .eq('email', email);

  if (error) {
    throw new Error(error.message);
  }
}

export async function approveOrganizerQuick(formData: FormData) {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase();
  if (!email) return;

  const notes = (formData.get('notes') as string | null)?.trim() || null;

  const approver = await assertApprover();
  await upsertApproval(email, notes, approver);
  revalidatePath('/admin/approve');
}

export async function revokeOrganizer(formData: FormData) {
  const email = (formData.get('email') as string | null)?.trim().toLowerCase();
  if (!email) return;

  await assertApprover();
  await deleteApproval(email);
  revalidatePath('/admin/approve');
}
