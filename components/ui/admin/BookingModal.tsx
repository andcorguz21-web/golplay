type Booking = {
    id: number;
    date: string;
    hour: string;
    fieldName: string;
    price?: number;
  };
  
  export default function BookingModal({
    booking,
    onClose,
    onDelete,
  }: {
    booking: Booking;
    onClose: () => void;
    onDelete: (id: number) => void;
  }) {
    if (!booking) return null;
  
    const formattedDate = new Date(booking.date).toLocaleDateString('es-CR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.45)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999,
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: 20,
            padding: 28,
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
          }}
        >
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>
            Detalle de reserva
          </h2>
  
          <div style={{ marginBottom: 10 }}>
            <strong>Cancha:</strong> {booking.fieldName}
          </div>
  
          <div style={{ marginBottom: 10 }}>
            <strong>Fecha:</strong> {formattedDate}
          </div>
  
          <div style={{ marginBottom: 10 }}>
            <strong>Hora:</strong> {booking.hour}
          </div>
  
          {booking.price && (
            <div style={{ marginBottom: 16 }}>
              <strong>Precio:</strong> ₡{booking.price}
            </div>
          )}
  
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 24,
            }}
          >
            <button
              onClick={() => onDelete(booking.id)}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                padding: '10px 16px',
                cursor: 'pointer',
              }}
            >
              Eliminar
            </button>
  
            <button
              onClick={onClose}
              style={{
                backgroundColor: '#e5e7eb',
                border: 'none',
                borderRadius: 10,
                padding: '10px 16px',
                cursor: 'pointer',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }
  