/**
 * GolPlay — pages/admin/tournaments/new.tsx
 * Crear un torneo nuevo
 *
 * Features:
 * - Modo "Complejo registrado" (default para owners)
 * - Modo "Venue externo" (solo super-admin)
 * - Upload de cover image a Supabase Storage
 * - Generación automática de slug
 * - Validación condicional según modo
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin'
import {
  TournamentCreatePayload,
  SportType,
  TournamentFormat,
} from '@/types/tournaments'

// ─── Types ──────────────────────────────────────────────────

type Mode = 'complex' | 'external'

interface ComplexOption {
  id: number
  name: string
  slug: string
  city: string | null
  whatsapp: string | null
}

// ─── Constantes ─────────────────────────────────────────────

const SPORT_OPTIONS: Array<{ value: SportType; label: string; emoji: string }> = [
  { value: 'futbol5',  label: 'Fútbol 5',  emoji: '⚽' },
  { value: 'futbol7',  label: 'Fútbol 7',  emoji: '⚽' },
  { value: 'futbol11', label: 'Fútbol 11', emoji: '⚽' },
  { value: 'padel',    label: 'Pádel',     emoji: '🎾' },
  { value: 'otro',     label: 'Otro',      emoji: '🏟️' },
]

const FORMAT_OPTIONS: Array<{ value: TournamentFormat; label: string; hint: string }> = [
  { value: 'manual',   label: 'Manual',              hint: 'Vos creás los partidos como quieras' },
  { value: 'knockout', label: 'Eliminación directa', hint: 'Cuartos, semis, final' },
  { value: 'groups',   label: 'Grupos',              hint: 'Fase de grupos + eliminación' },
  { value: 'league',   label: 'Liga',                hint: 'Todos contra todos' },
]

// ─── Helpers ────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

// ─── Component ──────────────────────────────────────────────

export default function NewTournamentPage() {
  const router = useRouter()
  const { isAdmin, loading: adminLoading, userId } = usePlatformAdmin()

  // ── UI state ──
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // ── Mode ──
  const [mode, setMode] = useState<Mode>('complex')

  // ── Complejos disponibles (modo "complex") ──
  const [complexes, setComplexes] = useState<ComplexOption[]>([])

  // ── Form state ──
  const [name, setName]               = useState('')
  const [slug, setSlug]               = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [rules, setRules]             = useState('')
  const [sport, setSport]             = useState<SportType>('futbol5')
  const [format, setFormat]           = useState<TournamentFormat>('manual')
  const [startDate, setStartDate]     = useState('')
  const [endDate, setEndDate]         = useState('')
  const [maxTeams, setMaxTeams]       = useState(8)
  const [pricePerTeam, setPricePerTeam] = useState(15000)

  // ── Modo "Complejo registrado" ──
  const [complexId, setComplexId] = useState<number | null>(null)

  // ── Modo "Venue externo" ──
  const [venueName, setVenueName]       = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [venueCity, setVenueCity]       = useState('')
  const [venueLat, setVenueLat]         = useState('')
  const [venueLng, setVenueLng]         = useState('')

  // ── SINPE ──
  const [sinpePhone, setSinpePhone]     = useState('')
  const [sinpeHolder, setSinpeHolder]   = useState('')
  const [contactPhone, setContactPhone] = useState('')

  // ── Cover image ──
  const [coverFile, setCoverFile]         = useState<File | null>(null)
  const [coverPreview, setCoverPreview]   = useState<string | null>(null)

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Auto-slug from name ──
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name))
  }, [name, slugTouched])

  // ── Auth check + load complejos ──
  useEffect(() => {
    if (adminLoading) return
    if (!userId) {
      router.replace('/login')
      return
    }

    ;(async () => {
      let q = supabase.from('complexes').select('id, name, slug, city, whatsapp').order('name')

      // Si NO es super-admin, solo sus complejos
      if (!isAdmin) {
        q = q.eq('owner_id', userId)
      }

      const { data, error } = await q

      if (error) {
        console.error('Error cargando complejos:', error)
        setComplexes([])
      } else {
        setComplexes(data ?? [])
        // Auto-seleccionar el primer complejo si hay solo uno
        if (data && data.length === 1) {
          const c = data[0]
          setComplexId(c.id)
          if (c.whatsapp) {
            setSinpePhone(c.whatsapp)
            setContactPhone(c.whatsapp)
          }
        }
      }
      setLoading(false)
    })()
  }, [adminLoading, isAdmin, userId, router])

  // ── Cover preview ──
  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null)
      return
    }
    const url = URL.createObjectURL(coverFile)
    setCoverPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [coverFile])

  // ── Cuando cambia complejo, autocompletar SINPE ──
  const onSelectComplex = (id: number) => {
    setComplexId(id)
    const c = complexes.find(x => x.id === id)
    if (c?.whatsapp) {
      if (!sinpePhone)   setSinpePhone(c.whatsapp)
      if (!contactPhone) setContactPhone(c.whatsapp)
    }
  }

  // ── Validation ──
  const isValid = useMemo(() => {
    if (!name.trim() || !slug.trim() || !startDate) return false
    if (maxTeams < 1) return false
    if (pricePerTeam < 0) return false

    if (mode === 'complex') {
      if (!complexId) return false
    } else {
      if (!venueName.trim()) return false
      if (!sinpePhone.trim() || !sinpeHolder.trim()) return false
    }

    return true
  }, [name, slug, startDate, maxTeams, pricePerTeam, mode, complexId, venueName, sinpePhone, sinpeHolder])

  // ── Submit ──
  const handleSubmit = async () => {
    setError('')

    if (!isValid) {
      setError('Completá los campos requeridos')
      return
    }
    if (!userId) return

    // Validar fechas
    if (endDate && endDate < startDate) {
      setError('La fecha de cierre no puede ser anterior a la de inicio')
      return
    }

    setSaving(true)

    // ── 1. Subir cover image si hay ──
    let coverUrl: string | null = null
    if (coverFile) {
      const ext = coverFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
      const fileName = `${slug}-${Date.now()}.${ext}`
      const { error: upErr } = await supabase
        .storage
        .from('tournament-covers')
        .upload(fileName, coverFile, {
          cacheControl: '3600',
          upsert: false,
        })

      if (upErr) {
        setError('Error subiendo imagen: ' + upErr.message)
        setSaving(false)
        return
      }

      const { data: pub } = supabase
        .storage
        .from('tournament-covers')
        .getPublicUrl(fileName)
      coverUrl = pub.publicUrl
    }

    // ── 2. Construir payload ──
    const payload: TournamentCreatePayload = {
      is_external: mode === 'external',
      complex_id:  mode === 'complex' ? complexId : null,
      venue_name:    mode === 'external' ? venueName.trim()    : null,
      venue_address: mode === 'external' ? venueAddress.trim() || null : null,
      venue_city:    mode === 'external' ? venueCity.trim()    || null : null,
      venue_lat:     mode === 'external' && venueLat ? Number(venueLat) : null,
      venue_lng:     mode === 'external' && venueLng ? Number(venueLng) : null,
      managed_by: userId,
      slug: slug.trim(),
      name: name.trim(),
      description: description.trim() || null,
      rules: rules.trim() || null,
      sport_type: sport,
      format,
      start_date: startDate,
      end_date: endDate || null,
      max_teams: maxTeams,
      price_per_team: pricePerTeam,
      cover_image_url: coverUrl,
      status: 'DRAFT',
      sinpe_phone:   sinpePhone.trim()   || null,
      sinpe_holder:  sinpeHolder.trim()  || null,
      contact_phone: contactPhone.trim() || null,
    }

    // ── 3. Insert ──
    const { data, error: insErr } = await supabase
      .from('tournaments')
      .insert(payload)
      .select('id')
      .single()

    if (insErr) {
      // Manejo de error de slug duplicado
      if (insErr.code === '23505') {
        setError('Ya existe un torneo con ese slug. Cambialo y volvé a intentar.')
      } else {
        setError(insErr.message)
      }
      setSaving(false)
      return
    }

    showToast('Torneo creado · Status: Borrador')
    setSaving(false)
    router.push(`/admin/tournaments/${data.id}`)
  }

  // ── Render ──
  if (loading || adminLoading) {
    return (
      <AdminLayout>
        <style>{CSS}</style>
        <div className="tn-new">
          <div className="tn-new__loader">Cargando…</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <style>{CSS}</style>

      {toast && (
        <div className={`tn-toast ${toast.ok ? 'tn-toast--ok' : 'tn-toast--err'}`}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      <div className="tn-new">
        {/* Header */}
        <div className="tn-new__header">
          <div>
            <Link href="/admin/tournaments" className="tn-new__back">← Volver a torneos</Link>
            <h1 className="tn-new__title">🏆 Nuevo torneo</h1>
            <p className="tn-new__sub">Se crea como <strong>borrador</strong>. Vas a poder publicarlo después.</p>
          </div>
        </div>

        {/* Mode selector — solo super-admin */}
        {isAdmin && (
          <div className="tn-new__section">
            <h2 className="tn-new__section-title">¿Dónde se juega?</h2>
            <div className="tn-new__modes">
              <button
                type="button"
                className={`tn-new__mode ${mode === 'complex' ? 'tn-new__mode--sel' : ''}`}
                onClick={() => setMode('complex')}
              >
                <span className="tn-new__mode-emoji">🏟️</span>
                <div>
                  <p className="tn-new__mode-title">Complejo registrado</p>
                  <p className="tn-new__mode-desc">El torneo se juega en un complejo de GolPlay</p>
                </div>
              </button>
              <button
                type="button"
                className={`tn-new__mode ${mode === 'external' ? 'tn-new__mode--sel' : ''}`}
                onClick={() => setMode('external')}
              >
                <span className="tn-new__mode-emoji">📍</span>
                <div>
                  <p className="tn-new__mode-title">Venue externo</p>
                  <p className="tn-new__mode-desc">El complejo no está en GolPlay todavía. Lo organizo yo.</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Selector de complejo (modo complex) */}
        {mode === 'complex' && (
          <div className="tn-new__section">
            <h2 className="tn-new__section-title">Complejo *</h2>
            {complexes.length === 0 ? (
              <div className="tn-new__warning">
                ⚠️ No tenés complejos disponibles. {isAdmin ? 'Cambiá a "Venue externo" arriba.' : 'Creá un complejo primero.'}
              </div>
            ) : (
              <div className="tn-new__complexes">
                {complexes.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    className={`tn-new__complex ${complexId === c.id ? 'tn-new__complex--sel' : ''}`}
                    onClick={() => onSelectComplex(c.id)}
                  >
                    <span className="tn-new__complex-name">{c.name}</span>
                    {c.city && <span className="tn-new__complex-city">{c.city}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Datos del venue externo */}
        {mode === 'external' && (
          <div className="tn-new__section">
            <h2 className="tn-new__section-title">Datos del venue</h2>

            <div className="tn-new__field">
              <label className="tn-new__label">Nombre del venue *</label>
              <input
                className="tn-new__input"
                placeholder="Ej: Cancha Los Almendros"
                value={venueName}
                onChange={e => setVenueName(e.target.value)}
              />
            </div>

            <div className="tn-new__grid-2">
              <div className="tn-new__field">
                <label className="tn-new__label">Dirección</label>
                <input
                  className="tn-new__input"
                  placeholder="Ej: 200m norte de la iglesia"
                  value={venueAddress}
                  onChange={e => setVenueAddress(e.target.value)}
                />
              </div>
              <div className="tn-new__field">
                <label className="tn-new__label">Ciudad</label>
                <input
                  className="tn-new__input"
                  placeholder="Ej: San José"
                  value={venueCity}
                  onChange={e => setVenueCity(e.target.value)}
                />
              </div>
            </div>

            <div className="tn-new__grid-2">
              <div className="tn-new__field">
                <label className="tn-new__label">Latitud (opcional)</label>
                <input
                  className="tn-new__input"
                  placeholder="Ej: 9.9325"
                  value={venueLat}
                  onChange={e => setVenueLat(e.target.value)}
                />
              </div>
              <div className="tn-new__field">
                <label className="tn-new__label">Longitud (opcional)</label>
                <input
                  className="tn-new__input"
                  placeholder="Ej: -84.0795"
                  value={venueLng}
                  onChange={e => setVenueLng(e.target.value)}
                />
              </div>
            </div>
            <p className="tn-new__hint">📍 Lat/Lng te lo da Google Maps haciendo click derecho sobre el lugar.</p>
          </div>
        )}

        {/* Datos del torneo */}
        <div className="tn-new__section">
          <h2 className="tn-new__section-title">Datos del torneo</h2>

          <div className="tn-new__field">
            <label className="tn-new__label">Nombre del torneo *</label>
            <input
              className="tn-new__input"
              placeholder="Ej: Copa Verano 2026"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="tn-new__field">
            <label className="tn-new__label">Slug (URL pública)</label>
            <div className="tn-new__slug">
              <span className="tn-new__slug-prefix">golplay.app/torneos/</span>
              <input
                className="tn-new__input tn-new__input--slug"
                placeholder="copa-verano-2026"
                value={slug}
                onChange={e => { setSlug(slugify(e.target.value)); setSlugTouched(true) }}
              />
            </div>
            <p className="tn-new__hint">Se genera automáticamente. Editalo si querés.</p>
          </div>

          <div className="tn-new__field">
            <label className="tn-new__label">Deporte *</label>
            <div className="tn-new__chips">
              {SPORT_OPTIONS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  className={`tn-new__chip ${sport === s.value ? 'tn-new__chip--sel' : ''}`}
                  onClick={() => setSport(s.value)}
                >
                  <span>{s.emoji}</span> {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="tn-new__field">
            <label className="tn-new__label">Formato</label>
            <div className="tn-new__chips">
              {FORMAT_OPTIONS.map(f => (
                <button
                  key={f.value}
                  type="button"
                  className={`tn-new__chip ${format === f.value ? 'tn-new__chip--sel' : ''}`}
                  onClick={() => setFormat(f.value)}
                  title={f.hint}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <p className="tn-new__hint">El formato es solo etiqueta visual. Vos manejás los partidos como quieras.</p>
          </div>

          <div className="tn-new__grid-2">
            <div className="tn-new__field">
              <label className="tn-new__label">Fecha inicio *</label>
              <input
                className="tn-new__input"
                type="date"
                min={todayStr()}
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="tn-new__field">
              <label className="tn-new__label">Fecha cierre (opcional)</label>
              <input
                className="tn-new__input"
                type="date"
                min={startDate || todayStr()}
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="tn-new__grid-2">
            <div className="tn-new__field">
              <label className="tn-new__label">Cupo de equipos *</label>
              <input
                className="tn-new__input"
                type="number"
                min={2}
                value={maxTeams}
                onChange={e => setMaxTeams(Number(e.target.value))}
              />
            </div>
            <div className="tn-new__field">
              <label className="tn-new__label">Precio por equipo (₡) *</label>
              <input
                className="tn-new__input"
                type="number"
                min={0}
                step={500}
                value={pricePerTeam}
                onChange={e => setPricePerTeam(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="tn-new__field">
            <label className="tn-new__label">Descripción (opcional)</label>
            <textarea
              className="tn-new__textarea"
              rows={3}
              placeholder="Ej: Torneo de fin de temporada, premio en efectivo al campeón."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="tn-new__field">
            <label className="tn-new__label">Reglas (opcional)</label>
            <textarea
              className="tn-new__textarea"
              rows={4}
              placeholder="Ej: Partidos de 50min · 5 cambios · 7 jugadores por nómina · No se aceptan cancelaciones después del 1 de junio."
              value={rules}
              onChange={e => setRules(e.target.value)}
            />
          </div>
        </div>

        {/* SINPE */}
        <div className="tn-new__section">
          <h2 className="tn-new__section-title">Datos para cobrar (SINPE)</h2>
          <p className="tn-new__section-sub">
            Los equipos van a hacer SINPE a este número para inscribirse. Vos validás cada pago manualmente.
          </p>

          <div className="tn-new__grid-2">
            <div className="tn-new__field">
              <label className="tn-new__label">
                Teléfono SINPE {mode === 'external' && '*'}
              </label>
              <input
                className="tn-new__input"
                type="tel"
                placeholder="8888-8888"
                value={sinpePhone}
                onChange={e => setSinpePhone(e.target.value)}
              />
            </div>
            <div className="tn-new__field">
              <label className="tn-new__label">
                Nombre del titular {mode === 'external' && '*'}
              </label>
              <input
                className="tn-new__input"
                placeholder="Ej: Juan Pérez"
                value={sinpeHolder}
                onChange={e => setSinpeHolder(e.target.value)}
              />
            </div>
          </div>

          <div className="tn-new__field">
            <label className="tn-new__label">WhatsApp de contacto (público)</label>
            <input
              className="tn-new__input"
              type="tel"
              placeholder="8888-8888"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
            />
            <p className="tn-new__hint">Aparece visible en la página pública del torneo para dudas de los equipos.</p>
          </div>
        </div>

        {/* Cover image */}
        <div className="tn-new__section">
          <h2 className="tn-new__section-title">Imagen de portada (opcional)</h2>
          <p className="tn-new__section-sub">JPG o PNG, idealmente 1200x630px. Aparece en cards y en la página pública.</p>

          <label className="tn-new__cover-upload">
            {coverPreview ? (
              <img src={coverPreview} alt="Preview" className="tn-new__cover-preview" />
            ) : (
              <div className="tn-new__cover-empty">
                <span style={{ fontSize: 32 }}>📸</span>
                <span>Click para subir imagen</span>
              </div>
            )}
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) {
                  if (f.size > 5 * 1024 * 1024) {
                    showToast('La imagen es muy grande (máx 5MB)', false)
                    return
                  }
                  setCoverFile(f)
                }
              }}
            />
          </label>

          {coverFile && (
            <button
              type="button"
              className="tn-new__cover-remove"
              onClick={() => setCoverFile(null)}
            >
              ✕ Quitar imagen
            </button>
          )}
        </div>

        {/* Error */}
        {error && <div className="tn-new__error">⚠️ {error}</div>}

        {/* Actions */}
        <div className="tn-new__actions">
          <Link href="/admin/tournaments" className="tn-btn tn-btn--ghost">Cancelar</Link>
          <button
            type="button"
            className="tn-btn tn-btn--primary"
            onClick={handleSubmit}
            disabled={saving || !isValid}
          >
            {saving ? 'Creando…' : '🏆 Crear torneo (borrador)'}
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}

// ─── CSS ────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');

.tn-new { max-width: 760px; margin: 0 auto; padding: 28px 20px 80px; font-family: 'DM Sans', sans-serif; }
.tn-new__loader { padding: 60px; text-align: center; color: #94a3b8; }

.tn-new__header { margin-bottom: 28px; }
.tn-new__back { font-size: 13px; color: #64748b; text-decoration: none; font-weight: 500; display: inline-block; margin-bottom: 8px; }
.tn-new__back:hover { color: #16a34a; }
.tn-new__title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; }
.tn-new__sub { font-size: 13px; color: #94a3b8; margin: 6px 0 0; }
.tn-new__sub strong { color: #0f172a; font-weight: 700; }

.tn-new__section { background: white; border: 1px solid #eaecf0; border-radius: 16px; padding: 22px; margin-bottom: 16px; }
.tn-new__section-title { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0 0 4px; }
.tn-new__section-sub { font-size: 12px; color: #94a3b8; margin: 0 0 16px; }

.tn-new__field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.tn-new__field:last-child { margin-bottom: 0; }
.tn-new__grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.tn-new__label { font-size: 12px; font-weight: 600; color: #374151; margin: 0; }
.tn-new__hint { font-size: 11px; color: #94a3b8; margin: 0; }

.tn-new__input, .tn-new__textarea { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; font-size: 13px; font-family: inherit; color: #0f172a; outline: none; transition: border-color .15s; background: white; box-sizing: border-box; }
.tn-new__input:focus, .tn-new__textarea:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,.08); }
.tn-new__textarea { resize: vertical; min-height: 70px; line-height: 1.5; }

.tn-new__slug { display: flex; align-items: stretch; border: 1.5px solid #e2e8f0; border-radius: 10px; overflow: hidden; transition: border-color .15s; background: white; }
.tn-new__slug:focus-within { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,.08); }
.tn-new__slug-prefix { display: flex; align-items: center; padding: 0 12px; background: #f8fafc; color: #64748b; font-size: 12px; font-weight: 500; border-right: 1px solid #e2e8f0; white-space: nowrap; }
.tn-new__input--slug { border: none !important; box-shadow: none !important; padding-left: 12px; }
.tn-new__input--slug:focus { box-shadow: none !important; }

.tn-new__chips { display: flex; gap: 6px; flex-wrap: wrap; }
.tn-new__chip { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: white; cursor: pointer; font-family: inherit; font-size: 12.5px; font-weight: 600; color: #374151; transition: all .12s; }
.tn-new__chip:hover { border-color: #16a34a; background: #f0fdf4; }
.tn-new__chip--sel { border-color: #16a34a; background: #16a34a; color: white; }

.tn-new__modes { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.tn-new__mode { display: flex; align-items: flex-start; gap: 12px; padding: 16px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: white; cursor: pointer; font-family: inherit; text-align: left; transition: all .15s; }
.tn-new__mode:hover { border-color: #16a34a; background: #f0fdf4; }
.tn-new__mode--sel { border-color: #16a34a; background: #f0fdf4; }
.tn-new__mode-emoji { font-size: 24px; flex-shrink: 0; }
.tn-new__mode-title { font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
.tn-new__mode-desc { font-size: 11px; color: #64748b; margin: 0; line-height: 1.4; }

.tn-new__complexes { display: flex; flex-direction: column; gap: 6px; }
.tn-new__complex { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: 10px; border: 1.5px solid #e2e8f0; background: white; cursor: pointer; font-family: inherit; transition: all .12s; text-align: left; }
.tn-new__complex:hover { border-color: #16a34a; background: #f0fdf4; }
.tn-new__complex--sel { border-color: #16a34a; background: #f0fdf4; }
.tn-new__complex-name { font-size: 13px; font-weight: 600; color: #0f172a; }
.tn-new__complex-city { font-size: 11px; color: #94a3b8; }

.tn-new__warning { padding: 12px 16px; border-radius: 10px; background: #fffbeb; border: 1px solid #fcd34d; font-size: 12px; color: #92400e; font-weight: 500; }

.tn-new__cover-upload { display: block; width: 100%; cursor: pointer; border-radius: 12px; overflow: hidden; border: 1.5px dashed #e2e8f0; transition: border-color .15s; }
.tn-new__cover-upload:hover { border-color: #16a34a; }
.tn-new__cover-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 40px; color: #94a3b8; font-size: 13px; font-weight: 500; }
.tn-new__cover-preview { width: 100%; height: 220px; object-fit: cover; display: block; }
.tn-new__cover-remove { margin-top: 8px; padding: 6px 12px; border: none; background: transparent; color: #ef4444; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
.tn-new__cover-remove:hover { text-decoration: underline; }

.tn-new__error { padding: 12px 16px; border-radius: 10px; background: #fef2f2; border: 1px solid #fecaca; font-size: 13px; color: #b91c1c; font-weight: 600; margin-bottom: 14px; }

.tn-new__actions { display: flex; gap: 10px; justify-content: flex-end; }
.tn-new__actions .tn-btn { padding: 12px 24px; }

.tn-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; font-family: inherit; cursor: pointer; border: none; transition: all .15s; text-decoration: none; }
.tn-btn--primary { background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; box-shadow: 0 2px 12px rgba(22,163,74,.25); }
.tn-btn--primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 20px rgba(22,163,74,.35); }
.tn-btn--primary:disabled { opacity: .4; cursor: not-allowed; transform: none; }
.tn-btn--ghost { background: #f1f5f9; color: #374151; }
.tn-btn--ghost:hover { background: #e2e8f0; }

.tn-toast { position: fixed; bottom: 28px; right: 28px; z-index: 9999; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 600; font-family: 'DM Sans', sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,.18); }
.tn-toast--ok { background: #0f172a; color: white; }
.tn-toast--err { background: #ef4444; color: white; }

@media (max-width: 640px) {
  .tn-new { padding: 20px 16px 60px; }
  .tn-new__title { font-size: 22px; }
  .tn-new__grid-2 { grid-template-columns: 1fr; }
  .tn-new__modes { grid-template-columns: 1fr; }
  .tn-new__actions { flex-direction: column-reverse; }
  .tn-new__actions .tn-btn { width: 100%; justify-content: center; }
}
`