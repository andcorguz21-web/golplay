import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export function useAdminGuard() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // ⏳ Esperar sesión
      if (!session) {
        setChecking(false);
        router.replace('/login');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error || !data || data.role !== 'admin') {
        router.replace('/login');
        return;
      }

      setChecking(false);
    };

    checkAdmin();
  }, [router]);

  return { checking };
}
