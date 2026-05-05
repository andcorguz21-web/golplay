/**
 * GolPlay — pages/retos/publicar.tsx
 * Form público para publicar un reto
 *
 * 3 escenarios de venue:
 *  - golplay: autocomplete complejo + cancha
 *  - external: nombre + ciudad + maps url
 *  - tbd: solo zona
 */

import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface Complex {
  id: number
  name: string
  city: string | null
  slug: string
  whatsapp: string | null
}

interface Field {
  id: number
  name: string | null
  complex_id: number | null
  sport: string | null
}

interface Props {
  complexes: Complex[]
  fields: Field[]
}

const SPORT_OPTIONS = [
  { value: 'futbol5', label: 'Fútbol 5', emoji: '⚽' },
  { value: 'futbol7', label: 'Fútbol 7', emoji: '⚽' },
  { value: 'futbol8', label: 'Fútbol 8', emoji: '⚽' },
  { value: 'futbol11', label: 'Fútbol 11', emoji: '⚽' },
  { value: 'padel', label: 'Pádel', emoji: '🎾' },
  { value: 'tenis', label: 'Tenis', emoji: '🎾' },
  { value: 'basquet', label: 'Básquet', emoji: '🏀' },
  { value: 'otro', label: 'Otro', emoji: '🏟' },
]

const HOURS = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00',
]

const todayStr = () => new Date().toISOString().split('T')[0]
const onlyDigits = (s: string, max?: number) => {
  const d = s.replace(/\D/g, '')
  return max ? d.slice(0, max) : d
}

export const getServerSideProps: GetServerSideProps<Props> = async () => {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: complexes } = await sb
    .from('complexes')
    .select('id, name, city, slug, whatsapp')
    .eq('active', true)
    .order('name')

  const { data: fields } = await sb
    .from('fields')
    .select('id, name, complex_id, sport')
    .eq('active', true)

  return {
    props: {
      complexes: (complexes ?? []) as Complex[],
      fields: (fields ?? []) as Field[],
    },
  }
}

