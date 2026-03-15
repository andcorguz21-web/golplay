/**
 * GolPlay — pages/favorites.tsx
 * Dark theme, header simple (logo + back), consistente con /perfil.
 */

import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

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

const SPORT_META: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  futbol5:  { label: 'Fútbol 5',  emoji: '⚽', color: '#4ade80', bg: 'rgba(74,222,128,.12)' },
  futbol7:  { label: 'Fútbol 7',  emoji: '⚽', color: '#4ade80', bg: 'rgba(74,222,128,.12)' },
  padel:    { label: 'Pádel',     emoji: '🎾', color: '#67e8f9', bg: 'rgba(103,232,249,.12)' },
  tenis:    { label: 'Tenis',     emoji: '🎾', color: '#fbbf24', bg: 'rgba(251,191,36,.12)' },
  basquet:  { label: 'Básquet',   emoji: '🏀', color: '#fb923c', bg: 'rgba(251,146,60,.12)' },
  multiuso: { label: 'Multiuso',  emoji: '🏟️', color: '#a78bfa', bg: 'rgba(167,139,250,.12)' },
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=800&q=60'
const fmt = (n: number) => `₡${Number(n).toLocaleString('es-CR')}`

export default function FavoritesPage() {
  const router = useRouter()
  const [fields, setFields] = useState<FavoriteField[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<number | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (!data.user) router.push('/login') })
  }, [router])

  const loadFavorites = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    const { data, error } = await supabase
      .from('favorites')
      .select('id, field_id, fields(id, name, location, price_day, price_night, sport)')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })
    if (error) { setLoading(false); return }
    const normalized: FavoriteField[] = (data || [])
      .map((row: any) => {
        const f = Array.isArray(row.fields) ? row.fields[0] : row.fields
        if (!f) return null
        return { favoriteId: row.id, id: f.id, name: f.name, location: f.location ?? '—', price_day: Number(f.price_day ?? 0), price_night: Number(f.price_night ?? 0), sport: f.sport ?? null, image: null }
      }).filter(Boolean) as FavoriteField[]
    if (normalized.length > 0) {
      const ids = normalized.map(f => f.id)
      const { data: images } = await supabase.from('field_images').select('field_id, url').in('field_id', ids).eq('is_main', true)
      const imgMap = new Map((images || []).map((i: any) => [i.field_id, i.url]))
      normalized.forEach(f => { f.image = imgMap.get(f.id) ?? null })
    }
    setFields(normalized); setLoading(false)
  }, [])

  useEffect(() => { loadFavorites() }, [loadFavorites])

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

      <div className="fv">
        {/* Header */}
        <header className="fv-header">
          <button className="fv-back" onClick={() => router.back()} aria-label="Volver">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <Link href="/"><Image src="/logo-golplay1.svg" alt="GolPlay" width={110} height={30} style={{ objectFit: 'contain' }} /></Link>
          <div style={{ width: 40 }} />
        </header>

        <div className="fv-content">
          <div className="fv-page-header">
            <p className="fv-label">Tu colección</p>
            <h1 className="fv-title">Canchas <em>guardadas</em></h1>
          </div>

          {/* Loading */}
          {loading && (
            <div className="fv-grid">
              {[1, 2, 3].map(i => <div key={i} className="fv-skel" style={{ animationDelay: `${i * 80}ms` }} />)}
            </div>
          )}

          {/* Empty */}
          {!loading && fields.length === 0 && (
            <div className="fv-empty">
              <span>🏟️</span>
              <h3>Aún no guardaste canchas</h3>
              <p>Explorá el catálogo y presioná ❤️ en las canchas que te interesen.</p>
              <Link href="/reserve" className="fv-btn" style={{ textDecoration: 'none' }}>Explorar canchas</Link>
            </div>
          )}

          {/* Cards */}
          {!loading && fields.length > 0 && (
            <div className="fv-grid">
              {fields.map((field, i) => {
                const sport = field.sport ? SPORT_META[field.sport] : null
                return (
                  <article key={field.favoriteId} className="fv-card" style={{ animationDelay: `${i * 50}ms` }}
                    onClick={() => router.push(`/reserve/${field.id}`)} role="button" tabIndex={0}
                    aria-label={`Ver cancha ${field.name}`}
                    onKeyDown={e => e.key === 'Enter' && router.push(`/reserve/${field.id}`)}>
                    <div className="fv-card-img" style={{ backgroundImage: `url(${field.image ?? FALLBACK_IMAGE})` }}>
                      <div className="fv-card-overlay" />
                      {sport && <span className="fv-sport-badge">{sport.emoji} {sport.label}</span>}
                      <button className="fv-rm" onClick={e => removeFavorite(field.favoriteId, e)}
                        disabled={removing === field.favoriteId} aria-label={`Eliminar ${field.name}`}>
                        {removing === field.favoriteId ? '...' : '✕'}
                      </button>
                    </div>
                    <div className="fv-card-body">
                      <h2 className="fv-card-name">{field.name}</h2>
                      <p className="fv-card-loc">📍 {field.location}</p>
                      <div className="fv-prices">
                        <div className="fv-price fv-price--day">
                          <span className="fv-price-lbl">🌞 Diurna</span>
                          <span className="fv-price-val">{fmt(field.price_day)}</span>
                        </div>
                        <div className="fv-price fv-price--night">
                          <span className="fv-price-lbl">🌙 Nocturna</span>
                          <span className="fv-price-val">{fmt(field.price_night)}</span>
                        </div>
                      </div>
                      <button className="fv-cta">Reservar ahora →</button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}

.fv{min-height:100vh;background:#0C0D0B;font-family:'DM Sans',system-ui,sans-serif;color:#e2e8e0;-webkit-font-smoothing:antialiased}

.fv-header{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid rgba(255,255,255,.06)}
.fv-back{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08);color:#e2e8e0;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s}
.fv-back:hover{background:rgba(255,255,255,.12)}

.fv-content{max-width:900px;margin:0 auto;padding:32px 20px 80px}

.fv-page-header{margin-bottom:28px;animation:fadeUp .4s ease both}
.fv-label{font-family:'Kanit',sans-serif;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#4ade80;margin-bottom:6px}
.fv-title{font-family:'Kanit',sans-serif;font-size:clamp(26px,4vw,36px);font-weight:800;color:#fff;letter-spacing:-.02em}
.fv-title em{font-style:normal;color:#4ade80}

.fv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px}

.fv-skel{height:320;border-radius:16px;background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.04) 75%);background-size:400% 100%;animation:shimmer 1.5s infinite}

.fv-empty{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:60px 24px;text-align:center;animation:fadeUp .5s ease both}
.fv-empty span{font-size:48px;display:block;margin-bottom:16px}
.fv-empty h3{font-family:'Kanit',sans-serif;font-size:20px;font-weight:800;color:#fff;margin-bottom:8px}
.fv-empty p{font-size:14px;color:#6b7569;margin-bottom:24px;line-height:1.6}
.fv-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:12px;font-size:13px;font-weight:700;font-family:'Kanit',sans-serif;background:#16a34a;color:#fff;border:none;cursor:pointer;box-shadow:0 3px 14px rgba(22,163,74,.35)}

.fv-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;cursor:pointer;transition:transform .2s,box-shadow .2s,border-color .2s;animation:fadeUp .4s ease both}
.fv-card:hover{transform:translateY(-4px);box-shadow:0 8px 32px rgba(0,0,0,.3);border-color:rgba(74,222,128,.3)}

.fv-card-img{height:180px;background-size:cover;background-position:center;position:relative;background-color:rgba(22,163,74,.1)}
.fv-card-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,.5) 100%)}
.fv-sport-badge{position:absolute;top:10px;left:10px;background:rgba(0,0,0,.6);backdrop-filter:blur(8px);color:#fff;font-size:10px;font-weight:700;padding:4px 10px;border-radius:999px;font-family:'Kanit',sans-serif;letter-spacing:.04em;border:1px solid rgba(255,255,255,.1)}
.fv-rm{position:absolute;top:10px;right:10px;width:28px;height:28px;border-radius:8px;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);color:#fff;border:none;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s}
.fv-card:hover .fv-rm{opacity:1}
.fv-rm:hover{background:#ef4444}

.fv-card-body{padding:14px 16px 16px}
.fv-card-name{font-family:'Kanit',sans-serif;font-size:15px;font-weight:700;color:#fff;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fv-card-loc{font-size:12px;color:#6b7569;margin-bottom:12px}

.fv-prices{display:flex;gap:8px;margin-bottom:14px}
.fv-price{flex:1;padding:8px 10px;border-radius:10px;text-align:center}
.fv-price--day{background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.15)}
.fv-price--night{background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.15)}
.fv-price-lbl{display:block;font-family:'Kanit',sans-serif;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:3px}
.fv-price--day .fv-price-lbl{color:#4ade80}
.fv-price--night .fv-price-lbl{color:#a78bfa}
.fv-price-val{font-family:'Kanit',sans-serif;font-size:14px;font-weight:800}
.fv-price--day .fv-price-val{color:#4ade80}
.fv-price--night .fv-price-val{color:#a78bfa}

.fv-cta{width:100%;padding:10px;border-radius:10px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;font-family:'Kanit',sans-serif;font-weight:700;font-size:12px;letter-spacing:.04em;text-transform:uppercase;border:none;cursor:pointer;box-shadow:0 3px 12px rgba(22,163,74,.3);transition:all .15s}
.fv-cta:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(22,163,74,.4)}

@media(max-width:640px){.fv-content{padding:20px 16px 80px}.fv-grid{grid-template-columns:1fr}}
`
