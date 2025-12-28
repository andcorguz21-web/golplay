import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Field = {
  id: number;
  name: string;
  price: number;
};

export default function ReserveHome() {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFields = async () => {
      const { data, error } = await supabase
        .from('fields')
        .select('*')
        .order('id');

      if (error) {
        console.error('Error cargando canchas:', error);
      } else {
        setFields(data || []);
      }

      setLoading(false);
    };

    fetchFields();
  }, []);

  if (loading) {
    return <p style={{ padding: 20 }}>Cargando canchas...</p>;
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Canchas disponibles</h1>

      {fields.length === 0 && <p>No hay canchas registradas</p>}

      <ul style={{ marginTop: 20 }}>
        {fields.map((field) => (
          <li key={field.id} style={{ marginBottom: 12 }}>
            <strong>{field.name}</strong> – ₡{field.price}
            <br />
            <Link href={`/reserve/${field.id}`}>
              Reservar
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
