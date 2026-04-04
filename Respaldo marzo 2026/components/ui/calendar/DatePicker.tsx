'use client';

import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

type Props = {
  selected?: Date;
  onSelect: (date: Date | undefined) => void;
};

export default function DatePicker({ selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      {/* INPUT FAKE (AIRBNB STYLE) */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          height: 48,
          minWidth: 220,
          padding: '0 14px',
          borderRadius: 14,
          border: '1px solid #e5e7eb',
          background: 'white',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: 14,
        }}
      >
        {selected
          ? selected.toLocaleDateString('es-CR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : 'Seleccioná una fecha'}
      </button>

      {/* CALENDAR */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 56,
            left: 0,
            zIndex: 50,
            background: 'white',
            borderRadius: 16,
            padding: 12,
            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
          }}
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={(date) => {
              onSelect(date);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
