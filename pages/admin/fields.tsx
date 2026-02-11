import { useEffect, useState, type CSSProperties } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/ui/admin/AdminLayout';

/* ===================== */
/* TYPES */
/* ===================== */

type Field = {
  id: number
  name: string
  price: number
  price_day?: number
  price_night?: number
  night_from_hour?: number
  description?: string | null
  features?: string[] | null
  hours?: string[] | null
  location?: string | null
  active?: boolean
  status?: string
  monthly_statements?: {
    status: string
  }[] | null
};

type FieldImage = {
  id: number;
  url: string;
  is_main: boolean;
};

/* ===================== */
/* CONSTANTS */
/* ===================== */

const PROVINCES = [
  'San José',
  'Alajuela',
  'Cartago',
  'Heredia',
  'Guanacaste',
  'Puntarenas',
  'Limón',
];

const FEATURES = ['Iluminación','Parqueo','Camerinos','Baños','Techada'];

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
  const [userId, setUserId] = useState<string | null>(null);

  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [hours, setHours] = useState<string[]>([]);
  const [location, setLocation] = useState('');

  const [priceDay, setPriceDay] = useState('');
  const [priceNight, setPriceNight] = useState('');
  const [nightFromHour, setNightFromHour] = useState(18);


  const [gallery, setGallery] = useState<FieldImage[]>([]);
  const [uploading, setUploading] = useState(false);

  /* ===================== */
  /* AUTH */
  /* ===================== */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login');
        return;
      }
      setUserId(data.user.id);
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
    field.monthly_statements?.some(s => s.status === 'overdue');

  /* ===================== */
  /* GALLERY */
  /* ===================== */
  const loadGallery = async (fieldId: number) => {
    const { data } = await supabase
      .from('field_images')
      .select('*')
      .eq('field_id', fieldId)
      .order('created_at');

    setGallery(data || []);
  };

  const uploadGalleryImage = async (e: any) => {
    if (!editingId) return;
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    const ext = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `fields/${fileName}`;

    await supabase.storage.from('field-images').upload(filePath, file);
    const { data } = supabase.storage.from('field-images').getPublicUrl(filePath);

    await supabase.from('field_images').insert({
      field_id: editingId,
      url: data.publicUrl,
      is_main: false,
    });

    await loadGallery(editingId);
    setUploading(false);
  };

  const setMainImage = async (imageId: number) => {
    if (!editingId) return;

    await supabase.from('field_images')
      .update({ is_main: false })
      .eq('field_id', editingId);

    await supabase.from('field_images')
      .update({ is_main: true })
      .eq('id', imageId);

    await loadGallery(editingId);
  };

  const deleteGalleryImage = async (img: FieldImage) => {
    if (!confirm('¿Eliminar esta imagen?')) return;
    await supabase.from('field_images').delete().eq('id', img.id);
    await loadGallery(editingId!);
  };

  /* ===================== */
  /* SAVE FIELD */
  /* ===================== */
  
  const saveField = async () => {
    if (!name || !price || !userId) return;

    const payload = {
      name,
      description,
      features,
      hours,
      location,
      price_day: Number(priceDay),
      price_night: Number(priceNight),
      night_from_hour: Number(nightFromHour),
      active: true,
    };
    

    editingId
      ? await supabase.from('fields').update(payload).eq('id', editingId)
      : await supabase.from('fields').insert({ ...payload, owner_id: userId });

    resetForm();
    loadFields();
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setDescription('');
    setFeatures([]);
    setHours([]);
    setLocation('');
    setGallery([]);
    setPriceDay('');
    setPriceNight('');
    setNightFromHour(18);

    setShowModal(false);
  };

  const editField = async (field: Field) => {
    if (isBlocked(field)) return;

    setEditingId(field.id);
    setName(field.name);
    setPrice(String(field.price));
    setDescription(field.description || '');
    setFeatures(field.features || []);
    setHours(field.hours || []);
    setLocation(field.location || '');
    setPriceDay(field.price_day ? String(field.price_day) : '');
    setPriceNight(field.price_night ? String(field.price_night) : '');
    setNightFromHour(field.night_from_hour ?? 18);


    await loadGallery(field.id);
    setShowModal(true);
  };

  const deleteField = async (id: number) => {
    if (!confirm('¿Eliminar cancha?')) return;
    await supabase.from('fields').delete().eq('id', id);
    loadFields();
  };

  const toggle = (value: string, list: string[], set: any) =>
    set(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);

  /* ===================== */
  /* UI */
  /* ===================== */

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
            {fields.map(field => (
              <div key={field.id} style={card}>
                <div
                  style={{
                    ...image,
                    backgroundImage: `url(${defaultImage})`,
                  }}
                />
                <div style={{ padding: 16 }}>
                  <h3 style={cardTitle}>{field.name}</h3>
                  <p>{formatCRC(field.price)} / hora</p>

                  <div style={actionRow}>
                    <button style={editButton} onClick={() => editField(field)}>✏️ Editar</button>
                    <button style={deleteButton} onClick={() => deleteField(field.id)}>🗑 Eliminar</button>
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
            <h2 style={modalTitle}>{editingId ? 'Editar cancha' : 'Nueva cancha'}</h2>

            {gallery.length > 0 && (
  <Section title="Fotos actuales (clic para marcar principal)">
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {gallery.map(img => (
        <div key={img.id} style={{ position: 'relative' }}>
          <img
            src={img.url}
            onClick={() => setMainImage(img.id)}
            style={{
              width: 80,
              height: 60,
              objectFit: 'cover',
              borderRadius: 8,
              border: img.is_main
                ? '3px solid #16a34a'
                : '1px solid #e5e7eb',
              cursor: 'pointer',
            }}
          />

          {/* BOTÓN ELIMINAR */}
          <button
            onClick={() => deleteGalleryImage(img)}
            style={deleteImageBtn}
            title="Eliminar foto"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  </Section>
)}


            <Section title="Agregar foto">
              <input type="file" accept="image/*" onChange={uploadGalleryImage} />
              {uploading && <p>Subiendo imagen…</p>}
            </Section>

            <Section title="Información básica">
              <Input label="Nombre" value={name} onChange={setName} />
              <Input label="Precio" type="number" value={price} onChange={setPrice} />
              <Input
  label="Precio día (CRC)"
  type="number"
  value={priceDay}
  onChange={setPriceDay}
/>

<Input
  label="Precio noche (CRC)"
  type="number"
  value={priceNight}
  onChange={setPriceNight}
/>

<Select
  label="Hora inicio noche"
  value={nightFromHour}
  onChange={(v: any) => setNightFromHour(Number(v))}
  options={[
    '17', '18', '19', '20', '21'
  ]}
/>

              <Select label="Provincia" value={location} onChange={setLocation} options={PROVINCES} />
            </Section>

            <Section title="Descripción">
              <textarea style={textarea} value={description} onChange={e => setDescription(e.target.value)} />
            </Section>

            <Section title="Características">
              <Options values={FEATURES} selected={features} onToggle={(v: string) => toggle(v, features, setFeatures)} />
            </Section>

            <Section title="Horarios disponibles">
              <Options values={ALL_HOURS} selected={hours} onToggle={(v: string) => toggle(v, hours, setHours)} />
            </Section>

            <div style={actions}>
              <button style={secondaryModalBtn} onClick={resetForm}>Cancelar</button>
              <button style={primaryModalBtn} onClick={saveField}>Guardar cancha</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

/* ===================== */
/* UI HELPERS */
/* ===================== */

const Section = ({ title, children }: any) => (
  <div style={{ marginBottom: 20 }}>
    <h3 style={sectionTitle}>{title}</h3>
    {children}
  </div>
);

const Input = ({ label, value, onChange, ...props }: any) => (
  <div style={{ marginBottom: 10 }}>
    <label style={labelStyle}>{label}</label>
    <input value={value} onChange={e => onChange(e.target.value)} style={input} {...props} />
  </div>
);

const Select = ({ label, value, onChange, options }: any) => (
  <div style={{ marginBottom: 10 }}>
    <label style={labelStyle}>{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)} style={input}>
      {options.map((o: string) => <option key={o}>{o}</option>)}
    </select>
  </div>
);

const Options = ({ values, selected, onToggle }: any) => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    {values.map((v: string) => (
      <div
        key={v}
        onClick={() => onToggle(v)}
        style={{
          padding: '6px 12px',
          borderRadius: 999,
          background: selected.includes(v) ? '#16a34a' : '#e5e7eb',
          color: selected.includes(v) ? 'white' : '#111',
          cursor: 'pointer',
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

const container: CSSProperties = { background: '#f9fafb', minHeight: '100vh', padding: 32 };
const headerRow: CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: 30 };
const grid: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 24 };
const card: CSSProperties = { background: 'white', borderRadius: 20, overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,.08)' };
const image: CSSProperties = { height: 140, backgroundSize: 'cover', backgroundPosition: 'center' };
const pageTitle: CSSProperties = { fontSize: 26, fontWeight: 600 };
const cardTitle: CSSProperties = { fontSize: 16, fontWeight: 600 };
const sectionTitle: CSSProperties = { fontSize: 13, marginBottom: 8 };
const labelStyle: CSSProperties = { fontSize: 12, color: '#6b7280' };
const input: CSSProperties = { width: '100%', padding: 10, borderRadius: 12, border: '1px solid #e5e7eb' };
const textarea: CSSProperties = { ...input, height: 70 };
const primaryBtn: CSSProperties = { padding: '12px 18px', borderRadius: 12, background: '#2563eb', color: 'white', border: 'none' };
const overlay: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'flex', justifyContent: 'center', alignItems: 'center' };
const modal: CSSProperties = { background: 'white', borderRadius: 20, padding: 24, width: 520, maxHeight: '80vh', overflowY: 'auto' };
const modalTitle: CSSProperties = { fontSize: 22, fontWeight: 600, marginBottom: 12 };
const actions: CSSProperties = { display: 'flex', justifyContent: 'flex-end', gap: 12 };
const primaryModalBtn: CSSProperties = { padding: '10px 18px', borderRadius: 12, background: '#2563eb', color: 'white', border: 'none' };
const secondaryModalBtn: CSSProperties = { padding: '10px 18px', borderRadius: 12, background: '#f3f4f6', border: '1px solid #e5e7eb' };
const actionRow: CSSProperties = { display: 'flex', gap: 8, marginTop: 12 };
const editButton: CSSProperties = { padding: '6px 12px', borderRadius: 10, background: '#2563eb', color: 'white', border: 'none', fontSize: 13 };
const deleteButton: CSSProperties = { padding: '6px 12px', borderRadius: 10, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca', fontSize: 13 };
const deleteImageBtn: CSSProperties = {
  position: 'absolute',
  top: -6,
  right: -6,
  width: 18,
  height: 18,
  borderRadius: '50%',
  background: '#dc2626',
  color: 'white',
  border: 'none',
  fontSize: 11,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
