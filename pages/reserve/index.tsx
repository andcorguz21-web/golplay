import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/ui/Header';

import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

type Field = {
  id: number;
  name: string;
  price: number;
};

const HOURS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
];

const IMAGES = [
  'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e',
  'https://images.unsplash.com/photo-1521412644187-c49fa049e84d',
  'https://images.unsplash.com/photo-1509027572446-af8401acfdc3',
];

export default function ReserveField() {
  const router = useRouter();
  const fieldId = Number(router.query.id);

  const [field, setField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState<Date>();
  const [hour, setHour] = useState('');
  const [bookedHours, setBookedHours] = useState<string[]>([]);

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!fieldId) return;

    supabase
      .from('fields')
      .select('id, name, price')
      .eq('id', fieldId)
      .single()
      .then(({ data }) => {
        setField(data);
        setLoading(false);
      });
  }, [fieldId]);

  useEffect(() => {
    if (!fieldId || !date) return;

    supabase
      .from('bookings')
      .select('hour')
      .eq('field_id', fieldId)
      .eq('date', date.toISOString().split('T')[0])
      .eq('status', 'active')
      .then(({ data }) => {
        setBookedHours((data || []).map((b) => b.hour));
      });
  }, [fieldId, date]);

  const confirmReserve = async () => {
    if (!date || !hour || !email) return;

    setSending(true);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-booking`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({
          email,
          field_id: fieldId,
          date: date.toISOString().split('T')[0],
          hour,
        }),
      }
    );

    const data = await res.json();
    setSending(false);

    if (!res.ok || !data.ok) {
      alert(data?.error ?? 'No se pudo completar la reserva');
      return;
    }

    alert('Reserva confirmada ⚽ Revisá tu correo');
    router.push('/');
  };

  if (loading || !field) {
    return (
      <>
        <Header />
        <main />
      </>
    );
  }

  return (
    <>
      <Header />

      <main style={{ padding: 40 }}>
        <h1>{field.name}</h1>
        <p>₡{field.price}</p>

        <DayPicker
          mode="single"
          selected={date}
          onSelect={(d) => {
            setDate(d);
            setHour('');
          }}
        />

        {date && (
          <div style={{ marginTop: 16 }}>
            {HOURS.map((h) => (
              <button
                key={h}
                disabled={bookedHours.includes(h)}
                onClick={() => setHour(h)}
                style={{ margin: 4 }}
              >
                {h}
              </button>
            ))}
          </div>
        )}

        {date && hour && (
          <>
            <input
              type="email"
              placeholder="tu correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ display: 'block', marginTop: 16 }}
            />

            <button
              onClick={confirmReserve}
              disabled={sending}
              style={{ marginTop: 16 }}
            >
              {sending ? 'Reservando…' : 'Confirmar reserva'}
            </button>
          </>
        )}
      </main>
    </>
  );
}
