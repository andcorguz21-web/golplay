/**
 * GolPlay — RecurringBookings
 * Componente para gestionar horarios fijos semanales de una cancha.
 * Se embebe dentro del drawer de edición en fields.tsx.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Recurring {
  id: number
  day_of_week: number
  hour: string
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  start_date: string
  end_date: string | null
  price: number | null
  notes: string | null
  repeat_interval: number
  active: boolean
}

interface Props {
  fieldId: number
  ownerId: string
}

const DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const DAYS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

const HOURS = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00',
]

const fmtDate = (d: string) => {
  try { return new Date(d+'T00:00:00').toLocaleDateString('es-CR',{day:'numeric',month:'short',year:'numeric'}) }
  catch { return d }
}

export default function RecurringBookings({ fieldId, ownerId }: Props) {
  const [items, setItems] = useState<Recurring[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [hour, setHour] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [repeatInterval, setRepeatInterval] = useState(1)
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('recurring_bookings')
      .select('*')
      .eq('field_id', fieldId)
      .order('day_of_week')
      .order('hour')
    setItems(data ?? [])
    setLoading(false)
  }, [fieldId])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setDayOfWeek(1); setHour(''); setCustomerName(''); setCustomerPhone('')
    setCustomerEmail(''); setStartDate(new Date().toISOString().split('T')[0])
    setEndDate(''); setRepeatInterval(1); setPrice(''); setNotes(''); setError('')
  }

  const handleCreate = async () => {
    if (!hour || !customerName.trim()) { setError('Completá día, hora y nombre'); return }
    setSaving(true); setError('')

    const { error: insertErr } = await supabase.from('recurring_bookings').insert({
      field_id: fieldId, owner_id: ownerId, day_of_week: dayOfWeek, hour,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim() || null,
      customer_email: customerEmail.trim().toLowerCase() || null,
      start_date: startDate, end_date: endDate || null,
      repeat_interval: repeatInterval,
      price: price ? Number(price) : null,
      notes: notes.trim() || null,
    })

    setSaving(false)
    if (insertErr) {
      if (insertErr.code === '23505') setError('Ya existe un horario fijo para ese día y hora')
      else setError(insertErr.message)
      return
    }
    resetForm(); setShowForm(false); load()
  }

  const toggleActive = async (r: Recurring) => {
    await supabase.from('recurring_bookings').update({ active: !r.active }).eq('id', r.id)
    setItems(prev => prev.map(x => x.id === r.id ? { ...x, active: !x.active } : x))
  }

  const deleteRecurring = async (r: Recurring) => {
    if (!confirm(`¿Eliminar el horario fijo de ${r.customer_name} (${DAYS[r.day_of_week]} ${r.hour})?`)) return
    await supabase.from('recurring_bookings').delete().eq('id', r.id)
    setItems(prev => prev.filter(x => x.id !== r.id))
  }

  return (
    <div style={{ marginTop: 8 }}>
      <style>{REC_CSS}</style>

      {/* Header */}
      <div className="rc-head">
        <div>
          <p className="rc-title">🔁 Horarios fijos</p>
          <p className="rc-sub">Reservas recurrentes (semanal, quincenal, mensual)</p>
        </div>
        {!showForm && (
          <button className="rc-btn rc-btn--green" onClick={() => { resetForm(); setShowForm(true) }}>
            + Agregar
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="rc-form">
          <div className="rc-form-row">
            <div className="rc-form-group">
              <label className="rc-label">Día *</label>
              <select className="rc-input" value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))}>
                {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div className="rc-form-group">
              <label className="rc-label">Hora *</label>
              <select className="rc-input" value={hour} onChange={e => setHour(e.target.value)}>
                <option value="">Seleccionar</option>
                {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div className="rc-form-group">
            <label className="rc-label">Cliente *</label>
            <input className="rc-input" placeholder="Nombre del cliente" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          </div>

          <div className="rc-form-row">
            <div className="rc-form-group">
              <label className="rc-label">Teléfono</label>
              <input className="rc-input" placeholder="8888-8888" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
            </div>
            <div className="rc-form-group">
              <label className="rc-label">Email</label>
              <input className="rc-input" type="email" placeholder="email@..." value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
            </div>
          </div>

          <div className="rc-form-row">
            <div className="rc-form-group">
              <label className="rc-label">Desde *</label>
              <input className="rc-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="rc-form-group">
              <label className="rc-label">Hasta <span style={{fontWeight:400,color:'#94a3b8'}}>(vacio = indefinido)</span></label>
              <input className="rc-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="rc-form-group">
            <label className="rc-label">Frecuencia *</label>
            <select className="rc-input" value={repeatInterval} onChange={e => setRepeatInterval(Number(e.target.value))}>
              <option value={1}>Cada semana</option>
              <option value={2}>Cada 2 semanas (quincenal)</option>
              <option value={3}>Cada 3 semanas</option>
              <option value={4}>Cada 4 semanas (mensual aprox.)</option>
            </select>
          </div>

          <div className="rc-form-row">
            <div className="rc-form-group">
              <label className="rc-label">Precio por hora</label>
              <input className="rc-input" type="number" placeholder="Opcional" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div className="rc-form-group">
              <label className="rc-label">Notas</label>
              <input className="rc-input" placeholder="Opcional" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>

          {error && <div className="rc-error">{error}</div>}

          <div className="rc-form-actions">
            <button className="rc-btn rc-btn--ghost" onClick={() => { setShowForm(false); resetForm() }}>Cancelar</button>
            <button className="rc-btn rc-btn--green" onClick={handleCreate} disabled={saving}>
              {saving ? 'Guardando...' : 'Crear horario fijo'}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <p className="rc-loading">Cargando...</p>}

      {/* Empty */}
      {!loading && items.length === 0 && !showForm && (
        <div className="rc-empty">
          <p>Sin horarios fijos para esta cancha</p>
        </div>
      )}

      {/* List */}
      {!loading && items.length > 0 && (
        <div className="rc-list">
          {items.map(r => (
            <div key={r.id} className={`rc-item ${!r.active ? 'rc-item--inactive' : ''}`}>
              <div className="rc-item-left">
                <span className="rc-day-badge">{DAYS_SHORT[r.day_of_week]}</span>
                <div>
                  <p className="rc-item-name">
                    {r.customer_name} · <strong>{r.hour}</strong>
                  </p>
                  <p className="rc-item-meta">
                    {r.repeat_interval === 1 ? 'Semanal' : r.repeat_interval === 2 ? 'Quincenal' : `Cada ${r.repeat_interval} sem.`}
                    {' · '}Desde {fmtDate(r.start_date)}
                    {r.end_date ? ` hasta ${fmtDate(r.end_date)}` : ' · Indefinido'}
                    {r.price ? ` · ₡${Number(r.price).toLocaleString('es-CR')}` : ''}
                  </p>
                </div>
              </div>
              <div className="rc-item-actions">
                <button className="rc-action" onClick={() => toggleActive(r)} title={r.active ? 'Pausar' : 'Activar'}>
                  {r.active ? '⏸' : '▶️'}
                </button>
                <button className="rc-action rc-action--del" onClick={() => deleteRecurring(r)} title="Eliminar">
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const REC_CSS = `
.rc-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.rc-title{margin:0;font-size:14px;font-weight:700;color:#0f172a}
.rc-sub{margin:2px 0 0;font-size:11px;color:#94a3b8}

.rc-btn{padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .12s}
.rc-btn--green{background:#16a34a;color:#fff;box-shadow:0 2px 6px rgba(22,163,74,.25)}
.rc-btn--green:hover{background:#15803d}
.rc-btn--green:disabled{opacity:.5;cursor:not-allowed}
.rc-btn--ghost{background:#f1f5f9;color:#374151}
.rc-btn--ghost:hover{background:#e2e8f0}

.rc-form{background:#f8fafc;border:1px solid #f1f5f9;border-radius:12px;padding:16px;margin-bottom:12px;display:flex;flex-direction:column;gap:10px}
.rc-form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.rc-form-group{}
.rc-label{display:block;font-size:11px;font-weight:600;color:#374151;margin-bottom:4px}
.rc-input{width:100%;padding:8px 12px;border-radius:8px;border:1.5px solid #e2e8f0;font-size:13px;font-family:inherit;color:#0f172a;outline:none;background:#fff}
.rc-input:focus{border-color:#16a34a}
.rc-form-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:4px}
.rc-error{padding:8px 12px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;font-size:12px;color:#b91c1c}

.rc-loading{font-size:12px;color:#94a3b8;text-align:center;padding:16px}
.rc-empty{text-align:center;padding:20px;font-size:12px;color:#94a3b8;background:#f8fafc;border-radius:10px;border:1px dashed #e2e8f0}

.rc-list{display:flex;flex-direction:column;gap:6px}
.rc-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;background:#fff;border:1px solid #f1f5f9;border-radius:10px;transition:all .12s}
.rc-item:hover{border-color:#e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.04)}
.rc-item--inactive{opacity:.45}
.rc-item-left{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.rc-day-badge{width:36px;height:36px;border-radius:8px;background:#f0fdf4;border:1px solid #bbf7d0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#15803d;flex-shrink:0}
.rc-item-name{margin:0;font-size:13px;font-weight:600;color:#0f172a}
.rc-item-meta{margin:1px 0 0;font-size:11px;color:#94a3b8}
.rc-item-actions{display:flex;gap:4px;flex-shrink:0}
.rc-action{width:28px;height:28px;border-radius:6px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;transition:all .12s}
.rc-action:hover{background:#f1f5f9}
.rc-action--del:hover{background:#fef2f2;border-color:#fecaca}

@media(max-width:640px){.rc-form-row{grid-template-columns:1fr}}
`
