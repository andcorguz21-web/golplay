/**
 * GolPlay — components/MapEmbedClient.tsx
 *
 * Implementación real del mapa. NUNCA importar directamente.
 * Solo se carga a través de MapEmbed.tsx via dynamic() + { ssr: false }.
 */

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapEmbedProps } from './MapEmbed'

// ─── Fix Leaflet's default icon broken in Next.js ────────────────────────────

const createGolPlayIcon = () => L.divIcon({
  className: '',
  html: `
    <div style="
      width: 44px; height: 52px;
      position: relative;
      filter: drop-shadow(0 4px 12px rgba(22,163,74,.5));
    ">
      <div style="
        width: 44px; height: 44px; border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        background: linear-gradient(135deg, #16a34a, #0B4D2C);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,.3);
        display: flex; align-items: center; justify-content: center;
      ">
        <div style="
          transform: rotate(45deg);
          font-size: 18px; line-height: 1;
          margin-top: -2px;
        ">⚽</div>
      </div>
    </div>
  `,
  iconSize: [44, 52],
  iconAnchor: [22, 52],
  popupAnchor: [0, -56],
})

// ─── FlyTo helper ─────────────────────────────────────────────────────────────

function FlyToMarker({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], 16, { duration: 1.2, easeLinearity: 0.25 })
  }, [lat, lng, map])
  return null
}

// ─── Custom popup HTML ────────────────────────────────────────────────────────

const buildPopupHTML = (name: string, location: string, sport?: string, price?: string) => `
  <div style="
    font-family: 'DM Sans', -apple-system, sans-serif;
    padding: 14px 16px; min-width: 180px; max-width: 240px;
  ">
    ${sport ? `
    <div style="
      display: inline-flex; align-items: center; gap: 5px;
      background: #f0fdf4; color: #15803d;
      padding: 3px 10px; border-radius: 999px;
      font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
      border: 1px solid #bbf7d0; margin-bottom: 8px;
    ">${sport}</div>` : ''}
    <p style="
      font-family: 'Kanit', sans-serif;
      font-size: 15px; font-weight: 700; color: #1a1d19;
      margin: 0 0 4px; line-height: 1.2;
    ">${name}</p>
    <p style="
      font-size: 12px; color: #6b7569;
      margin: 0 0 8px; display: flex; align-items: center; gap: 4px;
    ">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
      </svg>
      ${location}
    </p>
    ${price ? `
    <div style="
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 8px; border-top: 1px solid #e8ece6;
    ">
      <span style="font-size: 11px; color: #6b7569; font-weight: 500;">Desde</span>
      <span style="
        font-family: 'Kanit', sans-serif;
        font-size: 15px; font-weight: 800; color: #16a34a;
      ">${price}</span>
    </div>` : ''}
  </div>
`

// ─── ZoomTopRight ─────────────────────────────────────────────────────────────

function ZoomTopRight() {
  const map = useMap()
  useEffect(() => {
    const zoom = L.control.zoom({ position: 'topright' })
    zoom.addTo(map)
    return () => { zoom.remove() }
  }, [map])
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapEmbedClient({ lat, lng, name, location, sport, price }: MapEmbedProps) {
  const iconRef = useRef<L.DivIcon | null>(null)

  useEffect(() => {
    iconRef.current = createGolPlayIcon()
  }, [])

  const icon = iconRef.current ?? createGolPlayIcon()

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        maxZoom={19}
      />

      <ZoomTopRight />

      <Marker position={[lat, lng]} icon={icon}>
        <Popup closeButton={false} offset={[0, -4]}>
          <div dangerouslySetInnerHTML={{ __html: buildPopupHTML(name, location, sport, price) }} />
        </Popup>
      </Marker>

      <FlyToMarker lat={lat} lng={lng} />
    </MapContainer>
  )
}
