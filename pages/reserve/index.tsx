import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Field = {
  id: number;
  name: string;
  price: number;
  isFavorite?: boolean;
};

export default function ReserveHome() {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // 🔐 Obtener usuario logueado (si existe)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
      }
    });
  }, []);

  // 🔄 Cargar canchas + favoritos
  const loadFields = async () => {
    setLoading(true);

    const { data: fieldsData, error } = await supabase
      .from('fields')
      .select('id, name, price')
      .order('id');

    if (error || !fieldsData) {
      console.error('Error cargando canchas:', error);
      setLoading(false);
      return;
    }

    // Si no hay usuario, solo mostrar canchas
    if (!userId) {
      setFields(fieldsData);
      setLoading(false);
      return;
    }

    // Traer favoritos del usuario
    const { data: favs } = await supabase
      .from('favorites')
      .select('field_id')
      .eq('user_id', userId);

    const favIds = new Set((favs || []).map((f) => f.field_id));

    const enriched: Field[] = fieldsData.map((f) => ({
      ...f,
      isFavorite: favIds.has(f.id),
    }));

    setFields(enriched);
    setLoading(false);
  };

  useEffect(() => {
    loadFields();
  }, [userId]);

  // ❤️ Toggle favorito
  const toggleFavorite = async (field: Field) => {
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

  if (loading) {
    return <p style={{ padding: 20 }}>Cargando canchas...</p>;
  }

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>
        Canchas disponibles
      </h1>

      {fields.length === 0 && (
        <p style={{ marginTop: 16 }}>No hay canchas registradas</p>
      )}

      {/* GRID DE CANCHAS */}
      <div
        style={{
          marginTop: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 20,
        }}
      >
        {fields.map((field) => (
          <div
            key={field.id}
            style={{
              position: 'relative',
              border: '1px solid #e5e7eb',
              borderRadius: 14,
              padding: 16,
              backgroundColor: 'white',
            }}
          >
            {/* ❤️ FAVORITO */}
            <button
              onClick={() => toggleFavorite(field)}
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
              }}
            >
              {field.isFavorite ? '❤️' : '🤍'}
            </button>

            <h3 style={{ fontSize: 18, fontWeight: 600 }}>
              {field.name}
            </h3>

            <p style={{ marginTop: 8, color: '#374151' }}>
              ₡{field.price} / hora
            </p>

            <Link
              href={`/reserve/${field.id}`}
              style={{
                display: 'inline-block',
                marginTop: 14,
                padding: '10px 14px',
                backgroundColor: '#16a34a',
                color: 'white',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Ver disponibilidad
            </Link>
          </div>
        ))}
      </div>
    </main>
  );
}
