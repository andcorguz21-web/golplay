/**
 * GolPlay — ClosedDates
 * Componente para gestionar días cerrados / feriados / mantenimiento.
 * Se puede embeber en fields.tsx (por cancha) o en profile (por complejo).
 *
 * Props:
 *   complexId: number  — ID del complejo
 *   fieldId?: number   — Si se pasa, gestiona días cerrados de esa cancha. Si no, del complejo entero.
 *   fieldName?: string — Nombre de la cancha (para labels)
 *
 * Mismo lenguaje visual que RecurringBookings.tsx
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface ClosedDate {
  id: number
  complex_id: number
  field_id: number | null
  date: string
  reason: string | null
  created_at: string
}

interface Props {
  complexId: number
  fieldId?: number
  fieldName?: string
}

const fmtDate = (d: string) => {
  try { return new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }
  catch { return d }
}

const QUICK_REASONS = [
  'Mantenimiento', 'Feriado', 'Evento privado', 'Vacaciones', 'Lluvia / Clima', 'Otro'
]

export default function ClosedDates({ complexId, fieldId, fieldName }: Props) {
  const [items, setItems] = useState<ClosedDate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Form
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState('')
  const [reason, setReason] = useState('')

  const scope = fieldId ? 'cancha' : 'complejo'
  const scopeName = fieldId ? (fieldName || 'esta cancha') : 'todo el complejo'

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('closed_dates')
      .select('*')
      .eq('complex_id', complexId)
      .order('date', { ascending: true })

    if (fieldId) {
      // Solo los de esta cancha + los del complejo entero
      q = q.or(`field_id.eq.${fieldId},field_id.is.null`)
    } else {
      // Solo los del complejo (sin field_id)
      q = q.is('field_id', null)
    }

    const { data } = await q
    // Filter to only future/today
    const today = new Date().toISOString().split('T')[0]
    setItems((data ?? []).filter(d => d.date >= today))
    setLoading(false)
  }, [complexId, fieldId])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setDateFrom(new Date().toISOString().split('T')[0])
    setDateTo(''); setReason(''); setError('')
  }

  const handleCreate = async () => {
    if (!dateFrom) { setError('Seleccioná al menos una fecha'); return }
    setSaving(true); setError('')

    // Generate array of dates (single or range)
    const dates: string[] = []
    const start = new Date(dateFrom + 'T12:00:00')
    const end = dateTo ? new Date(dateTo + 'T12:00:00') : start
    if (end < start) { setError('La fecha "hasta" debe ser posterior a "desde"'); setSaving(false); return }

    const cur = new Date(start)
    while (cur <= end) {
      dates.push(cur.toISOString().split('T')[0])
      cur.setDate(cur.getDate() + 1)
    }

    if (dates.length > 365) { setError('No podés cerrar más de 365 días a la vez'); setSaving(false); return }

    const rows = dates.map(d => ({
      complex_id: complexId,
      field_id: fieldId || null,
      date: d,
      reason: reason.trim() || null,
    }))

    const { error: insertErr } = await supabase
      .from('closed_dates')
      .upsert(rows, { onConflict: 'complex_id,field_id,date' })

    setSaving(false)
    if (insertErr) { setError(insertErr.message); return }
    resetForm(); setShowForm(false); load()
  }

  const deleteDate = async (id: number) => {
    await supabase.from('closed_dates').delete().eq('id', id)
    setItems(prev => prev.filter(x => x.id !== id))
  }

  const deleteAll = async () => {
    if (!confirm(`¿Eliminar todos los ${items.length} días cerrados de ${scopeName}?`)) return
    const ids = items.filter(i => fieldId ? i.field_id === fieldId : !i.field_id).map(i => i.id)
    if (ids.length) await supabase.from('closed_dates').delete().in('id', ids)
    load()
  }

  return (
    <div style={{ marginTop: 8 }}>
      <style>{CD_CSS}</style>

      {/* Header */}
      <div className="cd-head">
        <div>
          <p className="cd-title">🚫 Días cerrados</p>
          <p className="cd-sub">{fieldId ? `Cerrar ${fieldName || 'esta cancha'} en fechas específicas` : 'Cerrar todo el complejo en fechas específicas'}</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {items.length > 0 && !showForm && (
            <button className="cd-btn cd-btn--ghost cd-btn--sm" onClick={deleteAll}>🗑 Limpiar</button>
          )}
          {!showForm && (
            <button className="cd-btn cd-btn--green" onClick={() => { resetForm(); setShowForm(true) }}>
              + Agregar
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="cd-form">
          <div className="cd-form-row">
            <div className="cd-form-group">
              <label className="cd-label">Desde *</label>
              <input className="cd-input" type="date" value={dateFrom} min={new Date().toISOString().split('T')[0]} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="cd-form-group">
              <label className="cd-label">Hasta <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional, para rango)</span></label>
              <input className="cd-input" type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>

          <div className="cd-form-group">
            <label className="cd-label">Motivo</label>
            <div className="cd-reasons">
              {QUICK_REASONS.map(r => (
                <button key={r} className={`cd-reason ${reason === r ? 'cd-reason--sel' : ''}`} onClick={() => setReason(reason === r ? '' : r)}>
                  {r}
                </button>
              ))}
            </div>
            <input className="cd-input" placeholder="O escribí un motivo personalizado..." value={reason} onChange={e => setReason(e.target.value)} style={{ marginTop: 6 }} />
          </div>

          {error && <div className="cd-error">{error}</div>}

          <div className="cd-form-actions">
            <button className="cd-btn cd-btn--ghost" onClick={() => { setShowForm(false); resetForm() }}>Cancelar</button>
            <button className="cd-btn cd-btn--green" onClick={handleCreate} disabled={saving}>
              {saving ? 'Guardando...' : dateTo ? `Cerrar ${scopeName} (rango)` : `Cerrar ${scopeName}`}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <p className="cd-loading">Cargando...</p>}

      {/* Empty */}
      {!loading && items.length === 0 && !showForm && (
        <div className="cd-empty">
          <p>Sin días cerrados programados</p>
        </div>
      )}

      {/* List */}
      {!loading && items.length > 0 && (
        <div className="cd-list">
          {items.map(d => {
            const isComplexWide = !d.field_id
            return (
              <div key={d.id} className="cd-item">
                <div className="cd-item-left">
                  <span className={`cd-date-badge ${isComplexWide ? 'cd-date-badge--complex' : ''}`}>
                    {new Date(d.date + 'T12:00:00').getDate()}
                  </span>
                  <div>
                    <p className="cd-item-date">{fmtDate(d.date)}</p>
                    <p className="cd-item-meta">
                      {d.reason || 'Sin motivo'}
                      {isComplexWide && fieldId && <span className="cd-item-tag">Todo el complejo</span>}
                    </p>
                  </div>
                </div>
                {/* Only allow delete if it belongs to this scope */}
                {(fieldId ? d.field_id === fieldId : !d.field_id) && (
                  <button className="cd-action" onClick={() => deleteDate(d.id)} title="Eliminar">×</button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const CD_CSS = `
.cd-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.cd-title{margin:0;font-size:14px;font-weight:700;color:#0f172a}
.cd-sub{margin:2px 0 0;font-size:11px;color:#94a3b8}

.cd-btn{padding:7px 14px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:none;font-family:inherit;transition:all .12s}
.cd-btn--green{background:#16a34a;color:#fff;box-shadow:0 2px 6px rgba(22,163,74,.25)}
.cd-btn--green:hover{background:#15803d}
.cd-btn--green:disabled{opacity:.5;cursor:not-allowed}
.cd-btn--ghost{background:#f1f5f9;color:#374151}
.cd-btn--ghost:hover{background:#e2e8f0}
.cd-btn--sm{padding:5px 10px;font-size:11px}

.cd-form{background:#f8fafc;border:1px solid #f1f5f9;border-radius:12px;padding:16px;margin-bottom:12px;display:flex;flex-direction:column;gap:10px}
.cd-form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.cd-form-group{}
.cd-label{display:block;font-size:11px;font-weight:600;color:#374151;margin-bottom:4px}
.cd-input{width:100%;padding:8px 12px;border-radius:8px;border:1.5px solid #e2e8f0;font-size:13px;font-family:inherit;color:#0f172a;outline:none;background:#fff;box-sizing:border-box}
.cd-input:focus{border-color:#16a34a}
.cd-reasons{display:flex;gap:4px;flex-wrap:wrap}
.cd-reason{padding:5px 10px;border-radius:8px;border:1.5px solid #e2e8f0;background:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;color:#64748b;transition:all .12s}
.cd-reason:hover{border-color:#16a34a;color:#15803d}
.cd-reason--sel{border-color:#16a34a;background:#f0fdf4;color:#15803d}
.cd-form-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:4px}
.cd-error{padding:8px 12px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;font-size:12px;color:#b91c1c}

.cd-loading{font-size:12px;color:#94a3b8;text-align:center;padding:16px}
.cd-empty{text-align:center;padding:20px;font-size:12px;color:#94a3b8;background:#f8fafc;border-radius:10px;border:1px dashed #e2e8f0}

.cd-list{display:flex;flex-direction:column;gap:4px}
.cd-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;background:#fff;border:1px solid #f1f5f9;border-radius:10px;transition:all .12s}
.cd-item:hover{border-color:#e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.04)}
.cd-item-left{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.cd-date-badge{width:34px;height:34px;border-radius:8px;background:#fef2f2;border:1px solid #fecaca;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#b91c1c;flex-shrink:0}
.cd-date-badge--complex{background:#fffbeb;border-color:#fde68a;color:#92400e}
.cd-item-date{margin:0;font-size:12px;font-weight:600;color:#0f172a}
.cd-item-meta{margin:1px 0 0;font-size:11px;color:#94a3b8}
.cd-item-tag{display:inline-block;margin-left:4px;font-size:9px;font-weight:700;color:#92400e;background:#fffbeb;padding:1px 6px;border-radius:4px}
.cd-action{width:24px;height:24px;border-radius:6px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;color:#94a3b8;transition:all .12s;flex-shrink:0}
.cd-action:hover{background:#fef2f2;border-color:#fecaca;color:#ef4444}

@media(max-width:640px){.cd-form-row{grid-template-columns:1fr}}
`
