import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import Header from '@/components/ui/Header';

type Field = {
  id: number;
  name: string;
  price: number;
  available?: boolean;
  isFavorite?: boolean;
};

const HOURS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
];

export default function Home() {
  const router = useRouter();

  const [fields, setFields] = useState<Field[]>([]);
  const [filtered, setFiltered] = useState<Field[]>([]);
  const [initialized, setInitialized] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);

  /* filtros */
  const [searchText, setSearchText] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [hour, setHour] = useState<string | null>(null);

  /* dropdowns */
  const [openCalendar, setOpenCalendar] = useState(false);
  const [openHour, setOpenHour] = useState(false);

  /* ===================== */
  /* USER */
  /* ===================== */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  /* ===================== */
  /* LOAD FIELDS */
  /* ===================== */
  const loadFields = async () => {
    const { data } = await supabase
      .from('fields')
      .select('id, name, price')
      .order('name');

    if (!data) return;

    let enriched: Field[] = data.map((f) => ({
      ...f,
      available: true,
    }));

    if (userId) {
      const { data: favs } = await supabase
        .from('favorites')
        .select('field_id')
        .eq('user_id', userId);

      const favIds = new Set((favs || []).map((f) => f.field_id));

      enriched = enriched.map((f) => ({
        ...f,
        isFavorite: favIds.has(f.id),
      }));
    }

    setFields(enriched);
    setFiltered(enriched);
    setInitialized(true);
  };

  useEffect(() => {
    loadFields();
  }, [userId]);

  /* ===================== */
  /* SEARCH */
  /* ===================== */
  const handleSearch = async () => {
    let base = [...fields];

    if (searchText) {
      base = base.filter((f) =>
        f.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (date && hour) {
      const { data } = await supabase
        .from('bookings')
        .select('field_id')
        .eq('date', date)
        .eq('hour', hour);

      const booked = new Set((data || []).map((b) => b.field_id));

      base = base.map((f) => ({
        ...f,
        available: !booked.has(f.id),
      }));
    }

    setFiltered(base);
  };

  /* ===================== */
  /* FAVORITE */
  /* ===================== */
  const toggleFavorite = async (
    e: React.MouseEvent,
    field: Field
  ) => {
    e.stopPropagation();

    if (!userId) return alert('Iniciá sesión');

    if (field.isFavorite) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('field_id', field.id);
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: userId, field_id: field.id });
    }

    loadFields();
  };

  return (
    <>
      <Header />

      <main style={{ background: '#f7f7f7', padding: 32 }}>
        {/* ===================== */}
        {/* AIRBNB SEARCH BAR */}
        {/* ===================== */}
        <section style={searchBar}>
          {/* ENCONTRAR CANCHA */}
          <div style={cell}>
            <label style={label}>Encontrar cancha</label>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Nombre de la cancha"
              style={input}
            />
          </div>

          {/* FECHA */}
          <div style={cell}>
            <label style={label}>Fecha</label>
            <button
              style={fakeInput}
              onClick={() => {
                setOpenCalendar(!openCalendar);
                setOpenHour(false);
              }}
            >
              {date ?? 'Seleccionar'}
            </button>

            {openCalendar && (
              <div style={popover}>
                <Calendar
                  onSelect={(d) => {
                    setDate(d);
                    setOpenCalendar(false);
                  }}
                />
              </div>
            )}
          </div>

          {/* HORA */}
          <div style={cell}>
            <label style={label}>Hora</label>
            <button
              style={fakeInput}
              onClick={() => {
                setOpenHour(!openHour);
                setOpenCalendar(false);
              }}
            >
              {hour ?? 'Seleccionar'}
            </button>

            {openHour && (
              <div style={{ ...popover, maxHeight: 220, overflowY: 'auto' }}>
                {HOURS.map((h) => (
                  <div
                    key={h}
                    style={hourItem}
                    onClick={() => {
                      setHour(h);
                      setOpenHour(false);
                    }}
                  >
                    {h}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleSearch} style={searchBtn}>
            🔍
          </button>
        </section>

        {/* ===================== */}
        {/* CARDS */}
        {/* ===================== */}
        <section style={grid}>
          {initialized &&
            filtered.map((field) => (
              <div
                key={field.id}
                onClick={() =>
                  field.available && router.push(`/reserve/${field.id}`)
                }
                style={card}
              >
                <button
                  onClick={(e) => toggleFavorite(e, field)}
                  style={favBtn}
                >
                  {field.isFavorite ? '❤️' : '🤍'}
                </button>

                <div style={image} />

                <div style={{ padding: 16 }}>
                  <h2 style={{ fontSize: 16 }}>{field.name}</h2>
                  <p style={{ color: '#6b7280' }}>
                    ₡{field.price} / hora
                  </p>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: field.available ? '#16a34a' : '#b91c1c',
                    }}
                  >
                    {field.available ? 'Disponible' : 'Ocupada'}
                  </span>
                </div>
              </div>
            ))}
        </section>
      </main>
    </>
  );
}

/* ===================== */
/* CALENDAR (AIRBNB STYLE) */
/* ===================== */

function Calendar({ onSelect }: { onSelect: (date: string) => void }) {
  const today = new Date();
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() + i);
    return d;
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 8 }}>
      {days.map((d) => {
        const value = d.toISOString().split('T')[0];
        return (
          <div
            key={value}
            onClick={() => onSelect(value)}
            style={{
              padding: 10,
              textAlign: 'center',
              borderRadius: 10,
              cursor: 'pointer',
              background: '#f3f4f6',
            }}
          >
            {d.getDate()}
          </div>
        );
      })}
    </div>
  );
}

/* ===================== */
/* STYLES (TS SAFE) */
/* ===================== */

const searchBar: React.CSSProperties = {
    maxWidth: 1100,
    margin: '0 auto 40px',
    background: 'white',
    borderRadius: 999,
    padding: 6,
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 1fr auto',
    alignItems: 'center',
    boxShadow: '0 14px 30px rgba(0,0,0,0.12)',
    position: 'relative',
  };
  
  const cell: React.CSSProperties = {
    padding: '10px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  };
  
  const label: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: '#6b7280',
  };
  
  const input: React.CSSProperties = {
    border: 'none',
    outline: 'none',
    fontSize: 14,
  };
  
  const fakeInput: React.CSSProperties = {
    background: 'none',
    border: 'none',
    textAlign: 'left',
    fontSize: 14,
    cursor: 'pointer',
  };
  
  const searchBtn: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: 'none',
    background: '#16a34a',
    color: 'white',
    fontSize: 18,
    cursor: 'pointer',
    marginRight: 6,
  };
  
  const popover: React.CSSProperties = {
    position: 'absolute',
    top: 70,
    background: 'white',
    borderRadius: 16,
    boxShadow: '0 16px 35px rgba(0,0,0,0.18)',
    padding: 12,
    zIndex: 30,
  };
  
  const hourItem: React.CSSProperties = {
    padding: '10px 14px',
    cursor: 'pointer',
    borderRadius: 10,
  };
  
  const grid: React.CSSProperties = {
    maxWidth: 1100,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 24,
  };
  
  const card: React.CSSProperties = {
    position: 'relative',
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
  };
  
  const favBtn: React.CSSProperties = {
    position: 'absolute',
    top: 14,
    right: 14,
    background: 'white',
    borderRadius: '50%',
    width: 38,
    height: 38,
    border: '1px solid #e5e7eb',
    cursor: 'pointer',
  };
  
  const image: React.CSSProperties = {
    height: 170,
    backgroundImage:
      'url(https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=800&q=60)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
  