import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

const links = [
  { label: 'Dashboard', path: '/admin' },
  { label: 'Canchas', path: '/admin/fields' },
  { label: 'Reservas', path: '/admin/bookings' },
  { label: 'Calendario', path: '/admin/calendar' },
  { label: 'Información', path: '/admin/business-model' },
  { label: 'Pagos', path: '/admin/payments' },
];

export default function AdminSidebar({ onClose }: { onClose?: () => void }) {
  const router = useRouter();

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <aside style={sidebar}>
      <h2 style={logo}>GolPlay</h2>

      <nav style={nav}>
        {links.map((l) => (
          <button
            key={l.path}
            onClick={() => {
              router.push(l.path);
              onClose?.();
            }}
            style={{
              ...navItem,
              background:
                router.pathname === l.path ? '#e5e7eb' : 'transparent',
            }}
          >
            {l.label}
          </button>
        ))}
      </nav>

      <button onClick={logout} style={logoutBtn}>
        Salir
      </button>
    </aside>
  );
}

/* ================= STYLES ================= */

const sidebar = {
  width: 240,
  height: '100vh',
  background: '#fff',
  borderRight: '1px solid #e5e7eb',
  padding: 20,
  display: 'flex',
  flexDirection: 'column' as const,
};

const logo = {
  fontSize: 20,
  fontWeight: 700,
  marginBottom: 30,
};

const nav = {
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 8,
  flex: 1,
};

const navItem = {
  textAlign: 'left' as const,
  padding: '10px 14px',
  borderRadius: 10,
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  fontSize: 14,
};

const logoutBtn = {
  marginTop: 20,
  padding: '10px 14px',
  borderRadius: 10,
  border: 'none',
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
};
