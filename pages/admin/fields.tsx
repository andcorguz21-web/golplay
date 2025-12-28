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

  const loadFields = async () => {
    const { data, error } = await supabase
      .from('fields')
      .select('*')
      .order('name');

    if (error) {
      console.error(error);
      return;
    }

    setFields(data || []);
  };

  useEffect(() => {
    loadFields();
  }, []);

  const createField = async () => {
    if (!name || !price) return;

    await supabase.from('fields').insert({
      name,
      price: Number(price),
    });

    setName('');
    setPrice('');
    loadFields();
  };

  const deleteField = async (id: number) => {
    if (!confirm('¿Eliminar cancha?')) return;
    await supabase.from('fields').delete().eq('id', id);
    loadFields();
  };

  return (
    <main style={{ padding: 20 }}>
      <h1>Canchas</h1>

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
      />
      <button onClick={createField}>Crear</button>

      <ul>
        {fields.map((f) => (
          <li key={f.id}>
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
