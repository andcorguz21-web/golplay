import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

import AdminHeader from '@/components/ui/admin/AdminHeader';
import DailyCalendar from './daily';
import WeeklyCalendar from './week';

export default function AdminCalendar() {
  const router = useRouter();
  const [view, setView] = useState<'daily' | 'weekly'>('weekly');

  // 🔐 Auth guard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login');
    });
  }, [router]);

  return (
    <>
      <AdminHeader />

      <main
        style={{
          backgroundColor: '#f9fafb',
          minHeight: '100vh',
          padding: 32,
        }}
      >
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* HEADER */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 24,
            }}
          >
            <h1 style={{ fontSize: 26, fontWeight: 600 }}>
              Calendario
            </h1>

            {/* SWITCH */}
            <div
              style={{
                display: 'flex',
                backgroundColor: 'white',
                borderRadius: 14,
                padding: 4,
                boxShadow: '0 6px 15px rgba(0,0,0,0.08)',
              }}
            >
              <SwitchButton
                active={view === 'daily'}
                onClick={() => setView('daily')}
              >
                Diario
              </SwitchButton>

              <SwitchButton
                active={view === 'weekly'}
                onClick={() => setView('weekly')}
              >
                Semanal
              </SwitchButton>
            </div>
          </div>

          {/* VIEW */}
          {view === 'daily' ? <DailyCalendar /> : <WeeklyCalendar />}
        </div>
      </main>
    </>
  );
}

/* ===================== */
/* UI */
/* ===================== */

function SwitchButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 18px',
        borderRadius: 12,
        border: 'none',
        backgroundColor: active ? '#111827' : 'transparent',
        color: active ? 'white' : '#374151',
        fontSize: 14,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
    >
      {children}
    </button>
  );
}
