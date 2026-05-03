// hooks/usePlatformAdmin.ts
// Hook para detectar si el usuario logueado es super-admin de GolPlay.
// Lo usamos para:
//   - mostrar TODOS los torneos en /admin/tournaments (no solo los del owner)
//   - habilitar el toggle "Complejo registrado / Venue externo" en el form
//   - mostrar banners de "operando como super-admin"

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type State = {
  isAdmin: boolean;
  loading: boolean;
  userId: string | null;
};

const INITIAL: State = { isAdmin: false, loading: true, userId: null };

export function usePlatformAdmin() {
  const [state, setState] = useState<State>(INITIAL);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) setState({ isAdmin: false, loading: false, userId: null });
        return;
      }

      const { data, error } = await supabase
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        // No bloqueamos la app si la query falla — asumimos no-admin.
        console.error('usePlatformAdmin error:', error);
        setState({ isAdmin: false, loading: false, userId: user.id });
        return;
      }

      setState({ isAdmin: !!data, loading: false, userId: user.id });
    }

    check();

    // Re-chequear si cambia la sesión (login / logout)
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) check();
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return state;
}