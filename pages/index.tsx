import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import Header from '@/components/ui/Header';

/* ===================== */
/* TYPES */
/* ===================== */

type Field = {
  id: number;
  name: string;
  price: number;
  available?: boolean;
  isFavorite?: boolean;
};

/* ===================== */
/* MONEY FORMAT */
/* ===================== */

const formatCRC = (amount: number) =>
  `₡${amount.toLocaleString('es-CR')}`;

export default function Home() {
  const router = useRouter();
  const { field, date, hour } = router.query;

  const hasFilters = Boolean(field || date || hour);

  const [fields, setFields] = useState<Field[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  /* ===================== */
  /* USER */
  /* ===================== */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  /* ===================== */
  /* LOAD & FILTER */
  /* ===================== */
  useEffect(() => {
    if (!router.isReady) return;

    const load = async () => {
      const { data } = await supabase
        .from('fields')
        .select('id, name, price')
        .eq('active', true)
        .order('name');

      if (!data) return;

      let result: Field[] = data.map((f) => ({
        id: f.id,
        name: f.name,
        price: f.price,
        available: true,
      }));

      /* FAVORITES */
      if (userId) {
        const { data: favs } = await supabase
          .from('favorites')
          .select('field_id')
          .eq('user_id', userId);

        const favIds = new Set((favs || []).map((f) => f.field_id));

        result = result.map((f) => ({
          ...f,
          isFavorite: favIds.has(f.id),
        }));
      }

      /* AVAILABILITY */
      if (date && hour) {
        const { data: bookings } = await supabase
          .from('bookings')
          .select('field_id')
          .eq('date', date)
          .eq('hour', hour);

        const occupied = new Set((bookings || []).map(b => b.field_id));

        result = result.map((f) => ({
          ...f,
          available: !occupied.has(f.id),
        }));
      }

      /* FIELD FILTER */
      if (field) {
        result = result.filter((f) => f.id === Number(field));
      }

      setFields(result);
      setInitialized(true);
    };

    load();
  }, [router.isReady, field, date, hour, userId]);

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

    router.replace(router.asPath);
  };

  return (
    <>
      <Header />

      <main style={{ background: '#f7f7f7', padding: 32 }}>
        {/* CLEAR FILTERS */}
        {hasFilters && (
          <div style={clearWrapper}>
            <button
              style={clearBtn}
              onClick={() => router.push('/')}
            >
              ✕ Limpiar filtros
            </button>
          </div>
        )}

        {/* GRID */}
        <section style={grid}>
          {initialized &&
            fields.map((field) => (
              <div
                key={field.id}
                onClick={() =>
                  field.available && router.push(`/reserve/${field.id}`)
                }
                style={{
                  ...card,
                  opacity: field.available ? 1 : 0.6,
                  cursor: field.available ? 'pointer' : 'not-allowed',
                }}
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
                    {formatCRC(field.price)} / hora
                  </p>

                  {date && hour && (
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: field.available ? '#16a34a' : '#b91c1c',
                      }}
                    >
                      {field.available ? 'Disponible' : 'Ocupada'}
                    </span>
                  )}
                </div>
              </div>
            ))}
        </section>
      </main>
    </>
  );
}

/* ===================== */
/* STYLES */
/* ===================== */

const clearWrapper: React.CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto 16px',
  display: 'flex',
  justifyContent: 'flex-end',
};

const clearBtn: React.CSSProperties = {
  background: 'white',
  border: '1px solid #e5e7eb',
  padding: '8px 14px',
  borderRadius: 999,
  fontSize: 13,
  cursor: 'pointer',
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
  borderRadius: 30,
  overflow: 'hidden',
  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.28)',
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
