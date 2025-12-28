import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Field = {
  id: number;
  name: string;
  price: number;
};

export default function ReserveById() {
  const router = useRouter();
  const { id } = router.query;

  const [field, setField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);

  // 📅 Fecha seleccionada
  const [selectedDate, setSelectedDate] = useState('');

  // 🕒 Hora seleccionada
  const [selectedHour, setSelectedHour] = useState('');

  // 🛑 Horas ya reservadas
  const [bookedHours, setBookedHours] = useState<string[]>([]);

  // 🕒 Horarios base
  const availableHours = [
    '08:00','09:00','10:00','11:00','12:00',
    '13:00','14:00','15:00','16:00','17:00',
    '18:00','19:00','20:00','21:00','22:00',
  ];

  // 🔄 Cargar datos de la cancha
  useEffect(() => {
    if (!id) return;

    const fetchField = async () => {
      const { data, error } = await supabase
        .from('fields')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error cargando cancha:', error);
      } else {
        setField(data);
      }

      setLoading(false);
    };

    fetchField();
  }, [id]);

  // 🔄 Cargar horas ocupadas cuando cambia la fecha
  useEffect(() => {
    if (!id || !selectedDate) return;

    const fetchBookedHours = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('hour')
        .eq('field_id', Number(id))
        .eq('date', selectedDate);

      if (error) {
        console.error('Error cargando reservas:', error);
      } else {
        const hours = (data || []).map((b) => b.hour);
        setBookedHours(hours);

        // Si la hora elegida ya está ocupada, resetear
        if (hours.includes(selectedHour)) {
          setSelectedHour('');
        }
      }
    };

    fetchBookedHours();
  }, [id, selectedDate]);

  // ✅ Guardar reserva (con manejo de duplicados)
  const handleReserve = async () => {
    if (!selectedDate || !selectedHour || !id) {
      alert('Seleccioná fecha y hora');
      return;
    }

    const { error } = await supabase.from('bookings').insert([
      {
        field_id: Number(id),
        date: selectedDate,
        hour: selectedHour,
      },
    ]);

    if (error) {
      // 23505 = violación de índice único (doble reserva)
      if (error.code === '23505') {
        alert('Esa hora ya fue reservada por otra persona');
      } else {
        console.error('Error al reservar:', error);
        alert('Error al confirmar la reserva');
      }
    } else {
      alert('Reserva confirmada ⚽');
      setSelectedDate('');
      setSelectedHour('');
      setBookedHours([]);
    }
  };

  if (loading) {
    return <p style={{ padding: 20 }}>Cargando cancha...</p>;
  }

  if (!field) {
    return <p style={{ padding: 20 }}>Cancha no encontrada</p>;
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Reservar cancha</h1>

      <h2>{field.name}</h2>
      <p>Precio por hora: ₡{field.price}</p>

      {/* 📅 Selector de fecha */}
      <div style={{ marginTop: 20 }}>
        <label htmlFor="date">Seleccioná una fecha:</label>
        <br />
        <input
          type="date"
          id="date"
          value={selectedDate}
          onChange={(e) => {
            setSelectedDate(e.target.value);
            setSelectedHour('');
            setBookedHours([]);
          }}
          style={{ marginTop: 8, padding: 8 }}
        />
      </div>

      {/* 🕒 Selector de hora (filtrado) */}
      {selectedDate && (
        <div style={{ marginTop: 20 }}>
          <p>Seleccioná una hora:</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {availableHours
              .filter((hour) => !bookedHours.includes(hour))
              .map((hour) => (
                <button
                  key={hour}
                  onClick={() => setSelectedHour(hour)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    backgroundColor:
                      selectedHour === hour ? '#16a34a' : '#f3f4f6',
                    color: selectedHour === hour ? 'white' : 'black',
                    cursor: 'pointer',
                  }}
                >
                  {hour}
                </button>
              ))}
          </div>

          {bookedHours.length > 0 && (
            <p style={{ marginTop: 10, color: '#b91c1c' }}>
              Horas ocupadas: {bookedHours.join(', ')}
            </p>
          )}
        </div>
      )}

      {/* 🧾 Resumen */}
      {selectedDate && selectedHour && (
        <div style={{ marginTop: 20 }}>
          <p><strong>Fecha:</strong> {selectedDate}</p>
          <p><strong>Hora:</strong> {selectedHour}</p>
        </div>
      )}

      {/* ✅ Confirmar */}
      {selectedDate && selectedHour && (
        <button
          onClick={handleReserve}
          style={{
            marginTop: 20,
            padding: '10px 16px',
            backgroundColor: '#16a34a',
            color: 'white',
            borderRadius: 6,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Confirmar reserva
        </button>
      )}
    </main>
  );
}
