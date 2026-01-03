import { useEffect, useState, type CSSProperties } from 'react';
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
  type?: string;
  description?: string;
  imageUrl?: string;
  features?: string[];
  hours?: string[];
  monthly_statements?: {
    status: string;
  }[];
};

/* ===================== */
/* CONSTANTS */
/* ===================== */

const ALL_HOURS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
];

/* ===================== */
/* HELPERS */
/* ===================== */

const formatCRC = (value: number) =>
  `₡${value.toLocaleString('es-CR')}`;

/* ===================== */
/* COMPONENT */
/* ===================== */

export default function AdminFields() {
  const router = useRouter();

  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  /* form */
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState('Fútbol 5');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [hours, setHours] = useState<string[]>([]);

  /* ===================== */
  /* AUTH */
  /* ===================== */

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login');
    });
  }, [router]);

  /* ===================== */
  /* LOAD */
  /* ===================== */

  const loadFields = async () => {
    setLoading(true);

    const { data } = await supabase
      .from('fields')
      .select(`
        *,
        monthly_statements (
          status
        )
      `)
      .order('id');

    setFields(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadFields();
  }, []);

  /* ===================== */
  /* HELPERS */
  /* ===================== */

  const isBlocked = (field: Field) =>
    field.monthly_statements?.some(
      (s) => s.status === 'overdue'
    );

  /* ===================== */
  /* CREATE / UPDATE */
  /* ===================== */

  const saveField = async () => {
    if (!name || !price) return;

    const payload = {
      name,
      price: Number(price),
      type,
      description,
      imageUrl,
      features,
      hours,
    };

    if (editingId) {
      await supabase.from('fields').update(payload).eq('id', editingId);
    } else {
      await supabase.from('fields').insert(payload);
    }

    resetForm();
    loadFields();
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setType('Fútbol 5');
    setDescription('');
    setImageUrl('');
    setFeatures([]);
    setHours([]);
    setShowModal(false);
  };

  /* ===================== */
  /* EDIT */
  /* ===================== */

  const editField = (field: Field) => {
    if (isBlocked(field)) return;

    setEditingId(field.id);
    setName(field.name);
    setPrice(String(field.price));
    setType(field.type || 'Fútbol 5');
    setDescription(field.description || '');
    setImageUrl(field.imageUrl || '');
    setFeatures(field.features || []);
    setHours(field.hours || []);
    setShowModal(true);
  };

  /* ===================== */
  /* DELETE */
  /* ===================== */

  const deleteField = async (id: number) => {
    if (!confirm('¿Eliminar cancha?')) return;
    await supabase.from('fields').delete().eq('id', id);
    loadFields();
  };

  /* ===================== */
  /* TOGGLES */
  /* ===================== */

  const toggle = (value: string, list: string[], set: any) => {
    set(
      list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value]
    );
  };

  return (
    <>
      <AdminHeader />

      <main style={container}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={headerRow}>
            <h1 style={pageTitle}>Canchas</h1>
            <button style={primaryBtn} onClick={() => setShowModal(true)}>
              + Agregar cancha
            </button>
          </div>

          <section style={grid}>
            {!loading &&
              fields.map((field) => (
                <div key={field.id} style={card}>
                  <div style={image} />

                  <div style={{ padding: 16 }}>
                    <h3 style={cardTitle}>{field.name}</h3>

                    {isBlocked(field) && (
                      <span style={blockedBadge}>
                        BLOQUEADA POR MOROSIDAD
                      </span>
                    )}

                    <p style={{ marginTop: 8 }}>
                      {formatCRC(field.price)} / hora
                    </p>

                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <button
                        onClick={() => editField(field)}
                        style={{
                          ...editBtn,
                          opacity: isBlocked(field) ? 0.4 : 1,
                          pointerEvents: isBlocked(field)
                            ? 'none'
                            : 'auto',
                        }}
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => deleteField(field.id)}
                        style={deleteBtn}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </section>
        </div>
      </main>

      {showModal && (
        <div style={overlay}>
          <div style={modal}>
            <h2 style={modalTitle}>
              {editingId ? 'Editar cancha' : 'Nueva cancha'}
            </h2>

            <Section title="Información básica">
              <Input label="Nombre" value={name} onChange={setName} />
              <Input
                label="Precio por hora"
                type="number"
                value={price}
                onChange={setPrice}
              />
              <Select
                label="Tipo"
                value={type}
                onChange={setType}
                options={['Fútbol 5','Fútbol 7','Fútbol 11']}
              />
            </Section>

            <Section title="Descripción">
              <textarea
                style={textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Section>

            <Section title="Características">
              <Options
                values={['Iluminación','Parqueo','Camerinos','Baños','Techada']}
                selected={features}
                onToggle={(v: string) =>
                  toggle(v, features, setFeatures)
                }
              />
            </Section>

            <Section title="Horarios disponibles">
              <Options
                values={ALL_HOURS}
                selected={hours}
                onToggle={(v: string) =>
                  toggle(v, hours, setHours)
                }
              />
            </Section>

            <div style={actions}>
              <button onClick={resetForm} style={linkBtn}>
                Cancelar
              </button>
              <button onClick={saveField} style={saveBtn}>
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
/* UI HELPERS */
/* ===================== */

const Section = ({ title, children }: any) => (
  <div style={{ marginBottom: 24 }}>
    <h3 style={sectionTitle}>{title}</h3>
    {children}
  </div>
);

const Input = ({ label, value, onChange, ...props }: any) => (
  <div style={{ marginBottom: 12 }}>
    <label style={labelStyle}>{label}</label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={input}
      {...props}
    />
  </div>
);

const Select = ({ label, value, onChange, options }: any) => (
  <div style={{ marginBottom: 12 }}>
    <label style={labelStyle}>{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={input}
    >
      {options.map((o: string) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  </div>
);

const Options = ({ values, selected, onToggle }: any) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
    {values.map((v: string) => (
      <div
        key={v}
        onClick={() => onToggle(v)}
        style={{
          padding: '8px 12px',
          borderRadius: 10,
          cursor: 'pointer',
          background: selected.includes(v)
            ? '#16a34a'
            : '#f3f4f6',
          color: selected.includes(v)
            ? 'white'
            : '#111',
          fontSize: 13,
        }}
      >
        {v}
      </div>
    ))}
  </div>
);

/* ===================== */
/* STYLES */
/* ===================== */

const container = {
  background: '#f9fafb',
  minHeight: '100vh',
  padding: 32,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
};

const pageTitle = { fontSize: 26, fontWeight: 600 };
const sectionTitle = { fontSize: 13, marginBottom: 10, color: '#374151' };
const cardTitle = { fontSize: 16, fontWeight: 600 };

const headerRow = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 30,
};

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))',
  gap: 24,
};

const card = {
  background: 'white',
  borderRadius: 18,
  boxShadow: '0 10px 25px rgba(0,0,0,.08)',
  overflow: 'hidden',
};

const image = {
  height: 140,
  background:
    'url(https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=800&q=60) center/cover',
};

const blockedBadge = {
  display: 'inline-block',
  marginTop: 6,
  padding: '4px 10px',
  borderRadius: 999,
  fontSize: 12,
  background: '#dc2626',
  color: 'white',
  fontWeight: 600,
};

const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,.4)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 100,
};

const modal: CSSProperties = {
  background: 'white',
  borderRadius: 24,
  padding: 28,
  width: 520,
  maxHeight: '85vh',
  overflowY: 'auto',
};

const modalTitle = { fontSize: 22, fontWeight: 600 };

const input = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid #e5e7eb',
};

const textarea = { ...input, height: 70 };

const labelStyle = {
  fontSize: 12,
  color: '#6b7280',
  marginBottom: 4,
};

const primaryBtn = {
  padding: '12px 18px',
  borderRadius: 12,
  background: '#2563eb',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
};

const saveBtn = {
  padding: '10px 16px',
  borderRadius: 10,
  background: '#16a34a',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
};

const editBtn = {
  background: 'none',
  border: 'none',
  color: '#2563eb',
  cursor: 'pointer',
};

const deleteBtn = {
  background: 'none',
  border: 'none',
  color: '#b91c1c',
  cursor: 'pointer',
};

const linkBtn = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
};

const actions = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 12,
};
