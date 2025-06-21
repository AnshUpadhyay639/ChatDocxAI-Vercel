import { supabase } from './supabaseClient';

export interface Chat {
  id: string;
  user_id: string;
  role: string;
  content: string;
  created_at: string;
}

export async function fetchUserChats(userId: string): Promise<Chat[]> {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) {
    console.error('Supabase fetchUserChats error:', error);
    throw error;
  }
  if (!data) {
    console.error('Supabase fetchUserChats: No data returned');
    throw new Error('No data returned from Supabase');
  }
  console.log('Supabase fetchUserChats data:', data);
  return data as Chat[];
}

export async function saveUserChat(userId: string, role: string, content: string) {
  const { data, error } = await supabase
    .from('chats')
    .insert([{ user_id: userId, role, content }]);
  if (error) throw error;
  return data;
}

export async function deleteAllUserChats(userId: string) {
  const { data, error } = await supabase
    .from('chats')
    .delete()
    .eq('user_id', userId);
  console.log('deleteAllUserChats result:', { data, error });
  if (error) throw error;
}
