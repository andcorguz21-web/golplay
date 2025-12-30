'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'mapbox-gl/dist/mapbox-gl.css';

/* ===================== */
/* TYPES */
/* ===================== */

type Field = {
  id: number;
  name: string;
  lat: number;
  lng: number;
};

type Props = {
  fields: Field[];
  onSelect: (id: number) => void;
};

/* ===================== */
/* DYNAMIC IMPORT (NO SSR) */
/* ===================== */

const Map = dynamic(() => import('react-map-gl').then((m) => m.default), {
  ssr: false,
});

const Marker = dynamic(
  () => import('react-map-gl').then((m) => m.Marker),
  { ssr: false }
);

/* ===================== */
/* COMPONENT */
/* ===================== */

export default function MapView({ fields, onSelect }: Props) {
  const [token, setToken] = useState<string | null>(null);

  /* ===================== */
  /* LOAD TOKEN SAFELY */
  /* ===================== */
  useEffect(() => {
    const t = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!t) {
      console.error('❌ NEXT_PUBLIC_MAPBOX_TOKEN no definido');
      setToken(null);
      return;
    }

    setToken(t);
  }, []);

  if (!token) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f9fafb',
          color: '#374151',
          fontSize: 14,
        }}
      >
        Mapbox token no configurado
      </div>
    );
  }

  return (
    <Map
      mapboxAccessToken={token}
      initialViewState={{
        latitude: fields[0]?.lat ?? 9.933,
        longitude: fields[0]?.lng ?? -84.083,
        zoom: 13,
      }}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      style={{ width: '100%', height: '100%' }}
    >
      {fields.map((f) => (
        <Marker
          key={f.id}
          latitude={f.lat}
          longitude={f.lng}
          anchor="bottom"
        >
          <button
            onClick={() => onSelect(f.id)}
            style={{
              background: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: 28,
              height: 28,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ⚽
          </button>
        </Marker>
      ))}
    </Map>
  );
}
