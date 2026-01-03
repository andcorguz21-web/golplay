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
};

/* ===================== */
/* HELPERS */
/* ===================== */

const formatCRC = (value: number) =>
  `₡${value.toLocaleString('es-CR')}`;

/* ===================== */
/* COMPONENT */
/* ===================== */

export default function FavoritesPage() {
  const router = useRouter();

  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  /* ===================== */
  /* AUTH */
  /* ===================== */

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login');
      }
    });
  }, [router]);

  /* ===================== */
  /* LOAD FAVORITES */
  /* ===================== */

  useEffect(() => {
    const loadFavorites = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('favorites')
        .select(`
          field_id,
          fields (
            id,
            name,
            price
          )
        `)
        .eq('user_id', userData.user.id);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const parsed: Field[] = (data || [])
        .map((f: any) => f.fields)
        .filter(Boolean);

      setFields(parsed);
      setLoading(false);
    };

    loadFavorites();
  }, []);

  return (
    <>
      <Header />

      <main
        style={{
          minHeight: '100vh',
          backgroundColor: '#f7f7f7',
          padding: 32,
        }}
      >
        <section style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ fontSize: 26, marginBottom: 24 }}>
            Mis favoritos ❤️
          </h1>

          {/* LOADING */}
          {loading && (
            <div style={grid}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={skeletonCard} />
              ))}
            </div>
          )}

          {/* EMPTY */}
          {!loading && fields.length === 0 && (
            <div style={emptyState}>
              <p style={{ fontSize: 18, fontWeight: 600 }}>
                Aún no tenés canchas guardadas
              </p>
              <p style={{ color: '#6b7280', marginTop: 6 }}>
                Explorá canchas y guardá tus favoritas para acceder más rápido.
              </p>
            </div>
          )}

          {/* GRID */}
          {!loading && fields.length > 0 && (
            <div style={grid}>
              {fields.map((field) => (
                <div
                  key={field.id}
                  onClick={() => router.push(`/reserve/${field.id}`)}
                  style={card}
                >
                  {/* IMAGE */}
                  <div style={image} />

                  {/* INFO */}
                  <div style={{ padding: 16 }}>
                    <h2 style={{ fontSize: 16, marginBottom: 6 }}>
                      {field.name}
                    </h2>

                    <p style={{ color: '#6b7280' }}>
                      {formatCRC(field.price)} / hora
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

/* ===================== */
/* STYLES */
/* ===================== */

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 24,
};

const card: React.CSSProperties = {
  backgroundColor: 'white',
  borderRadius: 20,
  overflow: 'hidden',
  cursor: 'pointer',
  boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
};

const image: React.CSSProperties = {
  height: 170,
  backgroundImage:
    'url(https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=800&q=60)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

const skeletonCard: React.CSSProperties = {
  height: 260,
  borderRadius: 20,
  background:
    'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%)',
  backgroundSize: '400% 100%',
  animation: 'pulse 1.4s ease infinite',
};

const emptyState: React.CSSProperties = {
  background: 'white',
  borderRadius: 20,
  padding: 40,
  textAlign: 'center',
  boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
};
