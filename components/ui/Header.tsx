import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const DayPicker = dynamic(
  () => import('react-day-picker').then(mod => mod.DayPicker),
  { ssr: false }
);

type ActiveStep = 'field' | 'date' | 'hour' | null;

export default function Header() {
  const router = useRouter();

  const [logged, setLogged] = useState(false);

  const [fields, setFields] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [field, setField] = useState<any>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [hour, setHour] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const stepRef = useRef<ActiveStep>('field');

  const HOURS = [
    '08:00','09:00','10:00','11:00','12:00',
    '13:00','14:00','15:00','16:00','17:00',
    '18:00','19:00','20:00','21:00','22:00',
  ];

  // AUTH
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLogged(!!data.session);
    });
  }, []);

  // FIELDS
  useEffect(() => {
    supabase
      .from('fields')
      .select('id, name')
      .eq('active', true)
      .order('name')
      .then(({ data }) => setFields(data || []));
  }, []);

  const filteredFields = fields.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  const closeModal = () => setOpen(false);

  const search = () => {
    router.push({
      pathname: '/',
      query: {
        field: field?.id,
        date: date?.toISOString().split('T')[0],
        hour,
      },
    });
    closeModal();
  };

  return (
    <>
      {/* HEADER */}
      <header style={header}>
        <div style={headWrap}>
          <div style={logo} onClick={() => router.push('/')}>
            <Image src="/logo-golplay.svg" alt="GolPlay" width={120} height={55} />
          </div>

          {/* Search pill */}
          <div style={pill} onClick={() => { setOpen(true); stepRef.current = 'field'; }}>
            <span style={{ fontSize: 14, color: '#6b7280' }}>¿Dónde jugamos?</span>
            <span style={{ fontSize: 18 }}>⚽</span>
          </div>

          {/* Right */}
          {logged ? (
            <button style={smallBtn} onClick={() => router.push('/admin')}>
              Mi negocio
            </button>
          ) : (
            <button style={smallBtnPrimary} onClick={() => router.push('/login')}>
              Ingresar
            </button>
          )}
        </div>
      </header>

      {/* FULLSCREEN SEARCH STEPPER */}
      {open && (
        <div style={sheet} onClick={closeModal}>
          <div style={sheetContent} onClick={(e) => e.stopPropagation()}>
            {/* STEP SWITCHING */}
            {stepRef.current === 'field' && (
              <>
                <h3 style={title}>Selecciona la cancha</h3>
                <input
                  placeholder="Buscar cancha..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={input}
                />
                <div style={optionWrap}>
                  {filteredFields.map((f) => (
                    <div
                      key={f.id}
                      style={option}
                      onClick={() => { setField(f); stepRef.current = 'date'; }}
                    >
                      {f.name}
                    </div>
                  ))}
                </div>
              </>
            )}

            {stepRef.current === 'date' && (
              <>
                <h3 style={title}>Elegí la fecha</h3>
                <DayPicker
                  mode="single"
                  selected={date}
                  onSelect={(d) => { setDate(d); stepRef.current = 'hour'; }}
                />
              </>
            )}

            {stepRef.current === 'hour' && (
              <>
                <h3 style={title}>Seleccioná la hora</h3>
                <div style={hourGrid}>
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      style={{
                        ...hourItem,
                        background: hour === h ? '#16a34a' : '#f3f4f6',
                        color: hour === h ? 'white' : '#111',
                      }}
                      onClick={() => { setHour(h); search(); }}
                    >
                      {h}
                    </div>
                  ))}
                </div>
              </>
            )}

            <button style={closeBtn} onClick={closeModal}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ============== STYLES ============== */
const header = {
  position: 'sticky' as const,
  top: 0, zIndex: 50,
  background: 'white',
  borderBottom: '1px solid #eee',
};

const headWrap = {
  maxWidth: 1280,
  margin: '0 auto',
  padding: '12px 18px',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const logo = { cursor: 'pointer', flexShrink: 0 };

const pill = {
  flex: 1,
  background: '#f3f4f6',
  borderRadius: 999,
  padding: '10px 18px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  border: '1px solid #e5e7eb',
};

const smallBtn = {
  padding: '8px 12px',
  borderRadius: 20,
  border: '1px solid #ddd',
  background: 'white',
  cursor: 'pointer',
};

const smallBtnPrimary = {
  ...smallBtn,
  background: '#16a34a',
  color: 'white',
  border: 'none',
};

const sheet = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(0,0,0,0.35)',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  zIndex: 1000,
};

const sheetContent = {
  width: '100%',
  maxWidth: 500,
  background: 'white',
  padding: 24,
  borderTopLeftRadius: 30,
  borderTopRightRadius: 30,
};

const title = { fontSize: 18, fontWeight: 600, marginBottom: 16 };

const input = {
  width: '100%',
  padding: 14,
  borderRadius: 12,
  border: '1px solid #ddd',
  marginBottom: 14,
};

const optionWrap = { maxHeight: 300, overflowY: 'auto' as const };

const option = {
  padding: 14,
  borderRadius: 12,
  cursor: 'pointer',
  fontSize: 15,
  border: '1px solid #f0f0f0',
  marginBottom: 8,
};

const hourGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))',
  gap: 12,
};

const hourItem = {
  padding: 14,
  borderRadius: 14,
  textAlign: 'center' as const,
  cursor: 'pointer',
  fontWeight: 500,
};

const closeBtn = {
  width: '100%',
  padding: 14,
  marginTop: 20,
  borderRadius: 12,
  border: 'none',
  background: '#f3f4f6',
  cursor: 'pointer',
};

