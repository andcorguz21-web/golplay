import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import Header from '../components/ui/Header';

type Field = {
  id: number;
  name: string;
  price: number;
  available?: boolean;
  isFavorite?: boolean;
};

type Booking = {
  field_id: number;
};

const HOURS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
];

export default function Home() {
  const router = useRouter();

  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchDate, setSearchDate] = useState('');
  const [searchHour, setSearchHour] = useState('');

  const [userId, setUserId] = useState<string | null>(null);

  // 🔐 Usuario logueado
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  // 🔄 Cargar canchas + favoritos
  const loadFields = async () => {
    setLoading(true);

    const { data: fieldsData, error } = await supabase
      .from('fields')
      .select('id, name, price')
      .order('name');

    if (error || !fieldsData) {
      console.error(error);
      setLoading(false);
      return;
    }

    let enriched: Field[] = fieldsData.map((f) => ({
      ...f,
      available: true,
    }));

    // ❤️ Favoritos
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
    setLoading(false);
  };

  useEffect(() => {
    loadFields();
  }, [userId]);

  // 🔍 Buscar disponibilidad
  const handleSearch = async () => {
    if (!searchDate || !searchHour) return;

    setLoading(true);

    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('field_id')
      .eq('date', searchDate)
      .eq('hour', searchHour);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const bookedIds = new Set(
      (bookings || []).map((b: Booking) => b.field_id)
    );

    setFields((prev) =>
      prev.map((field) => ({
        ...field,
        available: !bookedIds.has(field.id),
      }))
    );

    setLoading(false);
  };

  // ❤️ Toggle favorito
  const toggleFavorite = async (
    e: React.MouseEvent,
    field: Field
  ) => {
    e.stopPropagation();

    if (!userId) {
      alert('Iniciá sesión para guardar favoritos');
      return;
    }

    if (field.isFavorite) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('field_id', field.id);
    } else {
      await supabase
        .from('favorites')
        .insert({
          user_id: userId,
          field_id: field.id,
        });
    }

    loadFields();
  };

  return (
    <>
      <Header />

      <main
        style={{
          minHeight: '100vh',
          backgroundColor: '#f7f7f7',
          padding: 24,
        }}
      >
        {/* 🔍 BUSCADOR */}
        <section style={{ maxWidth: 1100, margin: '0 auto 40px' }}>
          <h1 style={{ fontSize: 28, marginBottom: 16 }}>
            Reservá tu cancha
          </h1>

          <div
            style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 16,
              display: 'flex',
              gap: 12,
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              maxWidth: 720,
            }}
          >
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              style={{ flex: 1, border: 'none', outline: 'none' }}
            />

            <select
              value={searchHour}
              onChange={(e) => setSearchHour(e.target.value)}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '10px 12px',
              }}
            >
              <option value="">Hora</option>
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>

            <button
              onClick={handleSearch}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                border: 'none',
                backgroundColor: '#16a34a',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Buscar
            </button>
          </div>
        </section>

        {/* 🏟️ CARDS */}
        <section
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 24,
          }}
        >
          {loading && <p>Cargando…</p>}

          {!loading &&
            fields.map((field) => (
              <div
                key={field.id}
                onClick={() =>
                  field.available && router.push(`/reserve/${field.id}`)
                }
                style={{
                  position: 'relative',
                  backgroundColor: 'white',
                  borderRadius: 18,
                  overflow: 'hidden',
                  cursor: field.available ? 'pointer' : 'not-allowed',
                  opacity: field.available ? 1 : 0.45,
                  boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                }}
              >
                {/* ❤️ FAVORITO */}
                <button
                  onClick={(e) => toggleFavorite(e, field)}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: 'white',
                    borderRadius: '50%',
                    width: 36,
                    height: 36,
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer',
                    fontSize: 18,
                    zIndex: 2,
                  }}
                >
                  {field.isFavorite ? '❤️' : '🤍'}
                </button>

                {/* IMAGEN */}
                <div
                  style={{
                    height: 160,
                    backgroundImage:
                      'url(https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=800&q=60)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />

                {/* INFO */}
                <div style={{ padding: 16 }}>
                  <h2 style={{ fontSize: 16, marginBottom: 6 }}>
                    {field.name}
                  </h2>

                  <p style={{ color: '#6b7280', marginBottom: 10 }}>
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
