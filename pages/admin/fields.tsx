import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabase';
import { useAdminGuard } from '@/lib/useAdminGuard';
import { logout } from '@/lib/logout';

type Field = {
  id: number;
  name: string;
  price: number;
};

export default function AdminFields() {
  const { checking } = useAdminGuard();
  const router = useRouter();

  const [fields, setFields] = useState<Field[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const loadFields = async () => {
    const { data } = await supabase.from('fields').select('*').order('name');
    setFields(data || []);
  };

  useEffect(() => {
    if (!checking) loadFields();
  }, [checking]);

  if (checking) return <p style={{ padding: 20 }}>Cargando...</p>;

  return (
    <main style={{ padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h1>Canchas</h1>
        <button
          onClick={async () => {
            await logout();
            router.replace('/login');
          }}
          style={{ background: 'red', color: 'white' }}
        >
          Salir
        </button>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await supabase.from('fields').insert({
            name,
            price: Number(price),
          });
          setName('');
          setPrice('');
          loadFields();
        }}
        style={{ marginTop: 20 }}
      >
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
        <button type="submit">Crear</button>
      </form>

      <ul style={{ marginTop: 20 }}>
        {fields.map((f) => (
          <li key={f.id}>
            {f.name} – ₡{f.price}
          </li>
        ))}
      </ul>
    </main>
  );
}
