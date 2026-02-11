export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';

import AdminLayout from '@/components/ui/admin/AdminLayout';
import DailyCalendar from './daily';
import WeeklyCalendar from './week';

import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

function formatLocalDate(d: Date) {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}


/* ===================== */
/* COMPONENT */
/* ===================== */

export default function AdminCalendar() {
  const router = useRouter();

  const [view, setView] = useState<'daily' | 'weekly'>('weekly');

  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });

  const [openCalendar, setOpenCalendar] = useState(false);

  /* 🔐 Auth guard */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login');
    });
  }, [router]);

  return (
    <AdminLayout>
      <main
        style={{
          backgroundColor: '#f9fafb',
          minHeight: '100vh',
          padding: 32,
        }}
      >
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* HEADER */}
          <div style={headerRow}>
            <h1 style={pageTitle}>Calendario</h1>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {/* DATE PICKER */}
              <div style={{ position: 'relative' }}>
                <button
                  style={dateButton}
                  onClick={() => setOpenCalendar(!openCalendar)}
                >
                  {formatDateLabel(selectedDate)}
                </button>

                {openCalendar && (
                  <div style={popover}>
                    <DayPicker
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (!date) return;
                        const localDate = new Date(
                          date.getFullYear(),
                          date.getMonth(),
                          date.getDate()
                        );
                        setSelectedDate(localDate);
                        setOpenCalendar(false);
                      }}
                      
                    />
                  </div>
                )}
              </div>

              {/* VIEW SWITCH */}
              <div style={switchContainer}>
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
          </div>

          {/* VIEW */}
          {view === 'daily' ? (
            <DailyCalendar
            selectedDate={formatLocalDate(selectedDate)}

            />
          ) : (
            <WeeklyCalendar
            selectedDate={formatLocalDate(selectedDate)}

            />
          )}
        </div>
      </main>
    </AdminLayout>
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

/* ===================== */
/* HELPERS */
/* ===================== */

function formatDateLabel(date: Date) {
  return date.toLocaleDateString('es-CR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/* ===================== */
/* STYLES */
/* ===================== */

const headerRow = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 24,
};

const pageTitle = {
  fontSize: 26,
  fontWeight: 600,
};

const dateButton = {
  padding: '10px 16px',
  borderRadius: 14,
  border: '1px solid #e5e7eb',
  background: 'white',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
};

const popover = {
  position: 'absolute' as const,
  top: 50,
  right: 0,
  background: 'white',
  borderRadius: 18,
  boxShadow: '0 18px 40px rgba(0,0,0,0.18)',
  padding: 16,
  zIndex: 50,
};

const switchContainer = {
  display: 'flex',
  backgroundColor: 'white',
  borderRadius: 14,
  padding: 4,
  boxShadow: '0 6px 15px rgba(0,0,0,0.08)',
};
