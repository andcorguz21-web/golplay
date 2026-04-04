/**
 * GolPlay — BookingModal
 * Modal de detalle de reserva para el calendario admin.
 *
 * v3.0: Diseño premium con:
 * - Info completa del cliente (nombre, cédula, teléfono, email)
 * - Edición inline del monto con save a Supabase
 * - Cambio de status (confirmar/cancelar)
 * - Notas de la reserva
 * - Indicador de precio (tarifa base vs precio especial vs manual)
 * - Animación de entrada
 *
 * Sin Tailwind. Estilos inline puros.
 */

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Booking, BookingStatus } from './daily'

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  booking: Booking
  onClose: () => void
  onDelete: (id: number) => void
  onUpdate?: (updated: Booking) => void
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  confirmed: { label: 'Confirmada', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', icon: '✓' },
  pending:   { label: 'Pendiente',  color: '#92400e', bg: '#fffbeb', border: '#fde68a', icon: '⏳' },
  cancelled: { label: 'Cancelada',  color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', icon: '✗' },
}

// ─── Price source labels ──────────────────────────────────────────────────────
function priceSourceLabel(src: string): { label: string; color: string; bg: string } {
  switch (src) {
    case 'customer_pricing': return { label: 'Precio especial', color: '#7c3aed', bg: '#f5f3ff' }
    case 'field_rate':       return { label: 'Tarifa horario',  color: '#0284c7', bg: '#f0f9ff' }
    case 'manual':           return { label: 'Manual',          color: '#d97706', bg: '#fffbeb' }
    default:                 return { label: 'Tarifa base',     color: '#64748b', bg: '#f8fafc' }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatCRC = (v: number) =>
  `₡${Number(v).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-CR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function fullName(b: Booking): string {
  return [b.customerName, b.customerLastName].filter(Boolean).join(' ') || 'Sin nombre'
}

function initials(b: Booking): string {
  const first = b.customerName?.[0] ?? ''
  const last = b.customerLastName?.[0] ?? ''
  return (first + last).toUpperCase() || '?'
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BookingModal({ booking, onClose, onDelete, onUpdate }: Props) {
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceValue, setPriceValue] = useState(String(booking.price ?? 0))
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesText, setNotesText] = useState(booking.notes || '')
  const [editingDateTime, setEditingDateTime] = useState(false)
  const [newDate, setNewDate] = useState(booking.date)
  const [newHour, setNewHour] = useState(booking.hour)
  const [dateTimeError, setDateTimeError] = useState('')
  const priceRef = useRef<HTMLInputElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  // Focus price input when editing
  useEffect(() => {
    if (editingPrice && priceRef.current) {
      priceRef.current.focus()
      priceRef.current.select()
    }
  }, [editingPrice])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  // ── Save price ──
  const savePrice = async () => {
    const newPrice = Number(priceValue)
    if (isNaN(newPrice) || newPrice < 0) {
      showToast('Monto inválido', false)
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('bookings')
      .update({ price: newPrice, price_source: 'manual' })
      .eq('id', booking.id)

    if (error) {
      showToast('Error al guardar', false)
    } else {
      showToast('Monto actualizado')
      onUpdate?.({ ...booking, price: newPrice, priceSource: 'manual' })
      setEditingPrice(false)
    }
    setSaving(false)
  }

  // ── Change status ──
  const changeStatus = async (newStatus: BookingStatus) => {
    setSaving(true)
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', booking.id)

    if (error) {
      showToast('Error al cambiar estado', false)
    } else {
      showToast(`Estado: ${STATUS_META[newStatus]?.label ?? newStatus}`)
      onUpdate?.({ ...booking, status: newStatus })
    }
    setSaving(false)
  }

  // ── Save notes ──
  const saveNotes = async () => {
    setSaving(true)
    const newNotes = notesText.trim() || null
    const { error } = await supabase
      .from('bookings')
      .update({ notes: newNotes })
      .eq('id', booking.id)

    if (error) {
      showToast('Error al guardar nota', false)
    } else {
      showToast('Nota guardada ✓')
      onUpdate?.({ ...booking, notes: newNotes ?? '' })
      setEditingNotes(false)
    }
    setSaving(false)
  }

  // ── Save date/hour change ──
  const saveDateTime = async () => {
    if (!newDate || !newHour) { setDateTimeError('Seleccioná fecha y hora'); return }
    if (newDate === booking.date && newHour === booking.hour) { setEditingDateTime(false); return }

    // Validate not in the past
    const today = new Date().toISOString().split('T')[0]
    if (newDate < today) { setDateTimeError('No se puede mover a una fecha pasada'); return }

    setSaving(true)
    setDateTimeError('')

    // Check availability
    const { data: existing } = await supabase
      .from('bookings')
      .select('id')
      .eq('field_id', booking.fieldId)
      .eq('date', newDate)
      .eq('hour', newHour)
      .in('status', ['confirmed', 'pending'])
      .neq('id', booking.id)

    if (existing && existing.length > 0) {
      setDateTimeError('Ese horario ya está ocupado en esa cancha')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('bookings')
      .update({ date: newDate, hour: newHour })
      .eq('id', booking.id)

    if (error) {
      showToast('Error al cambiar fecha/hora', false)
    } else {
      showToast('Fecha y hora actualizadas ✓')
      onUpdate?.({ ...booking, date: newDate, hour: newHour })
      setEditingDateTime(false)
    }
    setSaving(false)
  }

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 2500)
  }

  const status = STATUS_META[booking.status] ?? STATUS_META.confirmed
  const priceSrc = priceSourceLabel(booking.priceSource)
  const hasCustomerInfo = booking.customerName || booking.customerIdNumber || booking.customerPhone || booking.customerEmail

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={S.overlay}
    >
      <style>{`
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes toastPop {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={S.modal}>

        {/* ── Toast ── */}
        {toast && (
          <div style={{
            position: 'absolute', top: -44, left: '50%', transform: 'translateX(-50%)',
            background: toast.ok ? '#0f172a' : '#dc2626', color: '#fff',
            padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,.25)', whiteSpace: 'nowrap',
            animation: 'toastPop 0.2s ease',
          }}>
            {toast.ok ? '✓' : '✗'} {toast.msg}
          </div>
        )}

        {/* ── Header ── */}
        <div style={S.header}>
          <div style={S.headerLeft}>
            {/* Avatar */}
            <div style={S.avatar}>
              {initials(booking)}
            </div>
            <div>
              <p style={S.clientName}>{fullName(booking)}</p>
              <p style={S.bookingId}>Reserva #{booking.id}</p>
            </div>
          </div>
          <button onClick={onClose} style={S.closeBtn} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* ── Status badge ── */}
        <div style={S.statusRow}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12, fontWeight: 700, color: status.color,
            background: status.bg, border: `1px solid ${status.border}`,
            padding: '4px 12px', borderRadius: 999,
          }}>
            <span>{status.icon}</span>
            {status.label}
          </span>

          {/* Status quick actions */}
          {booking.status !== 'confirmed' && (
            <button
              style={{ ...S.statusAction, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0' }}
              onClick={() => changeStatus('confirmed')}
              disabled={saving}
            >
              ✓ Confirmar
            </button>
          )}
          {booking.status !== 'cancelled' && (
            <button
              style={{ ...S.statusAction, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca' }}
              onClick={() => changeStatus('cancelled')}
              disabled={saving}
            >
              ✗ Cancelar
            </button>
          )}
          {booking.status !== 'pending' && (
            <button
              style={{ ...S.statusAction, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a' }}
              onClick={() => changeStatus('pending')}
              disabled={saving}
            >
              ⏳ Pendiente
            </button>
          )}
        </div>

        {/* ── Booking info grid ── */}
        <div style={S.infoGrid}>
          <InfoItem icon="📍" label="Cancha" value={booking.fieldName} />
          {!editingDateTime ? (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }} onClick={() => { setEditingDateTime(true); setNewDate(booking.date); setNewHour(booking.hour); setDateTimeError('') }}>
                <span style={{ fontSize: 14, lineHeight: 1, marginTop: 1 }}>📅</span>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fecha</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', margin: '2px 0 0', borderBottom: '1px dashed #bbf7d0' }}>{formatDate(booking.date)} ✏️</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }} onClick={() => { setEditingDateTime(true); setNewDate(booking.date); setNewHour(booking.hour); setDateTimeError('') }}>
                <span style={{ fontSize: 14, lineHeight: 1, marginTop: 1 }}>🕐</span>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Hora</p>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', margin: '2px 0 0', borderBottom: '1px dashed #bbf7d0' }}>{booking.hour} ✏️</p>
                </div>
              </div>
            </>
          ) : (
            <div style={{ gridColumn: '1 / -1', background: '#f8fafc', borderRadius: 12, padding: 14, border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#374151', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                📅 Cambiar fecha y hora
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Fecha</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => { setNewDate(e.target.value); setDateTimeError('') }}
                    min={new Date().toISOString().split('T')[0]}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit',
                      color: '#0f172a', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Hora</label>
                  <select
                    value={newHour}
                    onChange={e => { setNewHour(e.target.value); setDateTimeError('') }}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit',
                      color: '#0f172a', outline: 'none', boxSizing: 'border-box',
                      appearance: 'none', background: '#fff',
                    }}
                  >
                    {['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'].map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
              {dateTimeError && (
                <p style={{ fontSize: 12, color: '#b91c1c', margin: '0 0 8px', fontWeight: 600, background: '#fef2f2', padding: '6px 10px', borderRadius: 8 }}>
                  ⚠️ {dateTimeError}
                </p>
              )}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setEditingDateTime(false); setDateTimeError('') }}
                  style={{ fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={saveDateTime}
                  disabled={saving}
                  style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#16a34a', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
                >
                  {saving ? '...' : 'Guardar cambio'}
                </button>
              </div>
            </div>
          )}
          {booking.source && (
            <InfoItem icon="📲" label="Origen" value={booking.source === 'admin' ? 'Admin' : booking.source === 'public' ? 'Página pública' : booking.source} />
          )}
        </div>

        {/* ── Price section ── */}
        <div style={S.priceSection}>
          <div style={S.priceLabelRow}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Monto</span>
            <span style={{
              fontSize: 10, fontWeight: 600, color: priceSrc.color,
              background: priceSrc.bg, padding: '2px 8px', borderRadius: 999,
            }}>
              {priceSrc.label}
            </span>
          </div>

          {editingPrice ? (
            <div style={S.priceEditRow}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#94a3b8' }}>₡</span>
              <input
                ref={priceRef}
                type="number"
                value={priceValue}
                onChange={e => setPriceValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') savePrice()
                  if (e.key === 'Escape') { setEditingPrice(false); setPriceValue(String(booking.price)) }
                }}
                style={S.priceInput}
                min={0}
              />
              <button onClick={savePrice} disabled={saving} style={S.priceSaveBtn}>
                {saving ? '...' : 'Guardar'}
              </button>
              <button onClick={() => { setEditingPrice(false); setPriceValue(String(booking.price)) }} style={S.priceCancelBtn}>
                ✗
              </button>
            </div>
          ) : (
            <div style={S.priceDisplayRow}>
              <span style={S.priceAmount}>{formatCRC(booking.price)}</span>
              <button onClick={() => setEditingPrice(true)} style={S.priceEditBtn}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                Editar
              </button>
            </div>
          )}
        </div>

        {/* ── Customer info ── */}
        {hasCustomerInfo && (
          <div style={S.customerSection}>
            <p style={S.sectionTitle}>Cliente</p>
            <div style={S.customerGrid}>
              {booking.customerIdNumber && (
                <CustomerRow icon="🪪" label="Cédula" value={booking.customerIdNumber} />
              )}
              {booking.customerPhone && (
                <CustomerRow
                  icon="📞"
                  label="Teléfono"
                  value={booking.customerPhone}
                  action={{ label: 'Llamar', href: `tel:${booking.customerPhone}` }}
                />
              )}
              {booking.customerEmail && (
                <CustomerRow
                  icon="✉️"
                  label="Email"
                  value={booking.customerEmail}
                  action={{ label: 'Enviar', href: `mailto:${booking.customerEmail}` }}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Notes (editable) ── */}
        <div style={S.notesSection}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={S.sectionTitle}>Notas</p>
            {!editingNotes && (
              <button
                onClick={() => { setEditingNotes(true); setNotesText(booking.notes || '') }}
                style={{ background: 'none', border: 'none', fontSize: 11, color: '#2563eb', fontWeight: 600, cursor: 'pointer', padding: '2px 6px' }}
              >
                {booking.notes ? '✏️ Editar' : '+ Agregar nota'}
              </button>
            )}
          </div>
          {editingNotes ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                value={notesText}
                onChange={e => setNotesText(e.target.value)}
                placeholder="Agregar notas sobre esta reserva..."
                autoFocus
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: '2px solid #2563eb', fontSize: 13, fontFamily: 'inherit',
                  resize: 'vertical', minHeight: 60, outline: 'none', color: '#0f172a',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setEditingNotes(false); setNotesText(booking.notes || '') }}
                  style={{ fontSize: 12, fontWeight: 600, color: '#64748b', background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={saveNotes}
                  disabled={saving}
                  style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: '#16a34a', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
                >
                  {saving ? '...' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : booking.notes ? (
            <p style={S.notesText}>{booking.notes}</p>
          ) : (
            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
              Sin notas — click "Agregar nota" para escribir una
            </p>
          )}
        </div>

        {/* ── Footer actions ── */}
        <div style={S.footer}>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} style={S.deleteBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Eliminar
            </button>
          ) : (
            <div style={S.confirmDeleteRow}>
              <span style={{ fontSize: 12, color: '#b91c1c', fontWeight: 500 }}>¿Eliminar esta reserva?</span>
              <button
                onClick={() => onDelete(booking.id)}
                style={{ ...S.confirmYes }}
              >
                Sí, eliminar
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={S.confirmNo}
              >
                No
              </button>
            </div>
          )}
          <button onClick={onClose} style={S.closeFooterBtn}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ fontSize: 14, lineHeight: 1, marginTop: 1 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', margin: '2px 0 0' }}>{value}</p>
      </div>
    </div>
  )
}

function CustomerRow({ icon, label, value, action }: {
  icon: string; label: string; value: string
  action?: { label: string; href: string }
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '8px 0', borderBottom: '1px solid #f8fafc',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontWeight: 600 }}>{label}</p>
          <p style={{ fontSize: 13, color: '#0f172a', margin: '1px 0 0', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
        </div>
      </div>
      {action && (
        <a
          href={action.href}
          style={{
            fontSize: 11, fontWeight: 600, color: '#2563eb',
            textDecoration: 'none', padding: '4px 10px',
            borderRadius: 8, background: '#eff6ff',
            transition: 'background 0.15s', flexShrink: 0,
          }}
        >
          {action.label}
        </a>
      )}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    padding: 16,
    animation: 'modalFadeIn 0.2s ease',
  },
  modal: {
    position: 'relative',
    background: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 460,
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 60px rgba(0,0,0,.2), 0 0 0 1px rgba(0,0,0,.05)',
    animation: 'modalSlideIn 0.25s ease',
    padding: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px 16px',
    borderBottom: '1px solid #f1f5f9',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #0f172a, #334155)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
    letterSpacing: '0.02em',
  },
  clientName: {
    fontSize: 15,
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
    lineHeight: 1.2,
  },
  bookingId: {
    fontSize: 11,
    color: '#94a3b8',
    margin: '2px 0 0',
    fontWeight: 500,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    border: 'none',
    background: '#f8fafc',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.15s',
    flexShrink: 0,
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 24px 0',
    flexWrap: 'wrap',
  },
  statusAction: {
    fontSize: 11,
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px 20px',
    padding: '16px 24px',
  },
  priceSection: {
    margin: '0 24px',
    padding: '14px 16px',
    background: '#f8fafc',
    borderRadius: 14,
    border: '1px solid #f1f5f9',
  },
  priceLabelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceDisplayRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: 700,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  priceEditBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    fontWeight: 600,
    color: '#2563eb',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    padding: '6px 12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  priceEditRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 700,
    color: '#0f172a',
    background: '#fff',
    border: '2px solid #2563eb',
    borderRadius: 10,
    padding: '6px 12px',
    outline: 'none',
    maxWidth: 140,
  },
  priceSaveBtn: {
    fontSize: 12,
    fontWeight: 700,
    color: '#fff',
    background: '#16a34a',
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  priceCancelBtn: {
    fontSize: 14,
    fontWeight: 600,
    color: '#94a3b8',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  customerSection: {
    padding: '16px 24px 0',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: '0 0 8px',
  },
  customerGrid: {
    background: '#f8fafc',
    borderRadius: 12,
    padding: '4px 14px',
    border: '1px solid #f1f5f9',
  },
  notesSection: {
    padding: '16px 24px 0',
  },
  notesText: {
    fontSize: 13,
    color: '#475569',
    margin: 0,
    background: '#fffbeb',
    border: '1px solid #fef3c7',
    borderRadius: 10,
    padding: '10px 14px',
    lineHeight: 1.5,
    fontStyle: 'italic',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px 20px',
    marginTop: 8,
  },
  deleteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    fontWeight: 600,
    color: '#b91c1c',
    background: 'none',
    border: '1px solid #fecaca',
    borderRadius: 10,
    padding: '8px 14px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  confirmDeleteRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  confirmYes: {
    fontSize: 12,
    fontWeight: 700,
    color: '#fff',
    background: '#dc2626',
    border: 'none',
    borderRadius: 8,
    padding: '7px 14px',
    cursor: 'pointer',
  },
  confirmNo: {
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: 8,
    padding: '7px 12px',
    cursor: 'pointer',
  },
  closeFooterBtn: {
    fontSize: 13,
    fontWeight: 600,
    color: '#475569',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: 10,
    padding: '8px 20px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
}