export default function PublicarRetoPage({ complexes, fields }: Props) {
  const router = useRouter()

  // Capitán
  const [cedula, setCedula] = useState('')
  const [teamName, setTeamName] = useState('')
  const [captainName, setCaptainName] = useState('')
  const [captainPhone, setCaptainPhone] = useState('')
  const [captainEmail, setCaptainEmail] = useState('')

  // Match
  const [sport, setSport] = useState('futbol5')
  const [matchDate, setMatchDate] = useState('')
  const [matchHour, setMatchHour] = useState('')
  const [description, setDescription] = useState('')

  // Venue
  const [venueType, setVenueType] = useState<'golplay'|'external'|'tbd'>('external')

  // Venue: golplay
  const [complexQuery, setComplexQuery] = useState('')
  const [selectedComplex, setSelectedComplex] = useState<Complex | null>(null)
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null)

  // Venue: external
  const [venueName, setVenueName] = useState('')
  const [venueCity, setVenueCity] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [venueMapsUrl, setVenueMapsUrl] = useState('')
  const [fieldLabel, setFieldLabel] = useState('')

  // Venue: tbd
  const [tbdCity, setTbdCity] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Pre-cargar datos del capitán si ya publicó/aceptó antes (cedula en localStorage)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('golplay_captain_data')
      if (saved) {
        const d = JSON.parse(saved)
        if (d.cedula) setCedula(d.cedula)
        if (d.captain_name) setCaptainName(d.captain_name)
        if (d.captain_phone) setCaptainPhone(d.captain_phone)
        if (d.captain_email) setCaptainEmail(d.captain_email)
      }
    } catch {}
  }, [])

  const filteredComplexes = useMemo(() => {
    if (!complexQuery.trim()) return complexes.slice(0, 8)
    const q = complexQuery.toLowerCase()
    return complexes
      .filter(c => c.name.toLowerCase().includes(q) || c.city?.toLowerCase().includes(q))
      .slice(0, 8)
  }, [complexes, complexQuery])

  const fieldsOfComplex = useMemo(() => {
    if (!selectedComplex) return []
    return fields.filter(f => f.complex_id === selectedComplex.id)
  }, [fields, selectedComplex])

  const canSubmit = useMemo(() => {
    if (cedula.length !== 9) return false
    if (!teamName.trim()) return false
    if (!captainName.trim()) return false
    if (captainPhone.length !== 8) return false
    if (!sport) return false
    if (venueType === 'golplay' && !selectedComplex) return false
    if (venueType === 'external' && (!venueName.trim() || !venueCity.trim())) return false
    if (venueType === 'tbd' && !tbdCity.trim()) return false
    return true
  }, [cedula, teamName, captainName, captainPhone, sport, venueType, selectedComplex, venueName, venueCity, tbdCity])

  const handleSubmit = async () => {
    setError('')
    if (!canSubmit) {
      setError('Completá todos los campos obligatorios')
      return
    }

    setSubmitting(true)

    const payload: any = {
      cedula,
      team_name: teamName.trim(),
      captain_name: captainName.trim(),
      captain_phone: captainPhone,
      captain_email: captainEmail.trim() || null,
      sport,
      match_date: matchDate || null,
      match_hour: matchHour || null,
      description: description.trim() || null,
      venue_type: venueType,
    }

    if (venueType === 'golplay') {
      payload.complex_id = selectedComplex!.id
      if (selectedFieldId) payload.field_id = selectedFieldId
    } else if (venueType === 'external') {
      payload.venue_name = venueName.trim()
      payload.venue_city = venueCity.trim()
      payload.venue_address = venueAddress.trim() || null
      payload.venue_maps_url = venueMapsUrl.trim() || null
      payload.field_label = fieldLabel.trim() || null
    } else {
      payload.venue_city = tbdCity.trim()
    }

    const { data, error: fnErr } = await supabase.functions.invoke('manage-challenge?action=create', {
      body: payload,
    })

    setSubmitting(false)

    if (fnErr || !data?.ok) {
      const msg = (data as any)?.error ?? fnErr?.message ?? 'Error publicando reto'
      setError(msg)
      return
    }

    // Guardar capitán en localStorage para próximas veces
    try {
      localStorage.setItem('golplay_captain_data', JSON.stringify({
        cedula, captain_name: captainName, captain_phone: captainPhone, captain_email: captainEmail,
      }))

      // Guardar este reto en mis-retos
      const stored = localStorage.getItem('golplay_my_challenges')
      const arr = stored ? JSON.parse(stored) : []
      arr.unshift({
        slug: data.slug,
        role: 'publisher',
        token: data.publisher_token,
        team_name: teamName,
        saved_at: new Date().toISOString(),
      })
      localStorage.setItem('golplay_my_challenges', JSON.stringify(arr.slice(0, 20)))
    } catch {}

    // Redirigir al detalle del reto
    router.push(`/retos/${data.slug}?ref=${data.publisher_token}&just_created=1`)
  }

  return (
    <>
      <Head>
        <title>Publicar reto · GolPlay</title>
        <meta name="robots" content="noindex" />
      </Head>
      <style jsx global>{GLOBAL_CSS}</style>
      <style>{CSS}</style>

      <div className="pb">
        <div className="pb-top">
          <Link href="/retos" className="pb-top__back">← Volver al feed</Link>
          <Link href="/" className="pb-top__brand">GolPlay</Link>
        </div>

        <div className="pb-stage">
          <p className="pb-eyebrow">PUBLICAR RETO</p>
          <h1 className="pb-h1">Buscá rival</h1>
          <p className="pb-lead">Otros capitanes van a ver tu reto y aceptarlo. Después se ponen de acuerdo por WhatsApp.</p>

          {/* SECCIÓN: Capitán */}
          <h2 className="pb-section">👤 Tus datos como capitán</h2>

          <div className="pb-field">
            <label className="pb-label">Cédula * <span className="pb-label-sub">(9 dígitos · construye tu reputación)</span></label>
            <input className="pb-input" type="tel" inputMode="numeric" placeholder="123456789" value={cedula} onChange={e => setCedula(onlyDigits(e.target.value, 9))} maxLength={9} />
          </div>

          <div className="pb-field">
            <label className="pb-label">Nombre del equipo *</label>
            <input className="pb-input" placeholder="Ej: Los Cracks FC" value={teamName} onChange={e => setTeamName(e.target.value)} maxLength={50} />
          </div>

          <div className="pb-field">
            <label className="pb-label">Tu nombre completo *</label>
            <input className="pb-input" placeholder="Tu nombre" value={captainName} onChange={e => setCaptainName(e.target.value)} maxLength={80} />
          </div>

          <div className="pb-grid-2">
            <div className="pb-field">
              <label className="pb-label">Teléfono *</label>
              <input className="pb-input" type="tel" inputMode="numeric" placeholder="8888-8888" value={captainPhone} onChange={e => setCaptainPhone(onlyDigits(e.target.value, 8))} />
            </div>
            <div className="pb-field">
              <label className="pb-label">Email (opcional)</label>
              <input className="pb-input" type="email" placeholder="tu@email.com" value={captainEmail} onChange={e => setCaptainEmail(e.target.value)} />
            </div>
          </div>

          {/* SECCIÓN: Match */}
          <h2 className="pb-section">⚔️ Detalles del partido</h2>

          <div className="pb-field">
            <label className="pb-label">Deporte *</label>
            <div className="pb-chips">
              {SPORT_OPTIONS.map(s => (
                <button key={s.value} type="button" className={`pb-chip ${sport === s.value ? 'pb-chip--sel' : ''}`} onClick={() => setSport(s.value)}>
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pb-grid-2">
            <div className="pb-field">
              <label className="pb-label">Fecha (opcional si "a definir")</label>
              <input className="pb-input" type="date" min={todayStr()} value={matchDate} onChange={e => setMatchDate(e.target.value)} />
            </div>
            <div className="pb-field">
              <label className="pb-label">Hora (opcional)</label>
              <select className="pb-input" value={matchHour} onChange={e => setMatchHour(e.target.value)}>
                <option value="">— Sin definir —</option>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div className="pb-field">
            <label className="pb-label">Descripción / nivel (opcional)</label>
            <input className="pb-input" placeholder="Ej: Nivel intermedio, traemos pelota, sin árbitro" value={description} onChange={e => setDescription(e.target.value)} maxLength={200} />
          </div>

          {/* SECCIÓN: Venue */}
          <h2 className="pb-section">📍 ¿Dónde van a jugar?</h2>

          <div className="pb-venue-tabs">
            <button type="button" className={`pb-venue-tab ${venueType === 'golplay' ? 'pb-venue-tab--sel' : ''}`} onClick={() => setVenueType('golplay')}>
              <span>🏟</span>
              <div>
                <strong>Cancha en GolPlay</strong>
                <small>Complejo registrado y verificado</small>
              </div>
            </button>
            <button type="button" className={`pb-venue-tab ${venueType === 'external' ? 'pb-venue-tab--sel' : ''}`} onClick={() => setVenueType('external')}>
              <span>📍</span>
              <div>
                <strong>Otra cancha</strong>
                <small>Cualquier cancha de tu zona</small>
              </div>
            </button>
            <button type="button" className={`pb-venue-tab ${venueType === 'tbd' ? 'pb-venue-tab--sel' : ''}`} onClick={() => setVenueType('tbd')}>
              <span>🤝</span>
              <div>
                <strong>A definir</strong>
                <small>Lo decidimos con el rival</small>
              </div>
            </button>
          </div>

          {venueType === 'golplay' && (
            <>
              <div className="pb-field">
                <label className="pb-label">Buscar complejo *</label>
                <input className="pb-input" placeholder="Escribí el nombre del complejo o ciudad" value={complexQuery} onChange={e => { setComplexQuery(e.target.value); setSelectedComplex(null); setSelectedFieldId(null) }} />
                {complexQuery && !selectedComplex && (
                  <div className="pb-suggestions">
                    {filteredComplexes.length === 0 ? (
                      <p className="pb-no-results">No encontramos complejos con esa búsqueda.</p>
                    ) : filteredComplexes.map(c => (
                      <button key={c.id} type="button" className="pb-suggestion" onClick={() => { setSelectedComplex(c); setComplexQuery(c.name) }}>
                        <strong>{c.name}</strong>
                        {c.city && <span> · {c.city}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {selectedComplex && (
                  <div className="pb-selected">
                    ✓ {selectedComplex.name}{selectedComplex.city && ` · ${selectedComplex.city}`}
                    <button type="button" onClick={() => { setSelectedComplex(null); setComplexQuery(''); setSelectedFieldId(null) }}>cambiar</button>
                  </div>
                )}
              </div>

              {selectedComplex && fieldsOfComplex.length > 0 && (
                <div className="pb-field">
                  <label className="pb-label">Cancha (opcional)</label>
                  <select className="pb-input" value={selectedFieldId ?? ''} onChange={e => setSelectedFieldId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">— Cualquiera —</option>
                    {fieldsOfComplex.map(f => <option key={f.id} value={f.id}>{f.name ?? `Cancha ${f.id}`}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          {venueType === 'external' && (
            <>
              <div className="pb-field">
                <label className="pb-label">Nombre del lugar *</label>
                <input className="pb-input" placeholder="Ej: Cancha Sintética El Naranjo" value={venueName} onChange={e => setVenueName(e.target.value)} maxLength={80} />
              </div>
              <div className="pb-grid-2">
                <div className="pb-field">
                  <label className="pb-label">Ciudad *</label>
                  <input className="pb-input" placeholder="Heredia, San José, etc." value={venueCity} onChange={e => setVenueCity(e.target.value)} maxLength={50} />
                </div>
                <div className="pb-field">
                  <label className="pb-label">Cancha (opcional)</label>
                  <input className="pb-input" placeholder="Ej: Cancha 2" value={fieldLabel} onChange={e => setFieldLabel(e.target.value)} maxLength={50} />
                </div>
              </div>
              <div className="pb-field">
                <label className="pb-label">Dirección referencial (opcional)</label>
                <input className="pb-input" placeholder="200m sur de la iglesia central" value={venueAddress} onChange={e => setVenueAddress(e.target.value)} maxLength={150} />
              </div>
              <div className="pb-field">
                <label className="pb-label">Link de Google Maps (recomendado)</label>
                <input className="pb-input" type="url" placeholder="https://maps.google.com/..." value={venueMapsUrl} onChange={e => setVenueMapsUrl(e.target.value)} />
                <p className="pb-hint">Pegá el link de Maps para que el rival sepa exactamente dónde es.</p>
              </div>
            </>
          )}

          {venueType === 'tbd' && (
            <div className="pb-field">
              <label className="pb-label">Zona / ciudad preferida *</label>
              <input className="pb-input" placeholder="Ej: San José centro, Heredia, Cartago" value={tbdCity} onChange={e => setTbdCity(e.target.value)} maxLength={50} />
              <p className="pb-hint">Solo indicá la zona. Lo demás lo arreglás con el rival por WhatsApp.</p>
            </div>
          )}

          {error && <div className="pb-error">⚠️ {error}</div>}

          <button type="button" className="pb-btn pb-btn--primary pb-btn--full" onClick={handleSubmit} disabled={submitting || !canSubmit}>
            {submitting ? 'Publicando…' : '📢 Publicar reto'}
          </button>

          <p className="pb-fineprint">
            Al publicar, tus datos quedan privados. Solo se muestra el nombre del equipo y tu nombre de pila. Otros capitanes te van a contactar después de aceptar el reto.
          </p>
        </div>
      </div>
    </>
  )
}

const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Serif+Display:ital@0;1&display=swap');
html, body { margin: 0; padding: 0; background: #0C0D0B; color: #F5F2EC; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
* { box-sizing: border-box; }
`

const CSS = `
.pb { min-height: 100vh; background: #0C0D0B; padding-bottom: 80px; }

.pb-top { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; max-width: 600px; margin: 0 auto; }
.pb-top__back { font-size: 13px; color: rgba(245,242,236,.6); text-decoration: none; font-weight: 500; }
.pb-top__back:hover { color: #4ade80; }
.pb-top__brand { font-family: 'DM Serif Display', serif; font-size: 18px; color: #F5F2EC; text-decoration: none; }

.pb-stage { max-width: 540px; margin: 0 auto; padding: 16px 22px 0; }

.pb-eyebrow { font-size: 11px; font-weight: 700; color: #4ade80; text-transform: uppercase; letter-spacing: .12em; margin: 0 0 12px; }
.pb-h1 { font-family: 'DM Serif Display', serif; font-size: 38px; line-height: 1.05; letter-spacing: -.02em; color: #F5F2EC; margin: 0 0 14px; }
.pb-lead { font-size: 15px; color: rgba(245,242,236,.7); line-height: 1.6; margin: 0 0 32px; }

.pb-section { font-family: 'DM Serif Display', serif; font-size: 22px; color: #F5F2EC; margin: 32px 0 16px; }
.pb-section:first-of-type { margin-top: 0; }

.pb-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.pb-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
.pb-grid-2 .pb-field { margin-bottom: 0; }
.pb-label { font-size: 12px; font-weight: 700; color: rgba(245,242,236,.85); text-transform: uppercase; letter-spacing: .04em; }
.pb-label-sub { font-weight: 500; color: rgba(245,242,236,.4); text-transform: none; letter-spacing: 0; }
.pb-hint { font-size: 11.5px; color: rgba(245,242,236,.5); margin: 4px 0 0; line-height: 1.5; }

.pb-input { width: 100%; padding: 13px 16px; border-radius: 12px; border: 1.5px solid rgba(245,242,236,.12); background: #16181A; color: #F5F2EC; font-family: inherit; font-size: 15px; outline: none; transition: all .15s; box-sizing: border-box; }
.pb-input:focus { border-color: #4ade80; background: #1B1E1A; }
.pb-input::placeholder { color: rgba(245,242,236,.3); }

.pb-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.pb-chip { padding: 8px 14px; border-radius: 999px; border: 1.5px solid rgba(245,242,236,.12); background: #16181A; color: rgba(245,242,236,.7); font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .15s; }
.pb-chip:hover { color: #F5F2EC; border-color: rgba(245,242,236,.3); }
.pb-chip--sel { border-color: #4ade80; background: rgba(74,222,128,.12); color: #4ade80; font-weight: 700; }

.pb-venue-tabs { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
.pb-venue-tab { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 12px; border: 1.5px solid rgba(245,242,236,.1); background: #16181A; cursor: pointer; font-family: inherit; text-align: left; transition: all .15s; }
.pb-venue-tab:hover { border-color: rgba(245,242,236,.25); }
.pb-venue-tab--sel { border-color: #4ade80; background: rgba(74,222,128,.06); }
.pb-venue-tab span { font-size: 22px; }
.pb-venue-tab strong { display: block; font-size: 14px; font-weight: 700; color: #F5F2EC; margin-bottom: 2px; }
.pb-venue-tab small { font-size: 12px; color: rgba(245,242,236,.5); }

.pb-suggestions { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; max-height: 280px; overflow-y: auto; background: #1B1E1A; border: 1px solid rgba(245,242,236,.08); border-radius: 12px; padding: 6px; }
.pb-suggestion { display: block; width: 100%; text-align: left; padding: 10px 12px; border-radius: 8px; border: none; background: transparent; color: #F5F2EC; font-family: inherit; font-size: 13px; cursor: pointer; transition: all .12s; }
.pb-suggestion:hover { background: rgba(74,222,128,.1); }
.pb-suggestion strong { font-weight: 700; }
.pb-suggestion span { color: rgba(245,242,236,.5); }
.pb-no-results { font-size: 12.5px; color: rgba(245,242,236,.5); padding: 10px 12px; margin: 0; }

.pb-selected { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: rgba(74,222,128,.08); border: 1px solid rgba(74,222,128,.2); border-radius: 10px; font-size: 13px; color: #4ade80; font-weight: 600; }
.pb-selected button { margin-left: auto; background: none; border: none; color: rgba(245,242,236,.6); font-size: 11px; cursor: pointer; text-decoration: underline; font-family: inherit; }
.pb-selected button:hover { color: #F5F2EC; }

.pb-error { padding: 12px 16px; border-radius: 10px; background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.3); font-size: 13px; color: #f87171; font-weight: 500; margin-bottom: 14px; }

.pb-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 24px; border-radius: 14px; font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer; border: none; transition: all .15s; }
.pb-btn--full { width: 100%; }
.pb-btn--primary { background: linear-gradient(135deg, #16a34a, #15803d); color: #fff; box-shadow: 0 4px 18px rgba(22,163,74,.3); }
.pb-btn--primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(22,163,74,.4); }
.pb-btn--primary:disabled { opacity: .4; cursor: not-allowed; transform: none; }

.pb-fineprint { font-size: 11px; color: rgba(245,242,236,.4); text-align: center; line-height: 1.6; margin: 14px 0 0; }

@media (max-width: 480px) {
  .pb-h1 { font-size: 30px; }
  .pb-grid-2 { grid-template-columns: 1fr; }
}
`