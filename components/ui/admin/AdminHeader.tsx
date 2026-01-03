import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

export default function AdminHeader() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        {/* LOGO */}
        <div
          onClick={() => router.push('/admin')}
          style={{
            fontSize: 20,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: '#111827',
          }}
        >
          GolPlay
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#6b7280',
            }}
          >
            Admin
          </span>
        </div>

        {/* NAV */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <NavItem label="Dashboard" path="/admin" />
          <NavItem label="Canchas" path="/admin/fields" />
          <NavItem label="Reservas" path="/admin/bookings" />
          <NavItem label="Calendario" path="/admin/calendar" />
          <NavItem label="Pagos" path="/admin/payments" />

          <button
            onClick={handleLogout}
            style={{
              marginLeft: 20,
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              color: '#111827',
              fontFamily:
                '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
            }}
          >
            Salir
          </button>
        </nav>
      </div>
    </header>
  );
}

/* ===================== */
/* NAV ITEM */
/* ===================== */

function NavItem({
  label,
  path,
}: {
  label: string;
  path: string;
}) {
  const router = useRouter();
  const active = router.pathname === path;

  return (
    <button
      onClick={() => router.push(path)}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        lineHeight: 1.4,
        color: active ? '#111827' : '#6b7280',
        paddingBottom: 4,
        borderBottom: active
          ? '2px solid #16a34a'
          : '2px solid transparent',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {label}
    </button>
  );
}
