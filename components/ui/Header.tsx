import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const router = useRouter();
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLogged(!!data.session);
    });
  }, []);

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
          maxWidth: 1280,
          margin: '0 auto',
          padding: '22px 28px', // 🔥 MÁS ALTO
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* LOGO */}
        <div
          onClick={() => router.push('/')}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = 'scale(1.06)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = 'scale(1)')
          }
        >
          <Image
            src="/logo-golplay.svg"
            alt="GolPlay"
            width={350}   // ⬅️ MÁS GRANDE
            height={95}   // ⬅️ MÁS ALTO
            priority
          />
        </div>

        {/* NAV */}
        <nav style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <NavButton onClick={() => router.push('/')}>
            Inicio
          </NavButton>

          <NavButton onClick={() => router.push('/favorites')}>
            Mis Favoritos ❤️
          </NavButton>

          {logged ? (
            <NavButton onClick={() => router.push('/admin')}>
              Ver mi negocio
            </NavButton>
          ) : (
            <NavButton onClick={() => router.push('/login')}>
              Ingresar
            </NavButton>
          )}
        </nav>
      </div>
    </header>
  );
}

/* ===================== */
/* NAV BUTTON */
/* ===================== */

function NavButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 14,        // ⬅️ un poco más grande
        fontWeight: 500,
        color: '#111827',
        padding: '10px 14px',
        borderRadius: 999,
        transition: 'background-color 0.15s ease',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.backgroundColor = '#f3f4f6')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.backgroundColor = 'transparent')
      }
    >
      {children}
    </button>
  );
}
