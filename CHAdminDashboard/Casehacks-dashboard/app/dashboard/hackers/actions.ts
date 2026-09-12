'use server';

import { createClient } from '@supabase/supabase-js';

const PAGE_SIZE = 50;

export async function getHackers(
  page = 0,
  search = '',
  statusFilter: 'all' | 'accepted' | 'pending' = 'all',
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from('users')
    .select('id, name, email, school, status', { count: 'exact' });

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,school.ilike.%${search}%`
    );
  }

  if (statusFilter === 'accepted') {
    query = query.eq('status', 'accepted');
  } else if (statusFilter === 'pending') {
    query = query.neq('status', 'accepted');
  }

  const { data, error, count } = await query
    .order('name', { ascending: true })
    .range(from, to);

  if (error) {
    console.error('Error fetching hackers:', JSON.stringify(error, null, 2));
    return { hackers: [], total: 0 };
  }

  return { hackers: data ?? [], total: count ?? 0 };
}
