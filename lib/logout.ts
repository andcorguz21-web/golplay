import { supabase } from '@/lib/supabase';

export async function logout() {
  await supabase.auth.signOut();
}
