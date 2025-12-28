import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAdminGuard } from '@/lib/useAdminGuard';

type Field = {
  id: number;
  name: string;
  price: number;
};

export default function AdminFields() {
  useAdminGuard();

  const [fields, setFields] = useState<Field[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const loadFields = async () => {
    const { data, error } = await supabase
      .from('fields')
      .select('id, name, price')
      .order('name');

    if (error) {
      console.error('ERROR CARGANDO CANCHAS', error);
      return;
    }

    setFields(data || []);
  };

  useEffect(() => {
    loadFields();
  }, []);

  const createField = async () => {
    if (!name.trim() || !price) {
      alert('Nombre y precio son obligatorios');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('fields').insert({
      name: name.trim(),
      price: Number(price),
    });

    setLoading(false);

    if (error) {
      alert('Error creando la cancha');
      console.error(error);
      return;
    }

    setName('');
    setPrice('');
    loadFields();
  };

  const deleteField = async (id: number) => {
    if (!confirm('¿Eliminar esta cancha?')) return;

    const { error } = await supabase
      .from('fields')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error eliminando la cancha');
      console.error(error);
      return;
    }

    loadFields();
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>Canchas</h1>

      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="number"
          placeholder="Precio"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          style={{ marginLeft: 8 }}
        />

        <button
          onClick={createField}
          disabled={loading}
          style={{ marginLeft: 8 }}
        >
          {loading ? 'Creando...' : 'Crear'}
        </button>
      </div>

      <ul>
        {fields.map((f) => (
          <li key={f.id} style={{ marginBottom: 6 }}>
            {f.name} – ₡{f.price}
            <button
              onClick={() => deleteField(f.id)}
              style={{ marginLeft: 10 }}
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
