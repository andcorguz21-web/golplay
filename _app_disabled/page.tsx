'use client';
console.log(
  'USING KEY:',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10)
);

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Field = {
  id: number;
  name: string;
  location: string;
  price_per_hour: number;
};

export default function Home() {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFields = async () => {
      const { data, error } = await supabase
        .from('fields')
        .select('*');

      if (error) {
        console.error('Error cargando canchas:', error);
      } else {
        setFields(data || []);
      }

      setLoading(false);
    };

    fetchFields();
  }, []);

  return (
    <main className="min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-2">GolPlay ⚽</h1>
      <p className="mb-6">Reservá tu cancha fácil y rápido</p>

      <h2 className="text-xl font-semibold mb-4">Canchas disponibles</h2>

      {loading && <p>Cargando canchas...</p>}

      {!loading && fields.length === 0 && (
        <p>No hay canchas disponibles</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <div
            key={field.id}
            className="border rounded-lg p-4 shadow"
          >
            <h3 className="text-lg font-bold">{field.name}</h3>
            <p className="text-sm text-gray-600">{field.location}</p>
            <p className="mt-2 font-semibold">
              ₡{field.price_per_hour} / hora
            </p>

            <button
  onClick={() => window.location.href = `/reserve/${field.id}`}
  className="mt-4 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
>
  Reservar
</button>
          </div>
        ))}
      </div>
    </main>
  );
}
