import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '../../components/ui/Header';

type Field = {
  id: number;
  name: string;
  price: number;
};

const HOURS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
];

const IMAGES = [
  'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=1200&q=60',
  'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=1200&q=60',
  'https://images.unsplash.com/photo-1509027572446-af8401acfdc3?auto=format&fit=crop&w=1200&q=60',
  'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=60',
];

const DESCRIPTION = `
Cancha de fútbol 5 en excelentes condiciones, ideal para partidos amistosos,
entrenamientos o ligas recreativas. Iluminación profesional, superficie sintética
de alta calidad y ambiente seguro.
`;

const RULES = [
  'Llegar 10 minutos antes de la hora reservada',
  'Uso obligatorio de tacos sintéticos',
  'Prohibido fumar dentro de la cancha',
  'No se permite consumo de alcohol',
  'Cuidar las instalaciones',
];

export default function ReserveField() {
  const router = useRouter();
  const { id } = router.query;

  const [field, setField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState('');
  const [hour, setHour] = useState('');
  const [bookedHours, setBookedHours] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState(0);

  const [isMobile, setIsMobile] = useState(false);

  // 📱 Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 🔄 Cargar cancha
  useEffect(() => {
    if (!id) return;

    supabase
      .from('fields')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setField(data);
        setLoading(false);
      });
  }, [id]);

  // 🔄 Cargar horas ocupadas
  useEffect(() => {
    if (!id || !date) return;

    supabase
      .from('bookings')
      .select('hour')
      .eq('field_id', id)
      .eq('date', date)
      .then(({ data }) => {
        setBookedHours((data || []).map((b) => b.hour));
      });
  }, [id, date]);

  const handleReserve = async () => {
    if (!date || !hour) return;

    const { error } = await supabase.from('bookings').insert({
      field_id: id,
      date,
      hour,
    });

    if (error) {
      alert('No se pudo completar la reserva');
    } else {
      alert('Reserva confirmada ⚽');
      router.push('/');
    }
  };

  if (loading || !field) {
    return <p style={{ padding: 20 }}>Cargando…</p>;
  }

  return (
    <>
      <Header />

      <main
        style={{
          backgroundColor: '#f7f7f7',
          padding: isMobile ? '40px 20px 120px' : '40px 20px',
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr',
            gap: 40,
          }}
        >
          {/* COLUMNA PRINCIPAL */}
          <div>
            {/* GALERÍA */}
            <div style={{ marginBottom: 24 }}>
              <div
                style={{
                  height: 320,
                  backgroundImage: `url(${IMAGES[activeImage]})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: 20,
                }}
              />

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                {IMAGES.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveImage(i)}
                    style={{
                      width: 80,
                      height: 55,
                      backgroundImage: `url(${img})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: 8,
                      cursor: 'pointer',
                      border:
                        activeImage === i
                          ? '2px solid #16a34a'
                          : '2px solid transparent',
                    }}
                  />
                ))}
              </div>
            </div>

            <h1 style={{ fontSize: 26 }}>{field.name}</h1>
            <p style={{ color: '#6b7280', marginBottom: 24 }}>
              ₡{field.price} por hora
            </p>

            {/* DESCRIPCIÓN */}
            <section style={{ marginBottom: 24 }}>
              <h3>Descripción</h3>
              <p style={{ color: '#374151', lineHeight: 1.6 }}>
                {DESCRIPTION}
              </p>
            </section>

            {/* REGLAS */}
            <section>
              <h3>Reglas</h3>
              <ul>
                {RULES.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </section>
          </div>

          {/* CTA LATERAL (DESKTOP) */}
          {!isMobile && (
            <aside
              style={{
                position: 'sticky',
                top: 120,
                backgroundColor: 'white',
                padding: 24,
                borderRadius: 20,
                boxShadow: '0 15px 35px rgba(0,0,0,0.1)',
                height: 'fit-content',
              }}
            >
              <p style={{ fontSize: 20, fontWeight: 600 }}>
                ₡{field.price}{' '}
                <span style={{ fontSize: 14, color: '#6b7280' }}>
                  / hora
                </span>
              </p>

              <div style={{ marginTop: 16 }}>
                <label>Fecha</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setHour('');
                  }}
                  style={inputStyle}
                />
              </div>

              {date && (
                <div style={{ marginTop: 16 }}>
                  <label>Hora</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {HOURS.map((h) => {
                      const disabled = bookedHours.includes(h);
                      return (
                        <button
                          key={h}
                          disabled={disabled}
                          onClick={() => setHour(h)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: '1px solid #e5e7eb',
                            backgroundColor:
                              hour === h ? '#16a34a' : 'white',
                            color:
                              hour === h
                                ? 'white'
                                : disabled
                                ? '#9ca3af'
                                : '#111827',
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.5 : 1,
                          }}
                        >
                          {h}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={handleReserve}
                disabled={!date || !hour}
                style={{
                  marginTop: 24,
                  width: '100%',
                  padding: 14,
                  borderRadius: 14,
                  border: 'none',
                  backgroundColor:
                    date && hour ? '#16a34a' : '#9ca3af',
                  color: 'white',
                  fontSize: 16,
                  cursor:
                    date && hour ? 'pointer' : 'not-allowed',
                }}
              >
                Reservar
              </button>
            </aside>
          )}
        </div>

        {/* CTA MOBILE */}
        {isMobile && (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'white',
              borderTop: '1px solid #e5e7eb',
              padding: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              zIndex: 100,
            }}
          >
            <div>
              <p style={{ fontSize: 16, fontWeight: 600 }}>
                ₡{field.price}
                <span style={{ fontSize: 13, color: '#6b7280' }}>
                  {' '}
                  / hora
                </span>
              </p>

              {date && hour && (
                <p style={{ fontSize: 13, color: '#6b7280' }}>
                  {date} · {hour}
                </p>
              )}
            </div>

            <button
              onClick={handleReserve}
              disabled={!date || !hour}
              style={{
                padding: '12px 18px',
                borderRadius: 12,
                border: 'none',
                backgroundColor:
                  date && hour ? '#16a34a' : '#9ca3af',
                color: 'white',
                fontSize: 15,
                cursor:
                  date && hour ? 'pointer' : 'not-allowed',
              }}
            >
              Reservar
            </button>
          </div>
        )}
      </main>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  marginTop: 6,
};
