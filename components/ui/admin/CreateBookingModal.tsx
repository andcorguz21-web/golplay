/**
 * GolPlay — CreateBookingModal v2.0
 * Modal para que owners/admins creen reservas manuales desde el panel.
 *
 * v2: Cédula obligatoria, slot_duration support, diseño premium,
 *     secciones claras, precio dinámico con field_rates.
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Field {
  id: number
  name: string
  sport?: string
  price_day: number
  price_night?: number
  night_from_hour?: number
  hours?: string[]
  slot_duration?: number
}

interface FieldRate {
  day_of_week: string
  start_time: string
  end_time: string
  price: number
}

interface TimeSlot {
  startHour: string
  label: string
  coveredHours: string[]
}

interface Props {
  userId: string
  onClose: () => void
  onCreated: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPORT_ICON: Record<string, string> = {
  futbol5:'⚽', futbol7:'⚽', futbol8:'⚽', futbol11:'⚽', padel:'🎾',
  tenis:'🥎', basquet:'🏀', voleibol:'🏐', otro:'🏟️',
}

const ALL_HOURS = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00',
]

const DAY_KEYS = ['sun','mon','tue','wed','thu','fri','sat']
const fmt = (v: number) => `₡${Math.round(v).toLocaleString('es-CR')}`

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateBookingModal({ userId, onClose, onCreated }: Props) {
  const [fields, setFields] = useState<Field[]>([])
  const [fieldRates, setFieldRates] = useState<FieldRate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Form
  const [fieldId, setFieldId] = useState<number | null>(null)
  const [date, setDate] = useState('')
  const [hour, setHour] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [idNumber, setIdNumber] = useState('')

  // Booked hours
  const [bookedHours, setBookedHours] = useState<Set<string>>(new Set())
  const [loadingHours, setLoadingHours] = useState(false)

  // ── Load fields ──
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('fields')
        .select('id, name, sport, price_day, price_night, night_from_hour, hours, slot_duration')
        .eq('owner_id', userId)
        .order('name')
      setFields(data ?? [])
      if (data && data.length > 0) setFieldId(data[0].id)
      setLoading(false)
    })()
  }, [userId])

  // ── Load field_rates when field changes ──
  useEffect(() => {
    if (!fieldId) { setFieldRates([]); return }
    ;(async () => {
      const { data } = await supabase
        .from('field_rates')
        .select('day_of_week, start_time, end_time, price')
        .eq('field_id', fieldId)
      setFieldRates(data ?? [])
    })()
  }, [fieldId])

  // ── Load booked hours ──
  useEffect(() => {
    if (!fieldId || !date) { setBookedHours(new Set()); return }
    ;(async () => {
      setLoadingHours(true)
      const { data } = await supabase
        .from('bookings')
        .select('hour')
        .eq('field_id', fieldId)
        .eq('date', date)
        .in('status', ['confirmed', 'pending'])
      setBookedHours(new Set((data ?? []).map(b => b.hour)))
      setLoadingHours(false)
    })()
  }, [fieldId, date])

  const selectedField = fields.find(f => f.id === fieldId) ?? null

  // ── Build time slots respecting slot_duration ──
  const timeSlots = useMemo<TimeSlot[]>(() => {
    if (!selectedField) return []
    const dur = selectedField.slot_duration || 1
    const hours = (selectedField.hours?.length ? selectedField.hours : ALL_HOURS).sort()

    if (dur === 1) {
      return hours
        .filter(h => !bookedHours.has(h))
        .map(h => ({ startHour: h, label: h, coveredHours: [h] }))
    }

    // dur >= 2: group consecutive hours into blocks
    const slots: TimeSlot[] = []
    let i = 0
    while (i < hours.length) {
      const start = hours[i]
      const startNum = Number(start.split(':')[0])
      const block = [start]
      let valid = true
      for (let j = 1; j < dur; j++) {
        const next = `${String(startNum + j).padStart(2, '0')}:00`
        if (hours.includes(next)) block.push(next)
        else { valid = false; break }
      }
      if (valid && block.length === dur) {
        const anyBooked = block.some(h => bookedHours.has(h))
        if (!anyBooked) {
          const endLabel = `${String(startNum + dur).padStart(2, '0')}:00`
          slots.push({ startHour: start, label: `${start} – ${endLabel}`, coveredHours: block })
        }
        i += dur
      } else {
        i++
      }
    }
    return slots
  }, [selectedField, bookedHours])

  // ── Price calculation with field_rates ──
  const price = useMemo(() => {
    if (!selectedField || !hour) return 0
    const hourNum = Number(hour.split(':')[0])
    const nightFrom = selectedField.night_from_hour ?? 18

    if (fieldRates.length > 0 && date) {
      const [y, m, d] = date.split('-').map(Number)
      const dayKey = DAY_KEYS[new Date(y, m - 1, d).getDay()]
      const rate = fieldRates.find(r => {
        if (r.day_of_week !== dayKey) return false
        const startH = Number(r.start_time?.split(':')[0] ?? 0)
        const endH = Number(r.end_time?.split(':')[0] ?? 23)
        return hourNum >= startH && hourNum <= endH
      })
      if (rate) return Number(rate.price)
    }

    return hourNum >= nightFrom
      ? Number(selectedField.price_night ?? selectedField.price_day ?? 0)
      : Number(selectedField.price_day ?? 0)
  }, [selectedField, hour, date, fieldRates])

  const isNight = useMemo(() => {
    if (!selectedField || !hour) return false
    return Number(hour.split(':')[0]) >= (selectedField.night_from_hour ?? 18)
  }, [selectedField, hour])

  const todayStr = new Date().toISOString().split('T')[0]
  const formValid = fieldId && date && hour && name.trim() && idNumber.trim().length >= 5

  // ── Submit ──
  const handleSubmit = useCallback(async () => {
    setError('')
    if (!fieldId || !date || !hour || !name.trim()) {
      setError('Completá cancha, fecha, hora y nombre'); return
    }
    if (!idNumber.trim() || idNumber.trim().length < 5) {
      setError('La cédula es obligatoria (mínimo 5 caracteres)'); return
    }

    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      const res = await fetch(`${supabaseUrl}/functions/v1/create-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token ?? anonKey}`,
          'apikey': anonKey ?? '',
        },
        body: JSON.stringify({
          field_id: fieldId,
          date,
          hour,
          name: name.trim(),
          phone: phone.trim() || '—',
          email: email.trim().toLowerCase() || 'admin@golplay.app',
          customer_id_number: idNumber.trim(),
          price,
          tariff: isNight ? 'night' : 'day',
        }),
      })

      const result = await res.json()
      setSaving(false)

      if (!result.ok) {
        setError(result.error ?? 'Error al crear la reserva'); return
      }

      setSuccess(true)
      setTimeout(() => { onCreated(); onClose() }, 1200)
    } catch (e: any) {
      setSaving(false)
      setError(e.message ?? 'Error de conexión')
    }
  }, [fieldId, date, hour, name, phone, email, idNumber, price, isNight, onCreated, onClose])

  // ── Date display ──
  const dateDisplay = date ? (() => {
    try {
      const [y, m, d] = date.split('-').map(Number)
      return new Date(y, m - 1, d).toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short' })
    } catch { return date }
  })() : ''

  // ── Selected slot label for header ──
  const selectedSlotLabel = useMemo(() => {
    if (!hour) return ''
    const slot = timeSlots.find(s => s.startHour === hour)
    return slot?.label || hour
  }, [hour, timeSlots])

  return (
    <>
      <style>{CSS}</style>
      <div className="bm-overlay" onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}>
        <div className="bm-modal" role="dialog" aria-modal="true">

          {/* ── Header ── */}
          <div className="bm-header">
            <div className="bm-header__content">
              <div className="bm-header__dot" />
              <p className="bm-header__label">Nueva reserva manual</p>
              <h2 className="bm-header__title">Crear reserva</h2>
              {selectedField && hour && price > 0 && (
                <div className="bm-header__price">
                  <span className="bm-header__price-tag">
                    {isNight ? '🌙' : '☀️'} {fmt(price)}
                  </span>
                  {dateDisplay && <span className="bm-header__date">{dateDisplay} · {selectedSlotLabel}</span>}
                </div>
              )}
            </div>
            <button className="bm-close" onClick={onClose} aria-label="Cerrar" disabled={saving}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* ── Success ── */}
          {success ? (
            <div className="bm-success">
              <div className="bm-success__icon">🎉</div>
              <h3 className="bm-success__title">¡Reserva creada!</h3>
              <p className="bm-success__sub">La reserva fue registrada exitosamente</p>
            </div>
          ) : (
            <div className="bm-body">

              {loading ? (
                <div className="bm-loading"><div className="bm-spinner" /><p>Cargando canchas…</p></div>
              ) : fields.length === 0 ? (
                <div className="bm-empty"><p>No tenés canchas activas. Creá una cancha primero.</p></div>
              ) : (
                <>
                  {/* ── Section: Reserva ── */}
                  <div className="bm-section">
                    <p className="bm-section__label">📅 Detalles de la reserva</p>

                    {/* Field selector */}
                    <div className="bm-field">
                      <label className="bm-label">Cancha</label>
                      <div className="bm-field-cards">
                        {fields.map(f => (
                          <button
                            key={f.id}
                            type="button"
                            className={`bm-field-card ${fieldId === f.id ? 'bm-field-card--sel' : ''}`}
                            onClick={() => { setFieldId(f.id); setHour('') }}
                          >
                            <span className="bm-field-card__icon">{SPORT_ICON[f.sport ?? ''] ?? '🏟️'}</span>
                            <span className="bm-field-card__name">{f.name}</span>
                            {(f.slot_duration ?? 1) > 1 && (
                              <span className="bm-field-card__dur">{f.slot_duration}h</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="bm-field">
                      <label className="bm-label">Fecha</label>
                      <input
                        className="bm-input"
                        type="date"
                        min={todayStr}
                        value={date}
                        onChange={e => { setDate(e.target.value); setHour('') }}
                      />
                    </div>

                    {/* Hour grid */}
                    <div className="bm-field">
                      <label className="bm-label">
                        {(selectedField?.slot_duration ?? 1) > 1 ? 'Turno' : 'Hora'}
                        {loadingHours && <span className="bm-label__hint"> · verificando…</span>}
                      </label>
                      {!date ? (
                        <p className="bm-hint">Seleccioná una fecha primero</p>
                      ) : timeSlots.length === 0 ? (
                        <p className="bm-hint bm-hint--warn">⚠ Sin horarios disponibles para esta fecha</p>
                      ) : (
                        <div className="bm-hours">
                          {timeSlots.map(slot => {
                            const hNum = Number(slot.startHour.split(':')[0])
                            const night = hNum >= (selectedField?.night_from_hour ?? 18)
                            const isSel = hour === slot.startHour
                            return (
                              <button
                                key={slot.startHour}
                                type="button"
                                className={`bm-hour ${isSel ? (night ? 'bm-hour--night-sel' : 'bm-hour--sel') : ''} ${night ? 'bm-hour--night' : ''}`}
                                onClick={() => setHour(slot.startHour)}
                              >
                                <span className="bm-hour__time">{slot.label}</span>
                                {night && <span className="bm-hour__tag">🌙</span>}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Section: Cliente ── */}
                  <div className="bm-section">
                    <p className="bm-section__label">👤 Datos del cliente</p>

                    <div className="bm-grid-2">
                      <div className="bm-field">
                        <label className="bm-label">Nombre completo <span className="bm-req">*</span></label>
                        <input className="bm-input" placeholder="Juan Pérez" value={name} onChange={e => setName(e.target.value)} />
                      </div>
                      <div className="bm-field">
                        <label className="bm-label">Cédula <span className="bm-req">*</span></label>
                        <input className="bm-input" placeholder="Ej: 208090240" value={idNumber} onChange={e => setIdNumber(e.target.value)} />
                      </div>
                    </div>

                    <div className="bm-grid-2">
                      <div className="bm-field">
                        <label className="bm-label">Teléfono</label>
                        <input className="bm-input" type="tel" placeholder="8888-8888" value={phone} onChange={e => setPhone(e.target.value)} />
                      </div>
                      <div className="bm-field">
                        <label className="bm-label">Email</label>
                        <input className="bm-input" type="email" placeholder="cliente@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {/* ── Error ── */}
                  {error && <div className="bm-error">⚠️ {error}</div>}

                  {/* ── Actions ── */}
                  <div className="bm-actions">
                    <button className="bm-btn bm-btn--ghost" onClick={onClose} disabled={saving}>Cancelar</button>
                    <button className="bm-btn bm-btn--primary" onClick={handleSubmit} disabled={saving || !formValid}>
                      {saving
                        ? <><div className="bm-btn-spinner" /> Creando…</>
                        : <>Confirmar reserva{price > 0 ? ` · ${fmt(price)}` : ''}</>
                      }
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');

@keyframes bmOverlayIn { from{opacity:0} to{opacity:1} }
@keyframes bmSlideUp { from{opacity:0;transform:translateY(24px) scale(.98)} to{opacity:1;transform:none} }
@keyframes bmSpin { to{transform:rotate(360deg)} }
@keyframes bmPulseDot { 0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,.5)} 50%{box-shadow:0 0 0 6px rgba(74,222,128,0)} }

.bm-overlay {
  position:fixed; inset:0; z-index:500;
  background:rgba(15,23,42,.55); backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center;
  padding:20px; animation:bmOverlayIn .15s ease;
}
.bm-modal {
  background:#fff; border-radius:24px; width:100%; max-width:520px;
  box-shadow:0 32px 80px rgba(0,0,0,.25); animation:bmSlideUp .25s cubic-bezier(.16,1,.3,1);
  overflow:hidden; max-height:92vh; display:flex; flex-direction:column;
  font-family:'DM Sans',sans-serif;
}

.bm-header {
  padding:24px 24px 20px; position:relative; overflow:hidden;
  background:linear-gradient(160deg,#052e16 0%,#0B4D2C 100%);
}
.bm-header::before {
  content:''; position:absolute; inset:0;
  background-image:linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px);
  background-size:32px 32px;
}
.bm-header__content { position:relative; z-index:1; }
.bm-header__dot { width:7px; height:7px; border-radius:50%; background:#4ade80; animation:bmPulseDot 2s infinite; margin-bottom:10px; }
.bm-header__label { font-size:10px; font-weight:700; letter-spacing:.10em; color:rgba(255,255,255,.5); text-transform:uppercase; margin:0 0 4px; }
.bm-header__title { font-size:22px; font-weight:800; color:#fff; margin:0; letter-spacing:-.3px; }
.bm-header__price { display:flex; align-items:center; gap:8px; margin-top:14px; flex-wrap:wrap; }
.bm-header__price-tag { font-size:13px; font-weight:700; color:#fff; background:rgba(255,255,255,.1); backdrop-filter:blur(8px); padding:5px 14px; border-radius:999px; border:1px solid rgba(255,255,255,.12); }
.bm-header__date { font-size:12px; color:rgba(255,255,255,.45); font-weight:500; }
.bm-close { position:absolute; top:16px; right:16px; z-index:2; width:32px; height:32px; border-radius:10px; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.06); cursor:pointer; color:rgba(255,255,255,.5); display:flex; align-items:center; justify-content:center; transition:all .12s; }
.bm-close:hover { background:rgba(255,255,255,.12); color:#fff; }

.bm-body { padding:20px 24px 24px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:4px; }

.bm-section { display:flex; flex-direction:column; gap:12px; padding:16px 0; border-bottom:1px solid #f1f5f9; }
.bm-section:last-of-type { border-bottom:none; }
.bm-section__label { font-size:11px; font-weight:700; color:#0f172a; letter-spacing:.04em; text-transform:uppercase; margin:0; }

.bm-field { display:flex; flex-direction:column; gap:5px; }
.bm-label { font-size:12px; font-weight:600; color:#374151; margin:0; }
.bm-label__hint { font-weight:400; color:#94a3b8; }
.bm-req { color:#ef4444; }
.bm-hint { font-size:12px; color:#94a3b8; margin:0; }
.bm-hint--warn { color:#d97706; }

.bm-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

.bm-input { width:100%; padding:10px 14px; border-radius:10px; border:1.5px solid #e2e8f0; font-size:13px; font-family:inherit; color:#0f172a; outline:none; transition:border-color .15s, box-shadow .15s; background:#fff; box-sizing:border-box; }
.bm-input:focus { border-color:#16a34a; box-shadow:0 0 0 3px rgba(22,163,74,.08); }
.bm-input::placeholder { color:#94a3b8; }

.bm-field-cards { display:flex; gap:6px; flex-wrap:wrap; }
.bm-field-card { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:10px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; font-family:inherit; font-size:12px; font-weight:600; color:#374151; transition:all .12s; }
.bm-field-card:hover { border-color:#16a34a; background:#f0fdf4; }
.bm-field-card--sel { border-color:#16a34a; background:#16a34a; color:#fff; }
.bm-field-card__icon { font-size:14px; }
.bm-field-card__name { white-space:nowrap; }
.bm-field-card__dur { font-size:10px; opacity:.7; padding:1px 5px; border-radius:4px; background:rgba(0,0,0,.06); }
.bm-field-card--sel .bm-field-card__dur { background:rgba(255,255,255,.2); }

.bm-hours { display:grid; grid-template-columns:repeat(auto-fill,minmax(110px,1fr)); gap:6px; }
.bm-hour { display:flex; flex-direction:column; align-items:center; gap:1px; padding:9px 6px; border-radius:10px; border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; font-family:inherit; transition:all .14s; }
.bm-hour:hover { border-color:#16a34a; background:#f0fdf4; transform:translateY(-1px); }
.bm-hour__time { font-size:12px; font-weight:700; color:#374151; white-space:nowrap; }
.bm-hour__tag { font-size:9px; line-height:1; }
.bm-hour--night { border-color:#e0e7ff; }
.bm-hour--night .bm-hour__time { color:#4f46e5; }
.bm-hour--sel { background:#16a34a; border-color:#16a34a; }
.bm-hour--sel .bm-hour__time { color:#fff; }
.bm-hour--night-sel { background:linear-gradient(135deg,#4c1d95,#7c3aed); border-color:#7c3aed; }
.bm-hour--night-sel .bm-hour__time { color:#fff; }

.bm-error { padding:10px 14px; border-radius:10px; background:#fef2f2; border:1px solid #fecaca; font-size:12px; color:#b91c1c; font-weight:600; }

.bm-actions { display:flex; gap:10px; margin-top:8px; }
.bm-btn { flex:1; padding:13px 16px; border-radius:12px; font-size:13px; font-weight:700; font-family:inherit; cursor:pointer; border:none; transition:all .15s; text-align:center; display:flex; align-items:center; justify-content:center; gap:8px; }
.bm-btn--ghost { background:#f1f5f9; color:#374151; }
.bm-btn--ghost:hover { background:#e2e8f0; }
.bm-btn--primary { background:linear-gradient(135deg,#16a34a,#15803d); color:#fff; box-shadow:0 2px 12px rgba(22,163,74,.3); }
.bm-btn--primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 4px 20px rgba(22,163,74,.4); }
.bm-btn--primary:disabled { opacity:.4; cursor:not-allowed; transform:none; box-shadow:none; }
.bm-btn-spinner { width:14px; height:14px; border-radius:50%; border:2px solid rgba(255,255,255,.25); border-top-color:#fff; animation:bmSpin .7s linear infinite; flex-shrink:0; }

.bm-loading { display:flex; flex-direction:column; align-items:center; gap:12px; padding:40px 0; }
.bm-spinner { width:28px; height:28px; border-radius:50%; border:3px solid #e2e8f0; border-top-color:#16a34a; animation:bmSpin .7s linear infinite; }
.bm-loading p { font-size:13px; color:#94a3b8; margin:0; }
.bm-empty { padding:32px 0; text-align:center; font-size:13px; color:#94a3b8; }

.bm-success { padding:52px 24px; text-align:center; }
.bm-success__icon { width:64px; height:64px; border-radius:50%; background:#f0fdf4; display:flex; align-items:center; justify-content:center; font-size:32px; margin:0 auto 16px; }
.bm-success__title { font-size:20px; font-weight:800; color:#0f172a; margin:0 0 6px; }
.bm-success__sub { font-size:13px; color:#64748b; margin:0; }

@media (max-width:640px) {
  .bm-overlay { align-items:flex-end; padding:0; }
  .bm-modal { border-radius:24px 24px 0 0; max-height:95vh; }
  .bm-hours { grid-template-columns:repeat(2,1fr); }
  .bm-grid-2 { grid-template-columns:1fr; }
}
`
