/**
 * GolPlay — CreateBookingModal
 * Modal para que owners/admins creen reservas manuales desde el panel.
 * No pasa por la pantalla pública. Inserta directo en bookings via supabase.
 */

import { useEffect, useState, useCallback } from 'react'
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
}

interface Props {
  userId: string
  onClose: () => void
  onCreated: () => void
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPORT_ICON: Record<string, string> = {
  futbol5:'⚽', futbol7:'⚽', futbol11:'⚽', padel:'🎾',
  tenis:'🥎', basquet:'🏀', voleibol:'🏐', otro:'🏟️',
}

const ALL_HOURS = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00',
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateBookingModal({ userId, onClose, onCreated }: Props) {
  const [fields, setFields] = useState<Field[]>([])
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

  // Booked hours for selected field+date
  const [bookedHours, setBookedHours] = useState<Set<string>>(new Set())
  const [loadingHours, setLoadingHours] = useState(false)

  // ── Load owner's fields ──
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('fields')
        .select('id, name, sport, price_day, price_night, night_from_hour, hours')
        .eq('owner_id', userId)
        .eq('active', true)
        .order('name')
      setFields(data ?? [])
      if (data && data.length > 0) setFieldId(data[0].id)
      setLoading(false)
    })()
  }, [userId])

  // ── Load booked hours when field+date change ──
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
  const availableHours = (selectedField?.hours?.length ? selectedField.hours : ALL_HOURS)
    .filter(h => !bookedHours.has(h))

  // Calculate price
  const calcPrice = () => {
    if (!selectedField || !hour) return 0
    const hourNum = Number(hour.split(':')[0])
    const nightFrom = selectedField.night_from_hour ?? 18
    return hourNum >= nightFrom
      ? Number(selectedField.price_night ?? selectedField.price_day ?? 0)
      : Number(selectedField.price_day ?? 0)
  }

  const price = calcPrice()
  const fmtPrice = price > 0 ? `₡${price.toLocaleString('es-CR')}` : '—'

  // ── Today string for min date ──
  const todayStr = new Date().toISOString().split('T')[0]

  // ── Submit via Edge Function (sends emails) ──
  const handleSubmit = useCallback(async () => {
    setError('')
    if (!fieldId || !date || !hour || !name.trim()) {
      setError('Completá cancha, fecha, hora y nombre del cliente')
      return
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
        }),
      })

      const result = await res.json()

      setSaving(false)

      if (!result.ok) {
        setError(result.error ?? 'Error al crear la reserva')
        return
      }

      setSuccess(true)
      setTimeout(() => { onCreated(); onClose() }, 1200)
    } catch (e: any) {
      setSaving(false)
      setError(e.message ?? 'Error de conexión')
    }
  }, [fieldId, date, hour, name, phone, email, userId, onCreated, onClose])

  return (
    <>
      <style>{CSS}</style>
      <div className="cbm-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="cbm-modal" role="dialog" aria-modal="true">

          {/* Header */}
          <div className="cbm-header">
            <div>
              <h2 className="cbm-title">Nueva reserva</h2>
              <p className="cbm-sub">Reserva manual desde el panel</p>
            </div>
            <button className="cbm-close" onClick={onClose} aria-label="Cerrar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Success */}
          {success ? (
            <div className="cbm-success">
              <span className="cbm-success-icon">✅</span>
              <h3 className="cbm-success-title">Reserva creada</h3>
              <p className="cbm-success-sub">La reserva fue registrada exitosamente</p>
            </div>
          ) : (
            <div className="cbm-body">

              {/* Loading */}
              {loading ? (
                <div className="cbm-loading">
                  <div className="cbm-spinner" />
                  <p>Cargando canchas...</p>
                </div>
              ) : fields.length === 0 ? (
                <div className="cbm-empty">
                  <p>No tenés canchas activas. Creá una cancha primero.</p>
                </div>
              ) : (
                <>
                  {/* Field */}
                  <div className="cbm-field">
                    <label className="cbm-label">Cancha *</label>
                    <select
                      className="cbm-select"
                      value={fieldId ?? ''}
                      onChange={e => { setFieldId(Number(e.target.value)); setHour('') }}
                    >
                      {fields.map(f => (
                        <option key={f.id} value={f.id}>
                          {SPORT_ICON[f.sport ?? ''] ?? '🏟️'} {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div className="cbm-field">
                    <label className="cbm-label">Fecha *</label>
                    <input
                      className="cbm-input"
                      type="date"
                      min={todayStr}
                      value={date}
                      onChange={e => { setDate(e.target.value); setHour('') }}
                    />
                  </div>

                  {/* Hour */}
                  <div className="cbm-field">
                    <label className="cbm-label">
                      Hora * {loadingHours && <span className="cbm-label-hint">(verificando...)</span>}
                    </label>
                    {!date ? (
                      <p className="cbm-hint">Seleccioná una fecha primero</p>
                    ) : availableHours.length === 0 ? (
                      <p className="cbm-hint cbm-hint--warn">Sin horarios disponibles para esta fecha</p>
                    ) : (
                      <div className="cbm-hours">
                        {availableHours.map(h => (
                          <button
                            key={h}
                            type="button"
                            className={`cbm-hour ${hour === h ? 'cbm-hour--sel' : ''}`}
                            onClick={() => setHour(h)}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Price preview */}
                  {hour && (
                    <div className="cbm-price-preview">
                      <span>Precio:</span>
                      <strong>{fmtPrice}</strong>
                    </div>
                  )}

                  {/* Divider */}
                  <div className="cbm-divider" />

                  {/* Customer name */}
                  <div className="cbm-field">
                    <label className="cbm-label">Nombre del cliente *</label>
                    <input
                      className="cbm-input"
                      placeholder="Ej: Juan Pérez"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>

                  {/* Customer phone */}
                  <div className="cbm-field">
                    <label className="cbm-label">Teléfono <span className="cbm-label-hint">(opcional)</span></label>
                    <input
                      className="cbm-input"
                      type="tel"
                      placeholder="8888-8888"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>

                  {/* Customer email */}
                  <div className="cbm-field">
                    <label className="cbm-label">Email <span className="cbm-label-hint">(opcional)</span></label>
                    <input
                      className="cbm-input"
                      type="email"
                      placeholder="cliente@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                    />
                  </div>

                  {/* Error */}
                  {error && <div className="cbm-error">{error}</div>}

                  {/* Actions */}
                  <div className="cbm-actions">
                    <button className="cbm-btn cbm-btn--ghost" onClick={onClose}>Cancelar</button>
                    <button
                      className="cbm-btn cbm-btn--primary"
                      onClick={handleSubmit}
                      disabled={saving || !fieldId || !date || !hour || !name.trim()}
                    >
                      {saving ? 'Creando...' : 'Confirmar reserva'}
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
@keyframes cbmOverlayIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes cbmSlideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: none } }
@keyframes cbmSpin { to { transform: rotate(360deg) } }

.cbm-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(15,23,42,.5); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px; animation: cbmOverlayIn .15s ease;
}
.cbm-modal {
  background: #fff; border-radius: 20px; width: 100%; max-width: 480px;
  box-shadow: 0 24px 80px rgba(0,0,0,.2); animation: cbmSlideUp .2s ease;
  overflow: hidden; max-height: 90vh; display: flex; flex-direction: column;
}

.cbm-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 24px 24px 0; gap: 12px;
}
.cbm-title { margin: 0; font-size: 18px; font-weight: 700; color: #0f172a; }
.cbm-sub { margin: 4px 0 0; font-size: 13px; color: #94a3b8; }
.cbm-close {
  width: 32px; height: 32px; border-radius: 10px;
  border: 1.5px solid #e2e8f0; background: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #64748b; transition: all .12s; flex-shrink: 0;
}
.cbm-close:hover { background: #f1f5f9; border-color: #cbd5e1; }

.cbm-body {
  padding: 20px 24px 24px; overflow-y: auto; flex: 1;
  display: flex; flex-direction: column; gap: 14px;
}

.cbm-field {}
.cbm-label {
  display: block; font-size: 12px; font-weight: 600; color: #374151;
  margin-bottom: 6px;
}
.cbm-label-hint { font-weight: 400; color: #94a3b8; }
.cbm-input {
  width: 100%; padding: 10px 14px; border-radius: 10px;
  border: 1.5px solid #e2e8f0; font-size: 14px; font-family: inherit;
  color: #0f172a; outline: none; transition: border-color .15s;
  background: #fff;
}
.cbm-input:focus { border-color: #16a34a; }
.cbm-select {
  width: 100%; padding: 10px 14px; border-radius: 10px;
  border: 1.5px solid #e2e8f0; font-size: 14px; font-family: inherit;
  color: #0f172a; outline: none; background: #fff; cursor: pointer;
}
.cbm-select:focus { border-color: #16a34a; }

.cbm-hint { font-size: 13px; color: #94a3b8; margin: 0; }
.cbm-hint--warn { color: #d97706; }

.cbm-hours {
  display: flex; flex-wrap: wrap; gap: 6px;
}
.cbm-hour {
  padding: 7px 14px; border-radius: 8px; font-size: 13px; font-weight: 600;
  border: 1.5px solid #e2e8f0; background: #fff; color: #374151;
  cursor: pointer; font-family: inherit; transition: all .12s;
}
.cbm-hour:hover { border-color: #16a34a; background: #f0fdf4; color: #15803d; }
.cbm-hour--sel { background: #16a34a; border-color: #16a34a; color: #fff; }

.cbm-price-preview {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: #f0fdf4; border-radius: 10px;
  border: 1px solid #bbf7d0; font-size: 14px; color: #15803d;
}
.cbm-price-preview strong { font-size: 16px; }

.cbm-divider { height: 1px; background: #f1f5f9; margin: 4px 0; }

.cbm-error {
  padding: 10px 14px; border-radius: 10px;
  background: #fef2f2; border: 1px solid #fecaca;
  font-size: 13px; color: #b91c1c; font-weight: 500;
}

.cbm-actions {
  display: flex; gap: 10px; margin-top: 4px;
}
.cbm-btn {
  flex: 1; padding: 12px 16px; border-radius: 12px;
  font-size: 14px; font-weight: 700; font-family: inherit;
  cursor: pointer; border: none; transition: all .15s; text-align: center;
}
.cbm-btn--ghost { background: #f1f5f9; color: #374151; }
.cbm-btn--ghost:hover { background: #e2e8f0; }
.cbm-btn--primary { background: #16a34a; color: #fff; box-shadow: 0 2px 8px rgba(22,163,74,.3); }
.cbm-btn--primary:hover { background: #15803d; }
.cbm-btn--primary:disabled { opacity: .45; cursor: not-allowed; }

.cbm-loading {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 40px 0;
}
.cbm-spinner {
  width: 32px; height: 32px; border-radius: 50%;
  border: 3px solid #e2e8f0; border-top-color: #16a34a;
  animation: cbmSpin .7s linear infinite;
}
.cbm-loading p { font-size: 13px; color: #94a3b8; }

.cbm-empty { padding: 32px 0; text-align: center; font-size: 14px; color: #94a3b8; }

.cbm-success {
  padding: 48px 24px; text-align: center;
}
.cbm-success-icon { font-size: 48px; display: block; margin-bottom: 16px; }
.cbm-success-title { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0 0 6px; }
.cbm-success-sub { font-size: 14px; color: #64748b; margin: 0; }

@media (max-width: 640px) {
  .cbm-overlay { align-items: flex-end; padding: 0; }
  .cbm-modal { border-radius: 20px 20px 0 0; max-height: 95vh; }
}
`
