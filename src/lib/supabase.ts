import { createClient } from '@supabase/supabase-js';
import { Product, Supplier, ComparisonResult } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function processQuery(query: string) {
  const user = await supabase.auth.getUser();
  if (!user.data.user) throw new Error('Not authenticated');

  const response = await fetch(`${BACKEND_URL}/api/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      user_id: user.data.user.id,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to process query');
  }

  const data = await response.json();
  return data.content;
}

export async function searchProducts(query: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      supplier:suppliers(name, email)
    `)
    .or(`name.ilike.%${query}%,brand.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;
  return data || [];
}

export async function searchSuppliers(query: string): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .or(`name.ilike.%${query}%,categories.cs.{${query}}`)
    .limit(10);

  if (error) throw error;
  return data || [];
}

export async function compareProducts(productIds: string[]): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      supplier:suppliers(name, email)
    `)
    .in('id', productIds);

  if (error) throw error;
  return data || [];
}

export async function saveChatMessage(role: 'user' | 'assistant', content: string) {
  const { error } = await supabase
    .from('chat_messages')
    .insert([{ role, content }]);

  if (error) throw error;
}

export async function getChatHistory(): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}