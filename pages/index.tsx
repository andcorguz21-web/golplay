import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import Header from '@/components/ui/Header';

// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';

type Field = {
  id: number;
  name: string;
  price: number;
  location: string;
  images: string[];
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=800&q=60';

const formatCRC = (amount: number) =>
  `₡${Number(amount).toLocaleString('es-CR')}`;

export default function Home() {
  const router = useRouter();

  const [fieldsByLocation, setFieldsByLocation] = useState<
    Record<string, Field[]>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('fields_with_images')
        .select('*')
        .order('name');

      console.log('📦 RAW VIEW =>', data, error);

      if (error) {
        alert(error.message);
        return;
      }

      if (!data) return;

      // Agrupar imágenes por cancha
      const map = new Map<number, Field>();

      data.forEach((row: any) => {
        if (!map.has(row.id)) {
          map.set(row.id, {
            id: row.id,
            name: row.name,
            price: row.price,
            location: row.location ?? 'Sin ubicación',
            images: [],
          });
        }

        if (row.url) {
          map.get(row.id)!.images.push(row.url);
        }
      });

      const grouped: Record<string, Field[]> = {};
      Array.from(map.values()).forEach((f) => {
        if (!grouped[f.location]) grouped[f.location] = [];
        grouped[f.location].push(f);
      });

      setFieldsByLocation(grouped);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <>
      <Header />

      <main style={{ background: '#f7f7f7', padding: 32 }}>
        {loading && <p>Cargando...</p>}

        {!loading &&
          Object.entries(fieldsByLocation).map(([location, fields]) => (
            <section
              key={location}
              style={{ maxWidth: 1100, margin: '0 auto', marginBottom: 30 }}
            >
              <h2 style={sectionTitle}>{location}</h2>

              <Swiper spaceBetween={20} slidesPerView="auto">
                {fields.map((f) => (
                  <SwiperSlide key={f.id} style={{ width: 260 }}>
                    <div
                      style={card}
                      onClick={() => router.push(`/reserve/${f.id}`)}
                    >
                      <div
                        style={{
                          ...image,
                          backgroundImage: `url(${
                            f.images[0] ?? FALLBACK_IMAGE
                          })`,
                        }}
                      />
                      <div style={{ padding: 16 }}>
                        <h3>{f.name}</h3>
                        <p style={{ color: '#6b7280' }}>
                          A partir de {formatCRC(f.price)}
                        </p>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </section>
          ))}
      </main>
    </>
  );
}

/* ===== STYLES ===== */

const sectionTitle: React.CSSProperties = {
  fontSize: 25,
  fontWeight: 700,
  marginBottom: 15,
};

const card: React.CSSProperties = {
  background: 'white',
  borderRadius: 25,
  overflow: 'hidden',
  boxShadow: '0 6px 16px rgba(201, 197, 197, 0.15)',
  cursor: 'pointer',
};

const image: React.CSSProperties = {
  height: 130,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};
