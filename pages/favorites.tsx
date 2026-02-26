/**
 * GolPlay — pages/favorites.tsx
 *
 * Mejoras vs versión original:
 *  - Imagen real desde field_images (is_main) en lugar de Unsplash genérico
 *  - Join tipado correctamente — fields puede ser objeto o array, se maneja ambos
 *  - Botón de eliminar favorito desde la card
 *  - Estado vacío mejorado con CTA
 *  - Diseño consistente con el sistema visual del proyecto
 *  - Accesibilidad: roles, aria-labels, focus-visible
 */

import Head from 'next/head'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import Header from '@/components/ui/Header'

// ─── Types ────────────────────────────────────────────────────────────────────

type FavoriteField = {
  favoriteId: number
  id: number
  name: string
  location: string
  price_day: number
  price_night: number
  sport: string | null
  image: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPORT_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  futbol5:  { label: 'Fútbol 5',  emoji: '⚽', color: '#15803d', bg: '#dcfce7' },
  futbol7:  { label: 'Fútbol 7',  emoji: '⚽', color: '#166534', bg: '#bbf7d0' },
  padel:    { label: 'Pádel',     emoji: '🎾', color: '#0e7490', bg: '#cffafe' },
  tenis:    { label: 'Tenis',     emoji: '🎾', color: '#92400e', bg: '#fef3c7' },
  basquet:  { label: 'Básquet',   emoji: '🏀', color: '#9a3412', bg: '#ffedd5' },
  multiuso: { label: 'Multiuso',  emoji: '🏟️', color: '#5b21b6', bg: '#ede9fe' },
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=800&q=60'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₡${Number(n).toLocaleString('es-CR')}`

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');

  :root {
    --g900: #052e16; --g800: #0B4D2C; --g700: #15803d;
    --g500: #16a34a; --g400: #4ade80; --g100: #dcfce7;
    --bone: #F5F2EC; --charcoal: #0C0D0B; --ink: #1a1d19;
    --muted: #6b7569; --border: #e8ece6; --white: #ffffff;
    --r-xl: 22px; --r-lg: 16px; --r-md: 12px;
    --sh-sm: 0 1px 3px rgba(0,0,0,.05), 0 4px 12px rgba(0,0,0,.05);
    --sh-md: 0 4px 16px rgba(0,0,0,.10), 0 12px 32px rgba(0,0,0,.07);
    --font-d: 'DM Serif Display', Georgia, serif;
    --font-h: 'Kanit', sans-serif;
    --font-b: 'DM Sans', sans-serif;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--font-b); background: var(--bone); color: var(--ink); -webkit-font-smoothing: antialiased; }

  @keyframes fadeUp   { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:none } }
  @keyframes shimmer  { 0%{ background-position:200% 0 } 100%{ background-position:-200% 0 } }
  @keyframes fadeIn   { from{opacity:0} to{opacity:1} }

  .page { min-height: 100vh; background: var(--bone); padding: 0 0 80px; }
  .inner { max-width: 1200px; margin: 0 auto; padding: 40px 32px 0; }

  /* ── Page header ── */
  .page-header {
    margin-bottom: 36px;
    animation: fadeUp .45s ease both;
  }
  .page-label {
    font-family: var(--font-h); font-size: 10px; font-weight: 700;
    letter-spacing: .12em; text-transform: uppercase; color: var(--g500);
    margin-bottom: 6px;
  }
  .page-title {
    font-family: var(--font-d); font-size: clamp(28px, 3.5vw, 40px);
    font-weight: 400; color: var(--ink); font-style: italic;
    letter-spacing: -.02em; line-height: 1.1;
  }
  .page-title em { font-style: normal; color: var(--g500); }

  /* ── Grid ── */
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 24px;
  }

  /* ── Card ── */
  .card {
    background: var(--white); border-radius: var(--r-xl);
    border: 1.5px solid var(--border);
    overflow: hidden; cursor: pointer;
    box-shadow: var(--sh-sm);
    transition: transform .2s cubic-bezier(.16,1,.3,1), box-shadow .2s;
    animation: fadeUp .45s ease both;
  }
  .card:hover { transform: translateY(-4px); box-shadow: var(--sh-md); }
  .card:focus-within { outline: 2px solid var(--g500); outline-offset: 2px; }

  .card-img {
    height: 180px; position: relative; overflow: hidden;
    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  }
  .card-img img {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform .4s ease;
  }
  .card:hover .card-img img { transform: scale(1.04); }

  .card-img-overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, transparent 50%, rgba(12,13,11,.45) 100%);
  }

  /* Sport badge on image */
  .sport-badge {
    position: absolute; top: 12px; left: 12px; z-index: 2;
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 999px;
    font-family: var(--font-h); font-size: 11px; font-weight: 700;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,.25);
    background: rgba(255,255,255,.18);
    color: #fff;
  }

  /* Remove button */
  .remove-btn {
    position: absolute; top: 10px; right: 10px; z-index: 2;
    width: 30px; height: 30px; border-radius: 8px;
    background: rgba(12,13,11,.55); backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,.15);
    color: rgba(255,255,255,.7); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background .15s, color .15s;
  }
  .remove-btn:hover { background: #ef4444; color: #fff; }

  .card-body { padding: 18px 20px 20px; }
  .card-name {
    font-family: var(--font-h); font-size: 15px; font-weight: 700;
    color: var(--ink); margin-bottom: 5px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .card-location {
    font-size: 12.5px; color: var(--muted); font-weight: 500;
    display: flex; align-items: center; gap: 5px; margin-bottom: 14px;
  }
  .card-prices {
    display: flex; gap: 8px;
  }
  .price-pill {
    flex: 1; padding: 8px 10px; border-radius: var(--r-md);
    text-align: center;
  }
  .price-pill--day  { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .price-pill--night{ background: #faf5ff; border: 1px solid #e9d5ff; }
  .price-pill-label {
    font-family: var(--font-h); font-size: 9px; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase;
    display: block; margin-bottom: 3px;
  }
  .price-pill--day  .price-pill-label { color: #065f46; }
  .price-pill--night .price-pill-label { color: #4c1d95; }
  .price-pill-value {
    font-family: var(--font-h); font-size: 13px; font-weight: 800;
  }
  .price-pill--day  .price-pill-value { color: #065f46; }
  .price-pill--night .price-pill-value { color: #4c1d95; }

  .card-cta {
    margin-top: 14px; width: 100%; padding: 10px;
    border-radius: var(--r-md);
    background: linear-gradient(135deg, var(--g500), var(--g700));
    color: #fff; font-family: var(--font-h); font-weight: 700;
    font-size: 12.5px; letter-spacing: .04em; text-transform: uppercase;
    border: none; cursor: pointer;
    box-shadow: 0 3px 12px rgba(22,163,74,.28);
    transition: all .2s;
  }
  .card-cta:hover { transform: translateY(-1px); box-shadow: 0 5px 18px rgba(22,163,74,.38); }

  /* ── Skeleton ── */
  .skel {
    background: linear-gradient(90deg, #ebebeb 25%, #f5f5f5 50%, #ebebeb 75%);
    background-size: 400% 100%; animation: shimmer 1.5s infinite;
    border-radius: var(--r-xl);
  }

  /* ── Empty state ── */
  .empty {
    grid-column: 1 / -1;
    background: var(--white); border: 1.5px solid var(--border);
    border-radius: var(--r-xl); padding: 72px 32px;
    text-align: center; animation: fadeIn .5s ease both;
  }
  .empty-icon { font-size: 56px; margin-bottom: 20px; }
  .empty-title {
    font-family: var(--font-d); font-size: 26px; font-weight: 400;
    color: var(--ink); font-style: italic; margin-bottom: 10px;
  }
  .empty-text { font-size: 14px; color: var(--muted); line-height: 1.7; max-width: 340px; margin: 0 auto 28px; }
  .empty-cta {
    display: inline-block; padding: 12px 28px; border-radius: 999px;
    background: linear-gradient(135deg, var(--g500), var(--g700));
    color: #fff; font-family: var(--font-h); font-weight: 700;
    font-size: 13px; letter-spacing: .04em; text-transform: uppercase;
    text-decoration: none;
    box-shadow: 0 4px 16px rgba(22,163,74,.32);
    transition: all .2s;
  }
  .empty-cta:hover { transform: translateY(-2px); box-shadow: 0 6px 22px rgba(22,163,74,.42); }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .inner { padding: 28px 20px 0; }
    .grid  { grid-template-columns: 1fr 1fr; gap: 16px; }
  }
  @media (max-width: 480px) {
    .grid { grid-template-columns: 1fr; }
  }
`

// ─── Component ────────────────────────────────────────────────────────────────

export default function FavoritesPage() {
  const router = useRouter()
  const [fields,   setFields]   = useState<FavoriteField[]>([])
  const [loading,  setLoading]  = useState(true)
  const [removing, setRemoving] = useState<number | null>(null)

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/login')
    })
  }, [router])

  // ── Load favorites ─────────────────────────────────────────────────────────
  const loadFavorites = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data, error } = await supabase
      .from('favorites')
      .select(`
        id,
        field_id,
        fields (
          id,
          name,
          location,
          price_day,
          price_night,
          sport
        )
      `)
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })

    if (error) { setLoading(false); return }

    // Normalize: fields may be object or array depending on PostgREST version
    const normalized: FavoriteField[] = (data || [])
      .map((row: any) => {
        const f = Array.isArray(row.fields) ? row.fields[0] : row.fields
        if (!f) return null
        return {
          favoriteId: row.id,
          id:         f.id,
          name:       f.name,
          location:   f.location ?? '—',
          price_day:  Number(f.price_day  ?? 0),
          price_night:Number(f.price_night ?? 0),
          sport:      f.sport ?? null,
          image:      null,
        }
      })
      .filter(Boolean) as FavoriteField[]

    // Fetch main images for all field ids in one query
    if (normalized.length > 0) {
      const ids = normalized.map(f => f.id)
      const { data: images } = await supabase
        .from('field_images')
        .select('field_id, url')
        .in('field_id', ids)
        .eq('is_main', true)

      const imgMap = new Map((images || []).map((i: any) => [i.field_id, i.url]))
      normalized.forEach(f => { f.image = imgMap.get(f.id) ?? null })
    }

    setFields(normalized)
    setLoading(false)
  }, [])

  useEffect(() => { loadFavorites() }, [loadFavorites])

  // ── Remove favorite ────────────────────────────────────────────────────────
  const removeFavorite = useCallback(async (favoriteId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setRemoving(favoriteId)
    await supabase.from('favorites').delete().eq('id', favoriteId)
    setFields(prev => prev.filter(f => f.favoriteId !== favoriteId))
    setRemoving(null)
  }, [])

  return (
    <>
      <Head>
        <title>Mis favoritos — GolPlay</title>
        <meta name="description" content="Tus canchas guardadas en GolPlay." />
      </Head>

      <style>{CSS}</style>
      <Header />

      <main className="page">
        <div className="inner">

          {/* Page header */}
          <div className="page-header">
            <p className="page-label">Tu colección</p>
            <h1 className="page-title">
              Canchas <em>guardadas</em>
            </h1>
          </div>

          <div className="grid">

            {/* Skeletons */}
            {loading && [1, 2, 3].map(i => (
              <div key={i} className="skel" style={{ height: 320, animationDelay: `${i * 80}ms` }} />
            ))}

            {/* Empty state */}
            {!loading && fields.length === 0 && (
              <div className="empty">
                <div className="empty-icon">🏟️</div>
                <h2 className="empty-title">Aún no guardaste canchas</h2>
                <p className="empty-text">
                  Explorá el catálogo y presioná ❤️ en las canchas que te interesen para acceder más rápido.
                </p>
                <a href="/" className="empty-cta">Explorar canchas</a>
              </div>
            )}

            {/* Cards */}
            {!loading && fields.map((field, i) => {
              const sport = field.sport ? SPORT_META[field.sport] : null
              return (
                <article
                  key={field.favoriteId}
                  className="card"
                  style={{ animationDelay: `${i * 60}ms` }}
                  onClick={() => router.push(`/reserve/${field.id}`)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Ver cancha ${field.name}`}
                  onKeyDown={e => e.key === 'Enter' && router.push(`/reserve/${field.id}`)}
                >
                  {/* Image */}
                  <div className="card-img">
                    <img
                      src={field.image ?? FALLBACK_IMAGE}
                      alt={field.name}
                      loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGE }}
                    />
                    <div className="card-img-overlay" />

                    {/* Sport badge */}
                    {sport && (
                      <span className="sport-badge">
                        {sport.emoji} {sport.label}
                      </span>
                    )}

                    {/* Remove button */}
                    <button
                      className="remove-btn"
                      onClick={e => removeFavorite(field.favoriteId, e)}
                      disabled={removing === field.favoriteId}
                      aria-label={`Eliminar ${field.name} de favoritos`}
                    >
                      {removing === field.favoriteId ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      )}
                    </button>
                  </div>

                  {/* Body */}
                  <div className="card-body">
                    <h2 className="card-name">{field.name}</h2>
                    <p className="card-location">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      {field.location}
                    </p>

                    {/* Prices */}
                    <div className="card-prices">
                      <div className="price-pill price-pill--day">
                        <span className="price-pill-label">🌞 Diurna</span>
                        <span className="price-pill-value">{fmt(field.price_day)}</span>
                      </div>
                      <div className="price-pill price-pill--night">
                        <span className="price-pill-label">🌙 Nocturna</span>
                        <span className="price-pill-value">{fmt(field.price_night)}</span>
                      </div>
                    </div>

                    <button className="card-cta" aria-label={`Reservar ${field.name}`}>
                      Reservar ahora →
                    </button>
                  </div>
                </article>
              )
            })}

          </div>
        </div>
      </main>
    </>
  )
}
