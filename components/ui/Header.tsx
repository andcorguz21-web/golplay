import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const router = useRouter();
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    // Estado inicial
    supabase.auth.getSession().then(({ data }) => {
      setLogged(!!data.session);
    });

    // Escuchar cambios de auth (login / logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLogged(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* LOGO */}
        <div
          onClick={() => router.push('/')}
          style={{
            fontSize: 20,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          GolPlay ⚽
        </div>

        {/* NAV */}
        <nav style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
          <button onClick={() => router.push('/')} style={navButton}>
            Inicio
          </button>

          {/* ❤️ FAVORITOS (solo logueado) */}
          {logged && (
            <Link href="/favorites" style={navLink}>
              ❤️ Mis favoritos
            </Link>
          )}

          {logged ? (
            <>
              <button
                onClick={() => router.push('/admin')}
                style={navButton}
              >
                Admin
              </button>

              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.push('/');
                }}
                style={logoutButton}
              >
                Salir
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/login')}
              style={navButton}
            >
              Ingresar
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

/* ================= STYLES ================= */

const navButton: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
  color: '#374151',
};

const navLink: React.CSSProperties = {
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 500,
  color: '#374151',
};

const logoutButton: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
  color: '#6b7280',
};
