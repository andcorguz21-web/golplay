import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

type ActiveFilter = 'field' | 'date' | 'hour' | null;

export default function Header() {
  const router = useRouter();

  const [logged, setLogged] = useState(false);
  const [active, setActive] = useState<ActiveFilter>(null);

  const [fields, setFields] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [field, setField] = useState<any>(null);
  const [date, setDate] = useState<Date | undefined>();
  const [hour, setHour] = useState<string | null>(null);

  const ref = useRef<HTMLDivElement>(null);

  const HOURS = [
    '08:00','09:00','10:00','11:00','12:00',
    '13:00','14:00','15:00','16:00','17:00',
    '18:00','19:00','20:00','21:00','22:00',
  ];

  /* ===================== */
  /* AUTH */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLogged(!!data.session);
    });
  }, []);

  /* ===================== */
  /* LOAD FIELDS */
  useEffect(() => {
    supabase
      .from('fields')
      .select('id, name')
      .eq('active', true)
      .order('name')
      .then(({ data }) => setFields(data || []));
  }, []);

  /* ===================== */
  /* CLICK OUTSIDE */
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setActive(null);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filteredFields = fields.filter((f) =>
    f.name.toLowerCase().includes(query.toLowerCase())
  );

  const search = () => {
    router.push({
      pathname: '/',
      query: {
        field: field?.id,
        date: date?.toISOString().split('T')[0],
        hour,
      },
    });
    setActive(null);
  };

  return (
    <header style={header}>
      <div style={container} ref={ref}>
        {/* LOGO */}
        <div style={logo} onClick={() => router.push('/')}>
          <Image src="/logo-golplay.svg" alt="GolPlay" width={230} height={125} />
        </div>

        {/* SEARCH BAR */}
        <div style={searchBar}>
          {/* FIELD */}
          <Filter
            label="Buscar"
            value={field?.name ?? '⚽️ Cancha'}
            active={active === 'field'}
            onClick={() => setActive('field')}
          />
          <Divider />

          {/* DATE */}
          <Filter
            label="Elegir"
            value={date ? formatDate(date) : '📆 Fecha'}
            active={active === 'date'}
            onClick={() => setActive('date')}
          />
          <Divider />

          {/* HOUR */}
          <Filter
            label="Elegir"
            value={hour ?? '🕣 Hora'}
            active={active === 'hour'}
            onClick={() => setActive('hour')}
          />

          <SearchButton
            disabled={!field || !date || !hour}
            onClick={search}
          />
        </div>

        {/* NAV */}
        <nav style={nav}>
          <NavButton onClick={() => router.push('/favorites')}>
            Favoritos
          </NavButton>
          {logged ? (
            <NavButton onClick={() => router.push('/admin')}>
              Mi negocio
            </NavButton>
          ) : (
            <PrimaryButton onClick={() => router.push('/login')}>
              Ingresar
            </PrimaryButton>
          )}
        </nav>

        {/* ================= PANELS ================= */}

        {active === 'field' && (
          <Popover>
            <input
              placeholder="Buscar cancha"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={input}
            />
            {filteredFields.map((f) => (
              <div
                key={f.id}
                style={option}
                onClick={() => {
                  setField(f);
                  setQuery('');
                  setActive('date');
                }}
              >
                {f.name}
              </div>
            ))}
          </Popover>
        )}

        {active === 'date' && (
          <Popover>
            <DayPicker
              mode="single"
              selected={date}
              onSelect={(d) => {
                setDate(d);
                setActive('hour');
              }}
            />
          </Popover>
        )}

        {active === 'hour' && (
          <Popover>
            <div style={hourGrid}>
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{
                    ...hourItem,
                    background: hour === h ? '#16a34a' : '#f3f4f6',
                    color: hour === h ? 'white' : '#111',
                  }}
                  onClick={() => {
                    setHour(h);
                    setActive(null);
                  }}
                >
                  {h}
                </div>
              ))}
            </div>
          </Popover>
        )}
      </div>
    </header>
  );
}

/* ===================== */
/* COMPONENTS */

function Filter({ label, value, active, onClick }: any) {
  return (
    <div
      onClick={onClick}
      style={{
        ...filter,
        background: active ? '#f3f4f6' : 'transparent',
      }}
    >
      <span style={filterLabel}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const Divider = () => <div style={divider} />;

function SearchButton({ disabled, onClick }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...searchBtn,
        opacity: disabled ? 1 : 1,
      }}
    >
      🔍
    </button>
  );
}

/* ===================== */
/* STYLES */

const header = {
  position: 'sticky' as const,
  top: 0,
  zIndex: 50,
  background: 'white',
  borderBottom: '1px solid #e5e7eb',
};

const container = {
  maxWidth: 1280,
  margin: '0 auto',
  padding: '16px 24px',
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  alignItems: 'center',
  position: 'relative' as const,
};

const logo = { cursor: 'pointer' };

const searchBar = {
  display: 'flex',
  alignItems: 'center',
  justifySelf: 'center' as const,
  gap: 20,
  padding: '16px 28px',
  borderRadius: 999,
  border: '1px solid #e5e7eb',
  boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
};

const filter = {
  cursor: 'pointer',
  padding: '8px 12px',
  borderRadius: 16,
};

const filterLabel = {
  fontSize: 12,
  color: '#6b7280',
  display: 'block',
};

const divider = {
  width: 1,
  height: 32,
  background: '#e5e7eb',
};

const popover = {
  position: 'absolute' as const,
  top: 86,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'white',
  borderRadius: 20,
  boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
  padding: 20,
  zIndex: 100,
  minWidth: 420,
};

function Popover({ children }: any) {
  return <div style={popover}>{children}</div>;
}

const input = {
  width: '100%',
  padding: 14,
  borderRadius: 12,
  border: '1px solid #e5e7eb',
  marginBottom: 12,
};

const option = {
  padding: 14,
  borderRadius: 12,
  cursor: 'pointer',
};

const hourGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(90px,1fr))',
  gap: 12,
};

const hourItem = {
  padding: 14,
  borderRadius: 12,
  textAlign: 'center' as const,
  cursor: 'pointer',
};

const searchBtn = {
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: 'none',
  background: '#16a34a',
  color: 'white',
  cursor: 'pointer',
};

const nav = {
  display: 'flex',
  gap: 8,
};

const navBtn = {
  background: 'transparent',
  border: 'none',
  padding: '8px 14px',
  borderRadius: 999,
  cursor: 'pointer',
};

const primaryBtn = {
  ...navBtn,
  background: '#16a34a',
  color: 'white',
};

/* ===================== */
/* BUTTONS */

function NavButton({ children, onClick }: any) {
  return <button style={navBtn} onClick={onClick}>{children}</button>;
}

function PrimaryButton({ children, onClick }: any) {
  return <button style={primaryBtn} onClick={onClick}>{children}</button>;
}

function formatDate(d: Date) {
  return d.toLocaleDateString('es-CR', {
    day: 'numeric',
    month: 'long',
  });
}
