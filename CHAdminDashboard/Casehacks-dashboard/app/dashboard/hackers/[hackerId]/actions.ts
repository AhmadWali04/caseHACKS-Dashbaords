'use server';

import { createClient } from '@supabase/supabase-js';

export async function getHackerById(id: string) {
  if (!id) {
    console.error('getHackerById received an invalid ID');
    return null;
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching hacker by id:', JSON.stringify(error, null, 2));
    return null;
  }

  return data;
}
