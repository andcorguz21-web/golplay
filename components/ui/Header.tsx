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

  // MOBILE UI
  const [mobileMenu, setMobileMenu] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);

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
    setMobileSearch(false);
  };

  return (
    <header style={header}>
      <div style={container} ref={ref}>

        {/* LEFT → HAMBURGUER MOBILE */}
        <button
          style={burgerBtn}
          onClick={() => setMobileMenu(!mobileMenu)}
        >
          ☰
        </button>

        {/* LOGO */}
        <div style={logo} onClick={() => router.push('/')}>
          <Image src="/logo-golplay.svg" alt="GolPlay" width={195} height={95} />
        </div>

        {/* DESKTOP SEARCH BAR */}
        <div style={searchBar}>
          <Filter
            label="Buscar"
            value={field?.name ?? '⚽️ Cancha'}
            active={active === 'field'}
            onClick={() => setActive('field')}
          />
          <Divider />

          <Filter
            label="Elegir"
            value={date ? formatDate(date) : '📆 Fecha'}
            active={active === 'date'}
            onClick={() => setActive('date')}
          />
          <Divider />

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

        {/* MOBILE SEARCH ICON */}
        <button
          style={searchIcon}
          onClick={() => setMobileSearch(true)}
        >
          🔍
        </button>

        {/* NAV DESKTOP */}
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

        {/* ====== MOBILE MENU PANEL ====== */}
        {mobileMenu && (
          <div style={mobilePanel}>
            <div style={{ padding: 20 }}>
              <h3 style={mobileTitle}>Menú</h3>
              <button
                style={mobileItem}
                onClick={() => router.push('/favorites')}
              >
                ⭐ Favoritos
              </button>
              <button
                style={mobileItem}
                onClick={() => router.push('/admin')}
              >
                🏪 Mi negocio
              </button>
              <button
                style={mobileItem}
                onClick={() => router.push('/login')}
              >
                🔐 Ingresar
              </button>
            </div>
          </div>
        )}

        {/* ====== MOBILE SEARCH PANEL ====== */}
        {mobileSearch && (
          <div style={mobilePanel}>
            <div style={{ padding: 20 }}>
              <h3 style={mobileTitle}>Buscar reserva</h3>

              {/* FIELD */}
              <h4 style={mobileLabel}>Cancha</h4>
              <select
                value={field?.id ?? ''}
                onChange={(e) => {
                  const f = fields.find(x => x.id == Number(e.target.value));
                  setField(f);
                }}
                style={mobileSelect}
              >
                <option value="">Seleccionar…</option>
                {fields.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>

              {/* DATE */}
              <h4 style={mobileLabel}>Fecha</h4>
              <DayPicker mode="single" selected={date} onSelect={setDate} />

              {/* HOUR */}
              <h4 style={mobileLabel}>Hora</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {HOURS.map(h => (
                  <button
                    key={h}
                    onClick={() => setHour(h)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 999,
                      border: '1px solid #ddd',
                      background: hour === h ? '#16a34a' : 'white',
                      color: hour === h ? 'white' : '#111',
                      cursor: 'pointer'
                    }}
                  >
                    {h}
                  </button>
                ))}
              </div>

              {/* SEARCH */}
              <button
                onClick={search}
                disabled={!field || !date || !hour}
                style={{
                  marginTop: 20,
                  width: '100%',
                  padding: 14,
                  borderRadius: 12,
                  border: 'none',
                  background: '#16a34a',
                  color: 'white',
                  fontSize: 16,
                }}
              >
                Buscar
              </button>

              {/* CLOSE */}
              <button
                onClick={() => setMobileSearch(false)}
                style={{
                  marginTop: 12,
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: '#444',
                  fontSize: 14,
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
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
      style={searchBtn}
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
  padding: '12px 18px',
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  alignItems: 'center',
  position: 'relative' as const,
};

/* ========= MAIN UI ========= */

const logo = { cursor: 'pointer', justifySelf: 'center' as const };

const searchBar = {
  display: 'flex',
  alignItems: 'center',
  justifySelf: 'center' as const,
  gap: 14,
  padding: '10px 22px',
  borderRadius: 999,
  border: '1px solid #e5e7eb',
  boxShadow: '0 12px 32px rgba(0,0,0,0.08)',
};

const filter = {
  cursor: 'pointer',
  padding: '6px 8px',
  borderRadius: 12,
};

const filterLabel = {
  fontSize: 10,
  color: '#6b7280',
  display: 'block',
};

const divider = {
  width: 1,
  height: 24,
  background: '#e5e7eb',
};

const popover = {
  position: 'absolute' as const,
  top: 70,
  left: '50%',
  transform: 'translateX(-50%)',
  background: 'white',
  borderRadius: 16,
  boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
  padding: 16,
  zIndex: 100,
  minWidth: 360,
};

function Popover({ children }: any) {
  return <div style={popover}>{children}</div>;
}

const input = {
  width: '100%',
  padding: 12,
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  marginBottom: 8,
};

const option = {
  padding: 12,
  borderRadius: 10,
  cursor: 'pointer',
};

const hourGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(80px,1fr))',
  gap: 8,
};

const hourItem = {
  padding: 12,
  borderRadius: 10,
  textAlign: 'center' as const,
  cursor: 'pointer',
};

const searchBtn = {
  width: 40,
  height: 40,
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
  padding: '6px 10px',
  borderRadius: 999,
  cursor: 'pointer',
};

const primaryBtn = {
  ...navBtn,
  background: '#16a34a',
  color: 'white',
};

/* ========= MOBILE ========== */

const burgerBtn = {
  fontSize: 24,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  display: 'none',
};

/* se muestra solo en móvil */
(burgerBtn as any)['@media (max-width: 900px)'] = {
  display: 'block'
};

const searchIcon = {
  fontSize: 22,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  marginLeft: 'auto',
  display: 'none',
};

(searchIcon as any)['@media (max-width: 900px)'] = {
  display: 'block',
};

const mobilePanel = {
  position: 'fixed' as const,
  top: 0,
  right: 0,
  width: '80%',
  height: '100vh',
  background: 'white',
  zIndex: 10000,
  overflowY: 'auto' as const,
  boxShadow: '-10px 0 30px rgba(0,0,0,0.2)',
};

const mobileTitle = {
  fontSize: 20,
  fontWeight: 700,
  marginBottom: 10,
};

const mobileLabel = {
  marginTop: 14,
  fontWeight: 600,
  fontSize: 14,
};

const mobileItem = {
  display: 'block',
  width: '100%',
  padding: 10,
  fontSize: 16,
  textAlign: 'left' as const,
  background: '#f3f4f6',
  color: '#111',
  borderRadius: 8,
  border: 'none',
  marginBottom: 10,
  cursor: 'pointer',
};

const mobileSelect = {
  width: '100%',
  padding: 12,
  borderRadius: 8,
  border: '1px solid #ddd',
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
