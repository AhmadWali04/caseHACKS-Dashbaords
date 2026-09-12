'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export type Question = {
  id: string;
  question_text: string;
  question_type: 'text' | 'long_text' | 'number' | 'multiple_choice' | 'checkbox' | 'url';
  options: string[] | null;
  sort_order: number;
  is_required: boolean;
  created_at: string;
  field_key: string | null;
};

export type NewQuestion = Omit<Question, 'id' | 'created_at'>;

export async function getQuestions() {
  const { data, error } = await supabase
    .from('application_questions')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }

  return data as Question[];
}

export async function createQuestion(question: NewQuestion) {
  const { data, error } = await supabase
    .from('application_questions')
    .insert([question])
    .select()
    .single();

  if (error) {
    console.error('Error creating question:', error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/questions');
  return data;
}

export async function updateQuestion(id: string, updates: Partial<NewQuestion>) {
  const { data, error } = await supabase
    .from('application_questions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating question:', error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/questions');
  return data;
}

export async function deleteQuestion(id: string) {
  const { error } = await supabase
    .from('application_questions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting question:', error);
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/questions');
}

export async function updateQuestionOrder(items: { id: string; sort_order: number }[]) {
  // We can't do a bulk update easily with different values in one query without a custom RPC or multiple queries.
  // For now, let's do multiple updates. It's not efficient for huge lists but fine for < 50 questions.
  
  // Alternatively, Supabase `upsert` can work if we provide all required fields, but we only want to update sort_order.
  // Let's loop for now, optimizing later if needed.
  
  const errors = [];
  for (const item of items) {
    const { error } = await supabase
      .from('application_questions')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id);
    if (error) errors.push(error);
  }

  if (errors.length > 0) {
    console.error('Error updating question order:', errors);
    throw new Error('Failed to update some question orders');
  }

  revalidatePath('/dashboard/questions');
}
