import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import Header from '../components/ui/Header';

type Field = {
  id: number;
  name: string;
  price: number;
};

export default function FavoritesPage() {
  const router = useRouter();

  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔐 Verificar sesión
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login');
      }
    });
  }, []);

  // 🔄 Cargar favoritos
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
          padding: 24,
        }}
      >
        <section style={{ maxWidth: 1100, margin: '0 auto' }}>
          <h1 style={{ fontSize: 26, marginBottom: 24 }}>
            Mis favoritos ❤️
          </h1>

          {loading && <p>Cargando favoritos…</p>}

          {!loading && fields.length === 0 && (
            <p>No tenés canchas guardadas aún</p>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 24,
            }}
          >
            {fields.map((field) => (
              <div
                key={field.id}
                onClick={() => router.push(`/reserve/${field.id}`)}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 18,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                }}
              >
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

                  <p style={{ color: '#6b7280' }}>
                    ₡{field.price} / hora
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
