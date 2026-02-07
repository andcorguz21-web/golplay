import { useEffect, useState, type CSSProperties } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/ui/admin/AdminLayout';

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

type FieldImage = {
  id: number;
  url: string;
  is_main: boolean;
};

/* ===================== */
/* CONSTANTS */
/* ===================== */

const ALL_HOURS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
];

const defaultImage =
  'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=800&q=60';

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

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState('Fútbol 5');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [hours, setHours] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [gallery, setGallery] = useState<FieldImage[]>([]);

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
      .select(`*, monthly_statements ( status )`)
      .order('id');

    setFields(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadFields();
  }, []);

  const isBlocked = (field: Field) =>
    field.monthly_statements?.some((s) => s.status === 'overdue');

  /* ===================== */
  /* LOAD GALLERY */
  /* ===================== */
  const loadGallery = async (fieldId: number) => {
    const { data } = await supabase
      .from('field_images')
      .select('id, url, is_main')
      .eq('field_id', fieldId)
      .order('created_at');

    setGallery(data || []);
  };

  /* ===================== */
  /* SET MAIN IMAGE */
  /* ===================== */
  const setMainImage = async (imageId: number) => {
    if (!editingId) return;

    await supabase
      .from('field_images')
      .update({ is_main: false })
      .eq('field_id', editingId);

    await supabase
      .from('field_images')
      .update({ is_main: true })
      .eq('id', imageId);

    await loadGallery(editingId);
  };

  /* ===================== */
  /* DELETE IMAGE */
  /* ===================== */
  const deleteGalleryImage = async (img: FieldImage) => {
    if (!editingId) return;
    if (!confirm('¿Eliminar esta imagen?')) return;

    await supabase.from('field_images').delete().eq('id', img.id);

    const path = img.url.split('/field-images/')[1];
    if (path) {
      await supabase.storage.from('field-images').remove([path]);
    }

    await loadGallery(editingId);
  };

  /* ===================== */
  /* UPLOAD IMAGE */
  /* ===================== */
  const uploadGalleryImage = async (e: any) => {
    try {
      if (!editingId) return;

      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      const ext = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const filePath = `fields/${fileName}`;

      const { error } = await supabase.storage
        .from('field-images')
        .upload(filePath, file);

      if (error) throw error;

      const { data } = supabase.storage
        .from('field-images')
        .getPublicUrl(filePath);

      await supabase.from('field_images').insert({
        field_id: editingId,
        url: data.publicUrl,
        is_main: false,
      });

      await loadGallery(editingId);
    } finally {
      setUploading(false);
    }
  };

  const saveField = async () => {
    if (!name || !price) return;

    const payload = {
      name,
      price: Number(price),
      description,
      features,
      hours,
    };

    const { error } = editingId
      ? await supabase.from('fields').update(payload).eq('id', editingId)
      : await supabase.from('fields').insert(payload);

    if (!error) {
      resetForm();
      loadFields();
    }
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
    setGallery([]);
    setShowModal(false);
  };

  const editField = async (field: Field) => {
    if (isBlocked(field)) return;

    setEditingId(field.id);
    setName(field.name);
    setPrice(String(field.price));
    setType(field.type || 'Fútbol 5');
    setDescription(field.description || '');
    setImageUrl(field.imageUrl || '');
    setFeatures(field.features || []);
    setHours(field.hours || []);

    await loadGallery(field.id);
    setShowModal(true);
  };

  const deleteField = async (id: number) => {
    if (!confirm('¿Eliminar cancha?')) return;
    await supabase.from('fields').delete().eq('id', id);
    loadFields();
  };

  const toggle = (value: string, list: string[], set: any) => {
    set(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  return (
    <AdminLayout>
      <main style={container}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={headerRow}>
            <h1 style={pageTitle}>Canchas</h1>
            <button style={primaryBtn} onClick={() => setShowModal(true)}>
              + Agregar cancha
            </button>
          </div>

          <section style={grid}>
            {!loading && fields.map(field => (
              <div key={field.id} style={card}>
                <div
                  style={{
                    ...image,
                    backgroundImage: `url(${field.imageUrl || defaultImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />

                <div style={{ padding: 16 }}>
                  <h3 style={cardTitle}>{field.name}</h3>

                  {isBlocked(field) && (
                    <span style={blockedBadge}>BLOQUEADA POR MOROSIDAD</span>
                  )}

                  <p style={{ marginTop: 8 }}>
                    {formatCRC(field.price)} / hora
                  </p>

                  <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button
                      onClick={() => editField(field)}
                      style={{ ...editBtn, opacity: isBlocked(field) ? 0.4 : 1 }}
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

            {gallery.length > 0 && (
              <Section title="Fotos actuales (clic para marcar principal)">
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {gallery.map(img => (
                    <div key={img.id} style={{ position: 'relative' }}>
                      <div onClick={() => setMainImage(img.id)} style={{ cursor: 'pointer' }}>
                        <img
                          src={img.url}
                          style={{
                            width: 90,
                            height: 70,
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: img.is_main
                              ? '3px solid #16a34a'
                              : '1px solid #e5e7eb',
                          }}
                        />
                      </div>

                      {img.is_main && (
                        <span style={{
                          position: 'absolute',
                          bottom: 4,
                          left: 4,
                          background: '#16a34a',
                          color: 'white',
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 6,
                        }}>
                          Principal
                        </span>
                      )}

                      <button
                        onClick={() => deleteGalleryImage(img)}
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: 18,
                          height: 18,
                          fontSize: 10,
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section title="Agregar nueva foto">
              <input type="file" accept="image/*" onChange={uploadGalleryImage} />
              {uploading && <p>Subiendo imagen…</p>}
            </Section>

            <Section title="Información básica">
              <Input label="Nombre" value={name} onChange={setName} />
              <Input label="Precio por hora" type="number" value={price} onChange={setPrice} />
              <Select label="Tipo" value={type} onChange={setType}
                options={['Fútbol 5','Fútbol 7','Fútbol 11','Tenis','Padel']}
              />
            </Section>

            <Section title="Ubicación">
              <Options
                values={['San Jose','Cartago','Heredia','Alajuela','Puntarenas','Limon','Guanacaste']}
                selected={features}
                onToggle={(v: string) => toggle(v, features, setFeatures)}
              />
            </Section>

            <Section title="Descripción">
              <textarea style={textarea} value={description} onChange={e => setDescription(e.target.value)} />
            </Section>

            <Section title="Características opcionales">
              <Options
                values={['Iluminación','Parqueo','Camerinos','Baños','Techada']}
                selected={features}
                onToggle={(v: string) => toggle(v, features, setFeatures)}
              />
            </Section>

            <Section title="Horarios disponibles">
              <Options
                values={ALL_HOURS}
                selected={hours}
                onToggle={(v: string) => toggle(v, hours, setHours)}
              />
            </Section>

            <div style={actions}>
              <button onClick={resetForm} style={linkBtn}>Cancelar</button>
              <button onClick={saveField} style={saveBtn}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

/* ===================== */
/* UI HELPERS & STYLES */
/* (SIN CAMBIOS) */
/* ===================== */

const Section = ({ title, children }: any) => (
  <div style={{ marginBottom: 25 }}>
    <h3 style={sectionTitle}>{title}</h3>
    {children}
  </div>
);

const Input = ({ label, value, onChange, ...props }: any) => (
  <div style={{ marginBottom: 12 }}>
    <label style={labelStyle}>{label}</label>
    <input value={value} onChange={e => onChange(e.target.value)} style={input} {...props} />
  </div>
);

const Select = ({ label, value, onChange, options }: any) => (
  <div style={{ marginBottom: 12 }}>
    <label style={labelStyle}>{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)} style={input}>
      {options.map((o: string) => <option key={o}>{o}</option>)}
    </select>
  </div>
);

const Options = ({ values, selected, onToggle }: any) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
    {values.map((v: string) => (
      <div key={v} onClick={() => onToggle(v)} style={{
        padding: '8px 12px',
        borderRadius: 10,
        cursor: 'pointer',
        background: selected.includes(v) ? '#16a34a' : '#f3f4f6',
        color: selected.includes(v) ? 'white' : '#111',
        fontSize: 13,
      }}>
        {v}
      </div>
    ))}
  </div>
);

/* ===================== */
/* STYLES */
const container: CSSProperties = {
  background: '#f9fafb',
  minHeight: '100vh',
  padding: 32,
};

const headerRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 30,
};

const grid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))',
  gap: 24,
};

const card: CSSProperties = {
  background: 'white',
  borderRadius: 25,
  boxShadow: '0 10px 25px rgba(200, 196, 196, 0.08)',
  overflow: 'hidden',
};

const image: CSSProperties = { height: 140 };
const blockedBadge: CSSProperties = {
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
};

const modal: CSSProperties = {
  background: 'white',
  borderRadius: 25,
  padding: 25,
  width: 500,
  maxHeight: '70vh',
  overflowY: 'auto',
};

const pageTitle: CSSProperties = { fontSize: 26, fontWeight: 600 };
const sectionTitle: CSSProperties = { fontSize: 13, marginBottom: 10 };
const cardTitle: CSSProperties = { fontSize: 16, fontWeight: 600 };
const modalTitle: CSSProperties = { fontSize: 22, fontWeight: 600 };
const input: CSSProperties = { width: '96%', padding: '12px 14px', borderRadius: 15 };
const textarea: CSSProperties = { ...input, height: 70 };
const labelStyle: CSSProperties = { fontSize: 12, color: '#6b7280' };
const primaryBtn: CSSProperties = { padding: '12px 18px', borderRadius: 12 };
const saveBtn: CSSProperties = { padding: '10px 16px', borderRadius: 10 };
const editBtn: CSSProperties = { background: 'none', border: 'none', cursor: 'pointer' };
const deleteBtn: CSSProperties = { background: 'none', border: 'none', cursor: 'pointer' };
const linkBtn: CSSProperties = { background: 'none', border: 'none', cursor: 'pointer' };
const actions: CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 12 };
