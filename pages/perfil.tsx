/**
 * GolPlay — pages/perfil.tsx
 * Perfil del usuario: datos, historial de reservas, favoritos.
 *
 * Migrado al DS oficial:
 *   - Theme: dark (envuelto en <div className="theme-light">).
 *   - Navbar: <Navbar /> reemplaza el header inline.
 *   - Tipografía: Syne (var(--font-d)) + DM Sans (body default).
 *   - Tokens CSS: var(--blue), var(--g6), var(--g7), var(--r-lg).
 *   - Animaciones globales: fadeUp, fadeIn (de golplay-tokens.css).
 *   - Logout y favoritos eliminados del body — ahora viven en el Navbar dropdown.
 */

import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/ui/Navbar'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Profile {
  first_name: string
  last_name: string
  phone: string | null
  role: string
  complex_name: string | null
  country: string
  currency: string
  created_at: string
}
interface BookingHistory {
  id: number
  date: string
  hour: string
  status: string
  price: number | null
  field_name: string
  field_sport: string | null
  field_location: string | null
}
interface FavoriteField {
  favoriteId: number
  fieldId: number
  name: string
  sport: string | null
  location: string | null
  image: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SPORT_META: Record<string, { label: string; emoji: string }> = {
  futbol5:  { label: 'Fútbol 5',  emoji: '⚽' },
  futbol7:  { label: 'Fútbol 7',  emoji: '⚽' },
  futbol11: { label: 'Fútbol 11', emoji: '⚽' },
  padel:    { label: 'Pádel',     emoji: '🎾' },
  tenis:    { label: 'Tenis',     emoji: '🎾' },
  basquet:  { label: 'Básquet',   emoji: '🏀' },
  voleibol: { label: 'Voleibol',  emoji: '🏐' },
  multiuso: { label: 'Multiuso',  emoji: '🏟️' },
  otro:     { label: 'Otro',      emoji: '🏅' },
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  confirmed: { label: 'Confirmada', color: '#d4f24d', bg: 'rgba(58,91,240,.12)' },
  pending:   { label: 'Pendiente',  color: '#fbbf24', bg: 'rgba(251,191,36,.12)' },
  cancelled: { label: 'Cancelada',  color: '#6b7280', bg: 'rgba(107,114,128,.12)' },
  completed: { label: 'Completada', color: '#60a5fa', bg: 'rgba(96,165,250,.12)' },
  no_show:   { label: 'No asistió', color: '#f87171', bg: 'rgba(248,113,113,.12)' },
}

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1575361204480-aadea25e6e68?auto=format&fit=crop&w=400&q=60'

const fmt     = (n: number) => `₡${Number(n).toLocaleString('es-CR')}`
const fmtDate = (d: string) => {
  try {
    return new Date(d + 'T00:00:00').toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch { return d }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter()
  const [profile,   setProfile]   = useState<Profile | null>(null)
  const [email,     setEmail]     = useState('')
  const [bookings,  setBookings]  = useState<BookingHistory[]>([])
  const [favorites, setFavorites] = useState<FavoriteField[]>([])
  const [loading,   setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<'bookings' | 'favorites'>('bookings')
  const [editing,   setEditing]   = useState(false)
  const [editForm,  setEditForm]  = useState({ first_name: '', last_name: '', phone: '' })
  const [saving,    setSaving]    = useState(false)
  const [toast,     setToast]     = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  useEffect(() => { (async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) { router.push('/login'); return }

    const userId = userData.user.id
    setEmail(userData.user.email ?? '')

    const { data: prof } = await supabase
      .from('profiles')
      .select('first_name,last_name,phone,role,complex_name,country,currency,created_at')
      .eq('id', userId)
      .single()
    if (prof) {
      setProfile(prof)
      setEditForm({
        first_name: prof.first_name || '',
        last_name:  prof.last_name  || '',
        phone:      prof.phone      || '',
      })
    }

    const { data: bData } = await supabase
      .from('bookings')
      .select('id,date,hour,status,price,field_id')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(50)
    if (bData && bData.length > 0) {
      const fieldIds = [...new Set(bData.map((b: any) => b.field_id))]
      const { data: fields } = await supabase
        .from('fields')
        .select('id,name,sport,location')
        .in('id', fieldIds)
      const fm = new Map((fields || []).map((f: any) => [f.id, f]))
      setBookings(bData.map((b: any) => {
        const f = fm.get(b.field_id)
        return {
          id: b.id,
          date: b.date,
          hour: b.hour,
          status: b.status || 'confirmed',
          price: b.price ? Number(b.price) : null,
          field_name:     f?.name     ?? 'Cancha eliminada',
          field_sport:    f?.sport    ?? null,
          field_location: f?.location ?? null,
        }
      }))
    }

    const { data: favData } = await supabase
      .from('favorites')
      .select('id,field_id,fields(id,name,sport,location)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (favData && favData.length > 0) {
      const favFieldIds = favData.map((f: any) => {
        const field = Array.isArray(f.fields) ? f.fields[0] : f.fields
        return field?.id
      }).filter(Boolean)
      const { data: favImages } = await supabase
        .from('field_images')
        .select('field_id,url')
        .in('field_id', favFieldIds)
        .eq('is_main', true)
      const imgMap = new Map((favImages || []).map((i: any) => [i.field_id, i.url]))
      setFavorites(favData.map((row: any) => {
        const f = Array.isArray(row.fields) ? row.fields[0] : row.fields
        return {
          favoriteId: row.id,
          fieldId:    f?.id       ?? 0,
          name:       f?.name     ?? '—',
          sport:      f?.sport    ?? null,
          location:   f?.location ?? null,
          image:      imgMap.get(f?.id) ?? null,
        }
      }).filter((f: any) => f.fieldId > 0))
    }

    setLoading(false)
  })() }, [router])

  const saveProfile = async () => {
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: editForm.first_name.trim(),
        last_name:  editForm.last_name.trim(),
        phone:      editForm.phone.trim() || null,
      })
      .eq('id', userData.user.id)
    setSaving(false)
    if (error) { showToast('Error al guardar'); return }
    setProfile(p => p ? {
      ...p,
      first_name: editForm.first_name.trim(),
      last_name:  editForm.last_name.trim(),
      phone:      editForm.phone.trim() || null,
    } : p)
    setEditing(false)
    showToast('Perfil actualizado ✓')
  }

  const removeFavorite = async (favId: number) => {
    await supabase.from('favorites').delete().eq('id', favId)
    setFavorites(prev => prev.filter(f => f.favoriteId !== favId))
    showToast('Favorito eliminado')
  }

  const activeBookings = bookings.filter(b => b.status !== 'cancelled')
  const totalSpent     = activeBookings.reduce((s, b) => s + (b.price ?? 0), 0)
  const memberSince    = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('es-CR', { month: 'long', year: 'numeric' })
    : '—'

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <>
      <Head><title>Mi perfil — GolPlay</title></Head>
      <style>{CSS}</style>
      <div className="theme-light">
        <Navbar />
        <div className="pf-loading">
          <div className="pf-spinner" />
          <p>Cargando perfil...</p>
        </div>
      </div>
    </>
  )

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Mi perfil — GolPlay</title>
        <meta name="description" content="Tu perfil y actividad en GolPlay." />
      </Head>
      <style>{CSS}</style>
      {toast && <div className="pf-toast">{toast}</div>}

      <div className="theme-light">
        <Navbar />

        <div className="pf-content">
          {/* Hero card */}
          <section className="pf-card pf-hero">
            <div className="pf-avatar">{(profile?.first_name?.[0] || 'U').toUpperCase()}</div>

            {!editing ? (
              <div className="pf-info">
                <h1 className="pf-name">{profile?.first_name} {profile?.last_name}</h1>
                <p className="pf-role">
                  {profile?.role === 'owner' ? '🏟️ Dueño de complejo' : '⚽ Jugador'}
                  {profile?.complex_name ? ` · ${profile.complex_name}` : ''}
                </p>
                <div className="pf-details">
                  <span>✉️ {email}</span>
                  {profile?.phone && <span>📱 {profile.phone}</span>}
                  <span>📍 {profile?.country ?? 'CR'} · Desde {memberSince}</span>
                </div>
                <button className="pf-edit-trigger" onClick={() => setEditing(true)}>
                  Editar perfil
                </button>
              </div>
            ) : (
              <div className="pf-info">
                <h2 className="pf-edit-title">Editar perfil</h2>
                <div className="pf-form">
                  <div className="pf-form-row">
                    <div className="pf-form-group">
                      <label className="pf-form-label">Nombre</label>
                      <input
                        className="pf-form-input"
                        value={editForm.first_name}
                        onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))}
                      />
                    </div>
                    <div className="pf-form-group">
                      <label className="pf-form-label">Apellido</label>
                      <input
                        className="pf-form-input"
                        value={editForm.last_name}
                        onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="pf-form-group">
                    <label className="pf-form-label">Teléfono</label>
                    <input
                      className="pf-form-input"
                      value={editForm.phone}
                      placeholder="8888-8888"
                      onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                  <div className="pf-form-actions">
                    <button className="pf-btn pf-btn--ghost" onClick={() => setEditing(false)}>
                      Cancelar
                    </button>
                    <button className="pf-btn pf-btn--green" onClick={saveProfile} disabled={saving}>
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Stats */}
          <div className="pf-stats">
            <div className="pf-stat">
              <span className="pf-stat-val">{activeBookings.length}</span>
              <span className="pf-stat-lbl">Reservas</span>
            </div>
            <div className="pf-stat">
              <span className="pf-stat-val">{favorites.length}</span>
              <span className="pf-stat-lbl">Favoritos</span>
            </div>
            <div className="pf-stat">
              <span className="pf-stat-val">{totalSpent > 0 ? fmt(totalSpent) : '—'}</span>
              <span className="pf-stat-lbl">Invertido</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="pf-tabs">
            <button
              className={`pf-tab${activeTab === 'bookings' ? ' pf-tab--on' : ''}`}
              onClick={() => setActiveTab('bookings')}
            >
              📅 Reservas {bookings.length > 0 && <span className="pf-tab-ct">{bookings.length}</span>}
            </button>
            <button
              className={`pf-tab${activeTab === 'favorites' ? ' pf-tab--on' : ''}`}
              onClick={() => setActiveTab('favorites')}
            >
              ❤️ Favoritos {favorites.length > 0 && <span className="pf-tab-ct">{favorites.length}</span>}
            </button>
          </div>

          {/* Bookings tab */}
          {activeTab === 'bookings' && (bookings.length === 0 ? (
            <div className="pf-empty">
              <span>📅</span>
              <h3>Sin reservas aún</h3>
              <p>Cuando reserves una cancha, tu historial aparecerá acá.</p>
              <Link href="/reserve" className="pf-btn pf-btn--green" style={{ textDecoration: 'none' }}>
                Explorar canchas
              </Link>
            </div>
          ) : (
            <div className="pf-list">
              {bookings.map(b => {
                const sport  = b.field_sport ? SPORT_META[b.field_sport] : null
                const st     = STATUS_CFG[b.status] ?? STATUS_CFG.confirmed
                const isPast = b.date < new Date().toISOString().split('T')[0]
                return (
                  <div key={b.id} className={`pf-bk${isPast ? ' pf-bk--past' : ''}`}>
                    <span className="pf-bk-emoji">{sport?.emoji ?? '🏟️'}</span>
                    <div className="pf-bk-body">
                      <p className="pf-bk-field">{b.field_name}</p>
                      <p className="pf-bk-date">
                        {fmtDate(b.date)} · {b.hour}
                        {b.field_location ? ` · 📍 ${b.field_location}` : ''}
                      </p>
                    </div>
                    <div className="pf-bk-end">
                      {b.price != null && <span className="pf-bk-price">{fmt(b.price)}</span>}
                      <span className="pf-bk-status" style={{ color: st.color, background: st.bg }}>
                        {st.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          {/* Favorites tab */}
          {activeTab === 'favorites' && (favorites.length === 0 ? (
            <div className="pf-empty">
              <span>❤️</span>
              <h3>Sin favoritos</h3>
              <p>Guardá canchas que te gusten para encontrarlas más rápido.</p>
              <Link href="/reserve" className="pf-btn pf-btn--green" style={{ textDecoration: 'none' }}>
                Explorar canchas
              </Link>
            </div>
          ) : (
            <div className="pf-favs">
              {favorites.map(f => {
                const sport = f.sport ? SPORT_META[f.sport] : null
                return (
                  <div
                    key={f.favoriteId}
                    className="pf-fav"
                    onClick={() => router.push(`/reserve/${f.fieldId}`)}
                  >
                    <div className="pf-fav-img" style={{ backgroundImage: `url(${f.image ?? FALLBACK_IMG})` }}>
                      {sport && <span className="pf-fav-sport">{sport.emoji} {sport.label}</span>}
                      <button
                        className="pf-fav-rm"
                        onClick={e => { e.stopPropagation(); removeFavorite(f.favoriteId) }}
                        aria-label="Quitar"
                      >✕</button>
                    </div>
                    <div className="pf-fav-body">
                      <p className="pf-fav-name">{f.name}</p>
                      {f.location && <p className="pf-fav-loc">📍 {f.location}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
@keyframes spin { to { transform: rotate(360deg); } }

.pf-content {
  max-width: 780px;
  margin: 0 auto;
  padding: calc(62px + 32px) 20px 80px;
}

.pf-loading {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  min-height: 100vh; padding-top: 62px; gap: 14px;
}
.pf-spinner {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 3px solid var(--line);
  border-top-color: var(--blue);
  animation: spin .7s linear infinite;
}
.pf-loading p {
  font-family: var(--font-d);
  font-size: 13px;
  color: var(--muted);
}

.pf-toast {
  position: fixed; bottom: 24px; right: 24px;
  z-index: 9999;
  background: var(--g6); color:#fff;
  padding: 12px 20px; border-radius: 12px;
  font-size: 13px; font-weight: 600;
  font-family: var(--font-d);
  box-shadow: 0 8px 32px rgba(58,91,240,.4);
  animation: fadeIn .2s ease;
}

.pf-card {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 28px;
  animation: fadeUp .4s ease both;
}
.pf-hero {
  display: flex; gap: 20px;
  align-items: flex-start;
  margin-bottom: 20px;
}
.pf-avatar {
  width: 64px; height: 64px;
  border-radius: 16px; flex-shrink: 0;
  background: linear-gradient(135deg, var(--g6), #26379e);
  color:#fff;
  font-family: var(--font-d);
  font-size: 26px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 20px rgba(58,91,240,.35);
}
.pf-info { flex: 1; min-width: 0; }
.pf-name {
  font-family: var(--font-d);
  font-size: 24px; font-weight: 800;
  color:var(--ink);
  letter-spacing: -.02em;
  margin-bottom: 2px;
}
.pf-role {
  font-size: 13px; color: var(--blue);
  font-weight: 500; margin-bottom: 10px;
}
.pf-details { display: flex; flex-direction: column; gap: 3px; }
.pf-details span { font-size: 12px; color: var(--muted); }

.pf-edit-trigger {
  margin-top: 14px;
  padding: 7px 16px; border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--line);
  color: var(--ink);
  font-size: 12px; font-weight: 600;
  cursor: pointer;
  font-family: var(--font-d);
  letter-spacing: .03em;
  transition: all .15s;
}
.pf-edit-trigger:hover {
  background: var(--line);
  border-color: var(--blue); color: var(--blue);
}

.pf-edit-title {
  font-family: var(--font-d);
  font-size: 16px; font-weight: 700;
  color:var(--ink); margin-bottom: 14px;
}

.pf-form { display: flex; flex-direction: column; gap: 12px; }
.pf-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pf-form-label {
  display: block; font-size: 11px; font-weight: 600;
  color: var(--muted); margin-bottom: 4px;
  text-transform: uppercase; letter-spacing: .06em;
}
.pf-form-input {
  width: 100%; padding: 10px 14px;
  border-radius: 10px;
  background: var(--line);
  border: 1px solid var(--line);
  color:var(--ink); font-size: 14px;
  font-family: inherit; outline: none;
  transition: border-color .15s;
}
.pf-form-input:focus { border-color: var(--blue); }
.pf-form-actions { display: flex; gap: 8px; margin-top: 4px; }

.pf-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 20px; border-radius: 12px;
  font-size: 13px; font-weight: 700;
  font-family: var(--font-d);
  letter-spacing: .03em;
  cursor: pointer; border: none;
  transition: all .15s;
}
.pf-btn--green {
  background: var(--g6); color:#fff;
  box-shadow: 0 3px 14px rgba(58,91,240,.35);
}
.pf-btn--green:hover { background: var(--g7); }
.pf-btn--green:disabled { opacity: .5; cursor: not-allowed; }
.pf-btn--ghost {
  background: var(--line);
  color: var(--ink);
  border: 1px solid var(--line);
}
.pf-btn--ghost:hover { background: var(--line); }

.pf-stats {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  margin-bottom: 24px;
  animation: fadeUp .45s ease both;
}
.pf-stat {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 18px; text-align: center;
}
.pf-stat-val {
  display: block;
  font-family: var(--font-d);
  font-size: 24px; font-weight: 800;
  color: var(--blue); margin-bottom: 2px;
}
.pf-stat-lbl {
  font-size: 10px; color: var(--muted);
  font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
}

.pf-tabs {
  display: flex; gap: 6px; margin-bottom: 20px;
  animation: fadeUp .5s ease both;
}
.pf-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 18px; border-radius: 12px;
  font-size: 13px; font-weight: 600;
  font-family: var(--font-d);
  border: 1px solid var(--line);
  background: #fff;
  color: var(--muted);
  cursor: pointer;
  transition: all .15s;
  letter-spacing: .02em;
}
.pf-tab:hover {
  background: var(--line);
  color: var(--ink);
}
.pf-tab--on {
  background: var(--g6); color:#fff;
  border-color: var(--g6);
}
.pf-tab-ct {
  font-size: 10px; font-weight: 800;
  padding: 2px 7px; border-radius: 999px;
  background: rgba(0,0,0,.2);
}

.pf-empty {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 60px 24px;
  text-align: center;
  animation: fadeUp .5s ease both;
}
.pf-empty > span {
  font-size: 48px; display: block; margin-bottom: 16px;
}
.pf-empty h3 {
  font-family: var(--font-d);
  font-size: 20px; font-weight: 800;
  color:var(--ink); margin-bottom: 8px;
}
.pf-empty p {
  font-size: 14px; color: var(--muted);
  margin-bottom: 24px; line-height: 1.6;
}

.pf-list {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow: hidden;
  animation: fadeUp .5s ease both;
}
.pf-bk {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid #fff;
  transition: background .1s;
}
.pf-bk:last-child { border-bottom: none; }
.pf-bk:hover { background: #fff; }
.pf-bk--past { opacity: .45; }
.pf-bk-emoji { font-size: 20px; flex-shrink: 0; }
.pf-bk-body { flex: 1; min-width: 0; }
.pf-bk-field {
  font-family: var(--font-d);
  font-size: 14px; font-weight: 600;
  color:var(--ink);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.pf-bk-date {
  font-size: 12px; color: var(--muted);
  margin-top: 1px;
}
.pf-bk-end {
  display: flex; flex-direction: column;
  align-items: flex-end; gap: 4px;
  flex-shrink: 0;
}
.pf-bk-price {
  font-family: var(--font-d);
  font-size: 14px; font-weight: 700;
  color: var(--blue);
}
.pf-bk-status {
  font-size: 10px; font-weight: 700;
  padding: 3px 9px; border-radius: 999px;
  font-family: var(--font-d);
}

.pf-favs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
  animation: fadeUp .5s ease both;
}
.pf-fav {
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: transform .2s, box-shadow .2s, border-color .2s;
  position: relative;
}
.pf-fav:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 32px rgba(20,26,51,.12);
  border-color: rgba(58,91,240,.3);
}
.pf-fav-img {
  height: 120px;
  background-size: cover;
  background-position: center;
  background-color: rgba(58,91,240,.15);
  position: relative;
}
.pf-fav-sport {
  position: absolute; top: 8px; left: 8px;
  background: rgba(0,0,0,.6);
  backdrop-filter: blur(8px);
  color:var(--ink);
  font-size: 10px; font-weight: 700;
  padding: 3px 9px; border-radius: 999px;
  font-family: var(--font-d);
  letter-spacing: .04em;
}
.pf-fav-rm {
  position: absolute; top: 8px; right: 8px;
  width: 26px; height: 26px;
  border-radius: 8px;
  background: rgba(20,26,51,.14);
  backdrop-filter: blur(4px);
  color:var(--ink);
  border: none; cursor: pointer;
  font-size: 12px;
  display: flex; align-items: center; justify-content: center;
  opacity: 0;
  transition: opacity .15s;
  font-family: inherit;
}
.pf-fav:hover .pf-fav-rm { opacity: 1; }
.pf-fav-rm:hover { background: #ef4444; }
.pf-fav-body { padding: 12px 14px; }
.pf-fav-name {
  font-family: var(--font-d);
  font-size: 14px; font-weight: 600;
  color:var(--ink); margin-bottom: 2px;
}
.pf-fav-loc {
  font-size: 11px; color: var(--muted);
}

@media (max-width: 640px) {
  .pf-content { padding: calc(62px + 20px) 16px 80px; }
  .pf-hero { flex-direction: column; align-items: center; text-align: center; }
  .pf-details { align-items: center; }
  .pf-form-row { grid-template-columns: 1fr; }
  .pf-stats { gap: 8px; }
  .pf-stat { padding: 14px 8px; }
  .pf-stat-val { font-size: 18px; }
  .pf-bk { flex-direction: column; align-items: flex-start; }
  .pf-bk-end { flex-direction: row; gap: 8px; }
  .pf-favs { grid-template-columns: 1fr; }
}
`