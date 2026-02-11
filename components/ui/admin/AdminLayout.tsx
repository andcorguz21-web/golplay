import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';

type Role = 'admin' | 'owner';

export default function AdminLayout({ children }: { children: any }) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  /* ===================== */
  /* AUTH + ROLE GUARD */
  /* ===================== */
  useEffect(() => {
    const checkAccess = async () => {
      // 1️⃣ Usuario logueado
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      setUserId(user.id);

      // 2️⃣ Perfil
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        router.replace('/login');
        return;
      }

      // 3️⃣ Rol permitido
      if (!['admin', 'owner'].includes(profile.role)) {
        router.replace('/');
        return;
      }

      setRole(profile.role);
      setAllowed(true);
    };

    checkAccess();
  }, [router]);

  /* ⛔ Mientras valida, no renderiza nada */
  if (!allowed) return null;

  /* ===================== */
  /* UI */
  /* ===================== */
  return (
    <div style={layout}>
      {/* DESKTOP SIDEBAR */}
      <div className="desktop-only">
        <AdminSidebar role={role} />
      </div>

      {/* MOBILE DRAWER */}
      {open && (
        <div style={overlay} onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AdminSidebar role={role} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      {/* MAIN */}
      <div style={main}>
        <div className="mobile-only">
          <AdminTopbar onMenu={() => setOpen(true)} />
        </div>

        {/* 👉 Inyectamos role y userId a todas las páginas admin */}
        <div style={content}>
          {typeof children === 'function'
            ? children({ role, userId })
            : children}
        </div>
      </div>

      {/* RESPONSIVE STYLES */}
      <style jsx>{`
        .desktop-only {
          display: none;
        }
        .mobile-only {
          display: block;
        }

        @media (min-width: 768px) {
          .desktop-only {
            display: block;
          }
          .mobile-only {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

/* ================= STYLES ================= */

const layout = {
  display: 'flex',
  minHeight: '100vh',
  background: '#f9fafb',
};

const main = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column' as const,
};

const content = {
  padding: 24,
};

const overlay = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(0,0,0,.4)',
  zIndex: 50,
};
