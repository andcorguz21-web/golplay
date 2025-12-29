import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';

import AdminHeader from '@/components/ui/admin/AdminHeader';

/* ===================== */
/* TYPES */
/* ===================== */

type Field = {
  id: number;
  name: string;
  price: number;
};

/* ===================== */
/* COMPONENT */
/* ===================== */

export default function AdminFields() {
  const router = useRouter();

  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  /* ===================== */
  /* AUTH */
  /* ===================== */

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login');
    });
  }, [router]);

  /* ===================== */
  /* LOAD FIELDS */
  /* ===================== */

  const loadFields = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('fields')
      .select('*')
      .order('id');

    setFields(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadFields();
  }, []);

  /* ===================== */
  /* CREATE */
  /* ===================== */

  const createField = async () => {
    if (!name || !price) return;

    const { error } = await supabase.from('fields').insert({
      name,
      price: Number(price),
    });

    if (!error) {
      setName('');
      setPrice('');
      setShowModal(false);
      loadFields();
    }
  };

  /* ===================== */
  /* DELETE */
  /* ===================== */

  const deleteField = async (id: number) => {
    const ok = confirm('¿Eliminar esta cancha? Esta acción no se puede deshacer.');
    if (!ok) return;

    await supabase.from('fields').delete().eq('id', id);
    loadFields();
  };

  return (
    <>
      <AdminHeader />

      <main
        style={{
          backgroundColor: '#f9fafb',
          minHeight: '100vh',
          padding: 32,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* ===================== */}
          {/* HEADER */}
          {/* ===================== */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 30,
            }}
          >
            <h1 style={{ fontSize: 26 }}>Canchas</h1>

            <button
              onClick={() => setShowModal(true)}
              style={{
                padding: '12px 18px',
                borderRadius: 12,
                border: 'none',
                backgroundColor: '#2563eb',
                color: 'white',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              + Agregar cancha
            </button>
          </div>

          {/* ===================== */}
          {/* GRID */}
          {/* ===================== */}
          {loading && <p>Cargando canchas…</p>}

          {!loading && fields.length === 0 && (
            <p>No hay canchas creadas</p>
          )}

          <section
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 24,
            }}
          >
            {fields.map((field) => (
              <div
                key={field.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 18,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                }}
              >
                {/* IMAGE */}
                <div
                  style={{
                    height: 140,
                    backgroundImage:
                      'url(https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=800&q=60)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />

                {/* INFO */}
                <div style={{ padding: 16 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 6 }}>
                    {field.name}
                  </h3>

                  <p style={{ color: '#6b7280', marginBottom: 12 }}>
                    ₡{field.price} / hora
                  </p>

                  <button
                    onClick={() => deleteField(field.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#b91c1c',
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    Eliminar cancha
                  </button>
                </div>
              </div>
            ))}
          </section>
        </div>
      </main>

      {/* ===================== */}
      {/* MODAL */}
      {/* ===================== */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: 20,
              padding: 24,
              width: 380,
            }}
          >
            <h2 style={{ marginBottom: 16 }}>Nueva cancha</h2>

            <input
              placeholder="Nombre de la cancha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />

            <input
              type="number"
              placeholder="Precio por hora"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              style={inputStyle}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                marginTop: 20,
              }}
            >
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>

              <button
                onClick={createField}
                style={{
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ===================== */
/* STYLES */
/* ===================== */

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  marginBottom: 12,
  fontSize: 14,
};
