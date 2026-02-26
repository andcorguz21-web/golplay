/**
 * GolPlay — components/MapEmbed.tsx
 *
 * Mapa interactivo con Leaflet + OpenStreetMap.
 * No requiere API key. Completamente gratuito.
 *
 * Este componente se importa SOLO con dynamic() + { ssr: false }
 * porque Leaflet requiere `window`.
 *
 * INSTALACIÓN:
 *   npm install leaflet react-leaflet
 *   npm install --save-dev @types/leaflet
 *
 * USO (en cualquier página o componente):
 *   import dynamic from 'next/dynamic'
 *   const MapEmbed = dynamic(() => import('@/components/MapEmbed'), { ssr: false })
 *
 * En pages/_app.tsx NO hace falta importar leaflet.css porque
 * lo importamos directamente aquí dentro.
 */

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MapEmbedProps {
  lat:      number
  lng:      number
  name:     string
  location: string
  sport?:   string
  price?:   string
}

// ─── Dynamic wrapper (SSR-safe) ───────────────────────────────────────────────
// Toda la lógica de Leaflet vive en MapEmbedClient para que
// el bundle del servidor nunca toque `window`.

import dynamic from 'next/dynamic'

const MapEmbedClient = dynamic(
  () => import('./MapEmbedClient'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: '100%', width: '100%',
        background: '#f0fdf4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 'inherit',
      }}>
        <div style={{ textAlign: 'center', color: '#16a34a' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🗺️</div>
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Cargando mapa…</p>
        </div>
      </div>
    ),
  }
)

export default function MapEmbed(props: MapEmbedProps) {
  return <MapEmbedClient {...props} />
}
