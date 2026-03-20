/**
 * GolPlay — Admin Customers CRM v2.0
 * pages/admin/customers.tsx
 *
 * Premium SaaS CRM — "Refined Sport Intelligence"
 * - DM Sans typography
 * - Table view with sortable columns
 * - Slide-over detail panel with dark header
 * - Animated KPI strip
 * - Excel export
 * - Inline edit, booking history, special pricing
 */

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'
import ValidationBanner from '@/components/ui/admin/ValidationBanner'
import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Customer {
  id: number; first_name: string; last_name: string | null
  id_number: string | null; phone: string | null; email: string | null
  notes: string | null; created_at: string
  bookings_count: number; total_spent: number; last_visit: string | null; avg_ticket: number
}

interface CustomerBooking {
  id: number; date: string; hour: string; status: string
  price: number | null; field_name: string; source: string | null
}

interface CustomerPricing {
  id: number; field_id: number; field_name: string; price: number; hour: string | null; notes: string | null
}

interface Field { id: number; name: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) => `₡${Math.round(v).toLocaleString('es-CR')}`
const fmtShort = (v: number) => v >= 1_000_000 ? `₡${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `₡${(v/1000).toFixed(0)}K` : fmt(v)
const fmtDate = (d: string) => { try { return new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return d } }
const fmtDateShort = (d: string) => { try { return new Date(d + 'T12:00:00').toLocaleDateString('es-CR', { day: 'numeric', month: 'short' }) } catch { return d } }

const relativeDate = (d: string) => {
  const now = new Date(); now.setHours(0,0,0,0)
  const target = new Date(d + 'T12:00:00'); target.setHours(0,0,0,0)
  const diff = Math.round((now.getTime() - target.getTime()) / 86400000)
  if (diff < -1) return `En ${Math.abs(diff)}d`
  if (diff === -1) return 'Mañana'
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  if (diff < 7) return `${diff}d atrás`
  if (diff < 30) return `${Math.floor(diff/7)} sem`
  if (diff < 365) return `${Math.floor(diff/30)}m`
  return `${Math.floor(diff/365)}a`
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  confirmed: { label: 'Confirmada', color: '#15803d', bg: '#f0fdf4', dot: '#22c55e' },
  pending:   { label: 'Pendiente',  color: '#92400e', bg: '#fffbeb', dot: '#f59e0b' },
  cancelled: { label: 'Cancelada',  color: '#991b1b', bg: '#fef2f2', dot: '#ef4444' },
  completed: { label: 'Completada', color: '#1e40af', bg: '#eff6ff', dot: '#3b82f6' },
  no_show:   { label: 'No Show',    color: '#6b7280', bg: '#f9fafb', dot: '#9ca3af' },
}

type SortKey = 'name' | 'bookings' | 'spent' | 'last_visit'

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminCustomers() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [complexId, setComplexId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [fields, setFields] = useState<Field[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const [selected, setSelected] = useState<Customer | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [detailTab, setDetailTab] = useState<'info'|'history'|'pricing'>('info')
  const [bookingHistory, setBookingHistory] = useState<CustomerBooking[]>([])
  const [pricing, setPricing] = useState<CustomerPricing[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name:'', lastName:'', phone:'', email:'', idNumber:'', notes:'' })
  const [saving, setSaving] = useState(false)

  const [newPriceField, setNewPriceField] = useState('')
  const [newPriceAmount, setNewPriceAmount] = useState('')
  const [newPriceHour, setNewPriceHour] = useState('')
  const [newPriceNote, setNewPriceNote] = useState('')
  const [editPricingId, setEditPricingId] = useState<number | null>(null)
  const [editPricingAmount, setEditPricingAmount] = useState('')

  const showToast = useCallback((msg: string, ok = true) => { setToast({ msg, ok }); setTimeout(() => setToast(null), 3200) }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const uid = data.session.user.id; setUserId(uid)
      const { data: cx } = await supabase.from('complexes').select('id').eq('owner_id', uid).limit(1).single()
      if (cx) setComplexId(cx.id)
      const { data: f } = await supabase.from('fields').select('id, name').eq('owner_id', uid).order('name')
      setFields(f || [])
    })
  }, [router])

  const loadCustomers = useCallback(async () => {
    if (!complexId) return; setLoading(true)
    const { data: custData } = await supabase.from('complex_customers').select('*').eq('complex_id', complexId).order('first_name')
    if (!custData) { setLoading(false); return }
    const ids = custData.map(c => c.id)
    const { data: bk } = await supabase.from('bookings').select('customer_ref, date, price, status').in('customer_ref', ids.length ? ids : [-1]).neq('status', 'cancelled')
    const map: Record<number, { count: number; spent: number; last: string | null }> = {}
    bk?.forEach(b => {
      if (!b.customer_ref) return
      if (!map[b.customer_ref]) map[b.customer_ref] = { count: 0, spent: 0, last: null }
      map[b.customer_ref].count++
      map[b.customer_ref].spent += Number(b.price || 0)
      if (!map[b.customer_ref].last || b.date > map[b.customer_ref].last!) map[b.customer_ref].last = b.date
    })
    setCustomers(custData.map(c => ({ ...c, bookings_count: map[c.id]?.count || 0, total_spent: map[c.id]?.spent || 0, last_visit: map[c.id]?.last || null, avg_ticket: map[c.id]?.count ? Math.round((map[c.id]?.spent || 0) / map[c.id]!.count) : 0 })))
    setLoading(false)
  }, [complexId])

  useEffect(() => { if (complexId) loadCustomers() }, [loadCustomers, complexId])

  const openDetail = async (c: Customer) => {
    setSelected(c); setPanelOpen(true); setDetailTab('info'); setEditing(false); setLoadingDetail(true)
    const { data: bk } = await supabase.from('bookings').select('id, date, hour, status, price, source, fields:field_id(name)').eq('customer_ref', c.id).order('date', { ascending: false }).limit(100)
    setBookingHistory((bk || []).map((b: any) => ({ id: b.id, date: b.date, hour: b.hour, status: b.status, price: b.price ? Number(b.price) : null, source: b.source || null, field_name: Array.isArray(b.fields) ? b.fields[0]?.name : b.fields?.name ?? '—' })))
    const { data: pr } = await supabase.from('customer_pricing').select('id, field_id, price, hour, notes, fields:field_id(name)').eq('customer_id', c.id)
    setPricing((pr || []).map((p: any) => ({ id: p.id, field_id: p.field_id, field_name: Array.isArray(p.fields) ? p.fields[0]?.name : p.fields?.name ?? '—', price: Number(p.price), hour: p.hour || null, notes: p.notes })))
    setLoadingDetail(false)
  }

  const closePanel = () => { setPanelOpen(false); setTimeout(() => { setSelected(null); setEditing(false) }, 300) }

  const startEdit = () => { if (!selected) return; setEditForm({ name: selected.first_name, lastName: selected.last_name || '', phone: selected.phone || '', email: selected.email || '', idNumber: selected.id_number || '', notes: selected.notes || '' }); setEditing(true) }

  const saveEdit = async () => {
    if (!selected) return; setSaving(true)
    const { error } = await supabase.from('complex_customers').update({ first_name: editForm.name.trim(), last_name: editForm.lastName.trim() || null, phone: editForm.phone.trim() || null, email: editForm.email.trim() || null, id_number: editForm.idNumber.trim() || null, notes: editForm.notes.trim() || null }).eq('id', selected.id)
    setSaving(false)
    if (error) { showToast('Error al guardar', false); return }
    showToast('Cliente actualizado ✓'); setEditing(false); loadCustomers()
    setSelected(prev => prev ? { ...prev, first_name: editForm.name.trim(), last_name: editForm.lastName.trim() || null, phone: editForm.phone.trim() || null, email: editForm.email.trim() || null, id_number: editForm.idNumber.trim() || null, notes: editForm.notes.trim() || null } : null)
  }

  const addPricing = async () => {
    if (!selected || !newPriceField || !newPriceAmount) return
    const fieldId = Number(newPriceField)
    const newPrice = Number(newPriceAmount)
    const hour = newPriceHour || null

    // 1. Guardar precio especial
    const { error } = await supabase.from('customer_pricing').insert({
      customer_id: selected.id, field_id: fieldId, price: newPrice,
      hour, notes: newPriceNote.trim() || null,
    })
    if (error) { showToast('Error al agregar', false); return }

    // 2. Actualizar reservas FUTURAS de este cliente en esta cancha
    const today = new Date().toISOString().split('T')[0]
    let updateQuery = supabase
      .from('bookings')
      .update({ price: newPrice, price_source: 'customer_pricing' })
      .eq('customer_ref', selected.id)
      .eq('field_id', fieldId)
      .neq('status', 'cancelled')
      .gte('date', today)

    if (hour) {
      updateQuery = updateQuery.eq('hour', hour)
    }

    const { data: updated, error: updateErr } = await updateQuery.select('id')
    const updatedCount = updated?.length ?? 0

    if (updateErr) {
      showToast(`Precio guardado, pero error al actualizar reservas futuras`, false)
    } else if (updatedCount > 0) {
      showToast(`Precio especial agregado ✓ · ${updatedCount} reserva${updatedCount > 1 ? 's' : ''} futura${updatedCount > 1 ? 's' : ''} actualizada${updatedCount > 1 ? 's' : ''}`)
    } else {
      showToast('Precio especial agregado ✓')
    }

    setNewPriceField(''); setNewPriceAmount(''); setNewPriceHour(''); setNewPriceNote('')
    openDetail(selected)
  }

  const deletePricing = async (pricingId: number) => {
    // Get the pricing details before deleting
    const pricingItem = pricing.find(p => p.id === pricingId)
    if (!pricingItem || !selected) return

    // 1. Delete the pricing rule
    await supabase.from('customer_pricing').delete().eq('id', pricingId)

    // 2. Revert future bookings to base rate
    // First get the field's base price
    const { data: fieldData } = await supabase
      .from('fields')
      .select('price_day')
      .eq('id', pricingItem.field_id)
      .single()

    if (fieldData) {
      const today = new Date().toISOString().split('T')[0]
      let revertQuery = supabase
        .from('bookings')
        .update({ price: fieldData.price_day, price_source: 'base' })
        .eq('customer_ref', selected.id)
        .eq('field_id', pricingItem.field_id)
        .eq('price_source', 'customer_pricing')
        .neq('status', 'cancelled')
        .gte('date', today)

      if (pricingItem.hour) {
        revertQuery = revertQuery.eq('hour', pricingItem.hour)
      }

      const { data: reverted } = await revertQuery.select('id')
      const revertedCount = reverted?.length ?? 0

      if (revertedCount > 0) {
        showToast(`Precio eliminado · ${revertedCount} reserva${revertedCount > 1 ? 's' : ''} revertida${revertedCount > 1 ? 's' : ''} a tarifa base`)
      } else {
        showToast('Precio eliminado')
      }
    } else {
      showToast('Precio eliminado')
    }

    openDetail(selected)
  }

  const updatePricing = async (pricingId: number) => {
    const newPrice = Number(editPricingAmount)
    if (isNaN(newPrice) || newPrice <= 0) { showToast('Monto inválido', false); return }
    const pricingItem = pricing.find(p => p.id === pricingId)
    if (!pricingItem || !selected) return

    // 1. Update the pricing rule
    const { error } = await supabase.from('customer_pricing').update({ price: newPrice }).eq('id', pricingId)
    if (error) { showToast('Error al actualizar', false); return }

    // 2. Update future bookings with this pricing
    const today = new Date().toISOString().split('T')[0]
    let updateQuery = supabase
      .from('bookings')
      .update({ price: newPrice, price_source: 'customer_pricing' })
      .eq('customer_ref', selected.id)
      .eq('field_id', pricingItem.field_id)
      .eq('price_source', 'customer_pricing')
      .neq('status', 'cancelled')
      .gte('date', today)

    if (pricingItem.hour) {
      updateQuery = updateQuery.eq('hour', pricingItem.hour)
    }

    const { data: updated } = await updateQuery.select('id')
    const updatedCount = updated?.length ?? 0

    setEditPricingId(null)
    if (updatedCount > 0) {
      showToast(`Precio actualizado ✓ · ${updatedCount} reserva${updatedCount > 1 ? 's' : ''} futura${updatedCount > 1 ? 's' : ''} actualizada${updatedCount > 1 ? 's' : ''}`)
    } else {
      showToast('Precio actualizado ✓')
    }
    openDetail(selected)
  }

  const toggleSort = (key: SortKey) => { if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(key); setSortDir(key === 'name' ? 'asc' : 'desc') } }

  const filtered = useMemo(() => {
    let list = customers
    if (search) { const s = search.toLowerCase(); list = list.filter(c => c.first_name.toLowerCase().includes(s) || (c.last_name?.toLowerCase().includes(s)) || (c.id_number?.includes(s)) || (c.phone?.includes(s)) || (c.email?.toLowerCase().includes(s))) }
    return [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortBy) {
        case 'bookings': return (a.bookings_count - b.bookings_count) * dir
        case 'spent': return (a.total_spent - b.total_spent) * dir
        case 'last_visit': return ((a.last_visit || '') > (b.last_visit || '') ? 1 : -1) * dir
        default: return a.first_name.localeCompare(b.first_name) * dir
      }
    })
  }, [customers, search, sortBy, sortDir])

  const stats = useMemo(() => ({ total: customers.length, active: customers.filter(c => c.bookings_count > 0).length, revenue: customers.reduce((s, c) => s + c.total_spent, 0), avgSpend: customers.length ? Math.round(customers.reduce((s, c) => s + c.total_spent, 0) / Math.max(customers.filter(c => c.bookings_count > 0).length, 1)) : 0 }), [customers])

  const exportExcel = () => {
    const rows = filtered.map(c => ({ 'Nombre': c.first_name + (c.last_name ? ` ${c.last_name}` : ''), 'Cédula': c.id_number || '', 'Teléfono': c.phone || '', 'Email': c.email || '', 'Reservas': c.bookings_count, 'Gasto Total (₡)': c.total_spent, 'Ticket Promedio (₡)': c.avg_ticket, 'Última Reserva': c.last_visit || '', 'Notas': c.notes || '', 'Registrado': c.created_at?.split('T')[0] || '' }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 14 }, { wch: 25 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 14 }, { wch: 30 }, { wch: 12 }]
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, `clientes_golplay_${new Date().toISOString().split('T')[0]}.xlsx`)
    showToast(`${rows.length} clientes exportados ✓`)
  }

  useEffect(() => { document.body.style.overflow = panelOpen ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [panelOpen])

  return (
    <AdminLayout>
      <style>{CSS}</style>
      {toast && <div className={`cx-toast ${toast.ok ? 'cx-toast--ok' : 'cx-toast--err'}`}>{toast.msg}</div>}

      <div className="cx-page">
        <div className="cx-head">
          <div>
            <h1 className="cx-h1">Clientes</h1>
            <p className="cx-h1-sub">Base de datos de tu complejo deportivo</p>
          </div>
          <div className="cx-head__actions">
            <button className="cx-btn cx-btn--outline" onClick={exportExcel} title="Exportar a Excel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar
            </button>
          </div>
        </div>

        <div className="cx-kpis">
          {[{ value: String(stats.total), label: 'Total clientes', accent: '#6366f1' }, { value: String(stats.active), label: 'Con reservas', accent: '#16a34a' }, { value: fmtShort(stats.revenue), label: 'Ingresos totales', accent: '#0891b2' }, { value: fmtShort(stats.avgSpend), label: 'Gasto promedio', accent: '#f59e0b' }].map((k, i) => (
            <div key={i} className="cx-kpi" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="cx-kpi__accent" style={{ background: k.accent }} />
              <span className="cx-kpi__value">{loading ? '—' : k.value}</span>
              <span className="cx-kpi__label">{k.label}</span>
            </div>
          ))}
        </div>

        <ValidationBanner />

        <div className="cx-toolbar">
          <div className="cx-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input className="cx-search__input" placeholder="Buscar por nombre, cédula, teléfono o email…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="cx-search__x" onClick={() => setSearch('')}>×</button>}
          </div>
          <div className="cx-sort-chips">
            {([{ key: 'name' as SortKey, label: 'Nombre' }, { key: 'bookings' as SortKey, label: 'Reservas' }, { key: 'spent' as SortKey, label: 'Gasto' }, { key: 'last_visit' as SortKey, label: 'Última visita' }]).map(s => (
              <button key={s.key} className={`cx-sort-chip ${sortBy === s.key ? 'cx-sort-chip--active' : ''}`} onClick={() => toggleSort(s.key)}>
                {s.label}{sortBy === s.key && <span>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>}
              </button>
            ))}
          </div>
          <span className="cx-result-count">{filtered.length} de {customers.length}</span>
        </div>

        <div className="cx-table-wrap">
          {loading ? (
            <div className="cx-sk-rows">{[1,2,3,4,5,6].map(i => <div key={i} className="cx-sk-row" style={{ animationDelay: `${i*60}ms` }} />)}</div>
          ) : filtered.length === 0 ? (
            <div className="cx-empty">
              <span className="cx-empty__ico">{search ? '🔍' : '👥'}</span>
              <p className="cx-empty__title">{search ? 'Sin resultados' : 'Sin clientes aún'}</p>
              <p className="cx-empty__sub">{search ? 'Probá con otro término de búsqueda' : 'Los clientes aparecerán cuando tengas reservas'}</p>
            </div>
          ) : (
            <table className="cx-table">
              <thead><tr>
                <th>Cliente</th><th className="cx-th--right">Reservas</th><th className="cx-th--right">Gasto total</th><th className="cx-th--right">Ticket prom.</th><th>Última reserva</th><th></th>
              </tr></thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id} className={`cx-tr ${selected?.id === c.id ? 'cx-tr--sel' : ''}`} style={{ animationDelay: `${Math.min(i, 15) * 30}ms` }} onClick={() => openDetail(c)}>
                    <td>
                      <div className="cx-cell-client">
                        <div className="cx-avatar">{(c.first_name[0] || '?').toUpperCase()}</div>
                        <div>
                          <span className="cx-cell-name">{c.first_name}{c.last_name ? ` ${c.last_name}` : ''}</span>
                          <span className="cx-cell-meta">{c.id_number || ''}{c.id_number && c.phone ? ' · ' : ''}{c.phone || ''}</span>
                        </div>
                      </div>
                    </td>
                    <td className="cx-td--right cx-td--mono">{c.bookings_count}</td>
                    <td className="cx-td--right cx-td--mono cx-td--bold">{fmt(c.total_spent)}</td>
                    <td className="cx-td--right cx-td--mono">{c.avg_ticket ? fmt(c.avg_ticket) : '—'}</td>
                    <td>{c.last_visit ? <span className="cx-date-pill">{relativeDate(c.last_visit)}</span> : <span className="cx-date-pill cx-date-pill--empty">—</span>}</td>
                    <td><button className="cx-row-action" title="Ver ficha"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {panelOpen && <div className="cx-overlay" onClick={closePanel} />}
      <div className={`cx-panel ${panelOpen ? 'cx-panel--open' : ''}`}>
        {selected && (<>
          <div className="cx-panel__head">
            <button className="cx-panel__close" onClick={closePanel}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
            <div className="cx-panel__avatar">{(selected.first_name[0] || '?').toUpperCase()}</div>
            <h2 className="cx-panel__name">{selected.first_name}{selected.last_name ? ` ${selected.last_name}` : ''}</h2>
            {selected.id_number && <p className="cx-panel__id">🪪 {selected.id_number}</p>}
            {selected.phone && <p className="cx-panel__contact">📱 {selected.phone}</p>}
            {selected.email && <p className="cx-panel__contact">✉️ {selected.email}</p>}
          </div>

          <div className="cx-panel__kpis">
            <div className="cx-pk"><span className="cx-pk__v">{selected.bookings_count}</span><span className="cx-pk__l">Reservas</span></div>
            <div className="cx-pk"><span className="cx-pk__v">{fmtShort(selected.total_spent)}</span><span className="cx-pk__l">Gasto</span></div>
            <div className="cx-pk"><span className="cx-pk__v">{selected.last_visit ? relativeDate(selected.last_visit) : '—'}</span><span className="cx-pk__l">Última</span></div>
            <div className="cx-pk"><span className="cx-pk__v">{selected.avg_ticket ? fmtShort(selected.avg_ticket) : '—'}</span><span className="cx-pk__l">Promedio</span></div>
          </div>

          <div className="cx-ptabs">
            {(['info','history','pricing'] as const).map(t => (
              <button key={t} className={`cx-ptab ${detailTab === t ? 'cx-ptab--on' : ''}`} onClick={() => setDetailTab(t)}>
                {t === 'info' ? 'Datos' : t === 'history' ? `Historial${bookingHistory.length ? ` (${bookingHistory.length})` : ''}` : `Precios${pricing.length ? ` (${pricing.length})` : ''}`}
              </button>
            ))}
          </div>

          <div className="cx-panel__body">
            {detailTab === 'info' && (editing ? (
              <div className="cx-edit">
                {[{ label:'Nombre', key:'name', type:'text' }, { label:'Apellido', key:'lastName', type:'text' }, { label:'Cédula', key:'idNumber', type:'text' }, { label:'Teléfono', key:'phone', type:'tel' }, { label:'Email', key:'email', type:'email' }].map(f => (
                  <div key={f.key} className="cx-edit__field">
                    <label>{f.label}</label>
                    <input type={f.type} value={(editForm as any)[f.key]} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} />
                  </div>
                ))}
                <div className="cx-edit__field cx-edit__field--full"><label>Notas</label><textarea rows={3} value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} /></div>
                <div className="cx-edit__actions">
                  <button className="cx-btn cx-btn--ghost" onClick={() => setEditing(false)}>Cancelar</button>
                  <button className="cx-btn cx-btn--primary" onClick={saveEdit} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
                </div>
              </div>
            ) : (
              <div className="cx-info">
                <button className="cx-info__edit" onClick={startEdit}>✏️ Editar datos</button>
                {[{ l:'Nombre completo', v:`${selected.first_name}${selected.last_name ? ` ${selected.last_name}` : ''}` }, { l:'Cédula', v:selected.id_number || '—' }, { l:'Teléfono', v:selected.phone || '—' }, { l:'Email', v:selected.email || '—' }, { l:'Notas', v:selected.notes || '—' }, { l:'Registrado', v:selected.created_at ? fmtDate(selected.created_at.split('T')[0]) : '—' }].map(r => (
                  <div key={r.l} className="cx-info__row"><span className="cx-info__label">{r.l}</span><span className="cx-info__value">{r.v}</span></div>
                ))}
              </div>
            ))}

            {detailTab === 'history' && (loadingDetail ? <div className="cx-panel-loading">Cargando…</div> : bookingHistory.length === 0 ? <div className="cx-panel-empty">Sin reservas registradas</div> : (
              <div className="cx-hist">
                {bookingHistory.map(b => { const st = STATUS_CFG[b.status] || STATUS_CFG.confirmed; return (
                  <div key={b.id} className="cx-hist__row">
                    <div className="cx-hist__dot" style={{ background: st.dot }} />
                    <div className="cx-hist__main">
                      <div className="cx-hist__top"><span className="cx-hist__field">{b.field_name}</span><span className="cx-hist__badge" style={{ color: st.color, background: st.bg }}>{st.label}</span></div>
                      <span className="cx-hist__when">{fmtDateShort(b.date)} · {b.hour}{b.source ? ` · ${b.source}` : ''}</span>
                    </div>
                    <span className="cx-hist__price">{b.price ? fmt(b.price) : '—'}</span>
                  </div>
                )})}
              </div>
            ))}

            {detailTab === 'pricing' && (
              <div>
                {pricing.length > 0 && <div className="cx-plist">{pricing.map(p => (
                  <div key={p.id} className="cx-pitem">
                    <div>
                      <span className="cx-pitem__name">{p.field_name}{p.hour ? ` · ${p.hour}` : ''}</span>
                      {p.hour && <span className="cx-pitem__note">Aplica solo a las {p.hour}</span>}
                      {!p.hour && <span className="cx-pitem__note">Aplica a cualquier hora</span>}
                      {p.notes && <span className="cx-pitem__note">{p.notes}</span>}
                    </div>
                    <div className="cx-pitem__right">
                      {editPricingId === p.id ? (
                        <>
                          <input
                            type="number"
                            value={editPricingAmount}
                            onChange={e => setEditPricingAmount(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') updatePricing(p.id); if (e.key === 'Escape') setEditPricingId(null) }}
                            autoFocus
                            style={{ width: 80, padding: '4px 8px', borderRadius: 6, border: '2px solid #16a34a', fontSize: 13, fontWeight: 700, outline: 'none', fontFamily: 'inherit' }}
                            min={0}
                          />
                          <button className="cx-btn cx-btn--primary cx-btn--sm" onClick={() => updatePricing(p.id)} style={{ padding: '4px 8px' }}>✓</button>
                          <button className="cx-pitem__del" onClick={() => setEditPricingId(null)}>✗</button>
                        </>
                      ) : (
                        <>
                          <span
                            className="cx-pitem__price"
                            onClick={() => { setEditPricingId(p.id); setEditPricingAmount(String(p.price)) }}
                            style={{ cursor: 'pointer', borderBottom: '1px dashed #bbf7d0' }}
                            title="Click para editar precio"
                          >
                            {fmt(p.price)}
                          </span>
                          <button className="cx-pitem__del" onClick={() => deletePricing(p.id)}>×</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}</div>}
                <div className="cx-padd">
                  <p className="cx-padd__title">+ Agregar precio especial</p>
                  <div className="cx-padd__form">
                    <select value={newPriceField} onChange={e => setNewPriceField(e.target.value)}><option value="">Cancha…</option>{fields.map(f => <option key={f.id} value={String(f.id)}>{f.name}</option>)}</select>
                    <select value={newPriceHour} onChange={e => setNewPriceHour(e.target.value)}>
                      <option value="">Cualquier hora</option>
                      {['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'].map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <input type="number" placeholder="₡ Precio" value={newPriceAmount} onChange={e => setNewPriceAmount(e.target.value)} />
                    <input placeholder="Nota (opcional)" value={newPriceNote} onChange={e => setNewPriceNote(e.target.value)} />
                    <button className="cx-btn cx-btn--primary cx-btn--sm" onClick={addPricing} disabled={!newPriceField || !newPriceAmount}>+</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>)}
      </div>
    </AdminLayout>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');
.cx-page{font-family:'DM Sans',sans-serif;padding:24px 24px 80px;color:#0f172a}
.cx-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:20px}
.cx-h1{font-size:24px;font-weight:800;letter-spacing:-.4px;margin:0}.cx-h1-sub{font-size:13px;color:#94a3b8;margin:3px 0 0}
.cx-head__actions{display:flex;gap:8px}
.cx-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
.cx-kpi{background:#fff;border-radius:14px;padding:16px 18px;position:relative;overflow:hidden;border:1px solid #f1f5f9;box-shadow:0 1px 3px rgba(0,0,0,.03);animation:cxUp .35s ease both}
.cx-kpi__accent{position:absolute;left:0;top:0;bottom:0;width:3px;border-radius:0 3px 3px 0}
.cx-kpi__value{display:block;font-size:22px;font-weight:800;color:#0f172a;letter-spacing:-.4px}
.cx-kpi__label{display:block;font-size:10px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;margin-top:2px}
.cx-toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.cx-search{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid #e2e8f0;border-radius:11px;padding:0 12px;height:38px;flex:1;min-width:220px;max-width:400px;transition:border-color .15s}
.cx-search:focus-within{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.08)}
.cx-search__input{border:none;outline:none;font-size:13px;flex:1;background:transparent;color:#0f172a;font-family:inherit}
.cx-search__input::placeholder{color:#94a3b8}.cx-search__x{background:none;border:none;cursor:pointer;color:#94a3b8;font-size:16px;line-height:1}
.cx-sort-chips{display:flex;gap:4px}
.cx-sort-chip{padding:5px 12px;border-radius:8px;border:1.5px solid #e2e8f0;background:#fff;font-size:11px;font-weight:600;color:#64748b;cursor:pointer;font-family:inherit;transition:all .12s;display:flex;align-items:center;gap:4px}
.cx-sort-chip:hover{border-color:#cbd5e1;color:#0f172a}
.cx-sort-chip--active{border-color:#0f172a;background:#0f172a;color:#fff}
.cx-result-count{font-size:11px;color:#94a3b8;font-weight:600;margin-left:auto;white-space:nowrap}
.cx-table-wrap{background:#fff;border-radius:16px;border:1px solid #f1f5f9;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.03)}
.cx-table{width:100%;border-collapse:collapse}
.cx-table thead th{padding:12px 16px;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;text-align:left;border-bottom:1px solid #f1f5f9;background:#fafbfc}
.cx-th--right{text-align:right!important}
.cx-table tbody tr{cursor:pointer;transition:background .1s;animation:cxUp .3s ease both}
.cx-table tbody tr:hover{background:#f8fafc}.cx-tr--sel{background:#f0fdf4!important}
.cx-table td{padding:12px 16px;font-size:13px;border-bottom:1px solid #f8fafc;vertical-align:middle}
.cx-td--right{text-align:right}.cx-td--mono{font-variant-numeric:tabular-nums}.cx-td--bold{font-weight:700}
.cx-cell-client{display:flex;align-items:center;gap:10px}
.cx-avatar{width:34px;height:34px;border-radius:10px;flex-shrink:0;background:linear-gradient(135deg,#e2e8f0,#cbd5e1);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#475569}
.cx-tr--sel .cx-avatar{background:linear-gradient(135deg,#16a34a,#15803d);color:#fff}
.cx-cell-name{display:block;font-weight:600;color:#0f172a;font-size:13px}
.cx-cell-meta{display:block;font-size:11px;color:#94a3b8;margin-top:1px}
.cx-date-pill{font-size:11px;font-weight:600;color:#64748b;background:#f1f5f9;padding:3px 10px;border-radius:999px}
.cx-date-pill--empty{color:#cbd5e1}
.cx-row-action{background:none;border:none;cursor:pointer;color:#cbd5e1;padding:4px;border-radius:6px;transition:all .12s}
.cx-row-action:hover{color:#0f172a;background:#f1f5f9}
.cx-overlay{position:fixed;inset:0;background:rgba(15,23,42,.4);backdrop-filter:blur(4px);z-index:200;animation:cxFade .2s ease}
.cx-panel{position:fixed;top:0;right:0;bottom:0;width:480px;max-width:100vw;background:#fff;z-index:300;display:flex;flex-direction:column;box-shadow:-8px 0 40px rgba(0,0,0,.15);transform:translateX(100%);transition:transform .3s cubic-bezier(.4,0,.2,1)}
.cx-panel--open{transform:translateX(0)}
.cx-panel__head{padding:24px 24px 20px;position:relative;background:linear-gradient(160deg,#052e16 0%,#0B4D2C 100%);color:#fff}
.cx-panel__close{position:absolute;top:16px;right:16px;width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);cursor:pointer;color:rgba(255,255,255,.6);display:flex;align-items:center;justify-content:center;transition:all .12s}
.cx-panel__close:hover{background:rgba(255,255,255,.15);color:#fff}
.cx-panel__avatar{width:52px;height:52px;border-radius:14px;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;margin-bottom:12px}
.cx-panel__name{font-size:20px;font-weight:800;margin:0;letter-spacing:-.3px}
.cx-panel__id{font-size:12px;color:rgba(255,255,255,.55);margin:4px 0 0}
.cx-panel__contact{font-size:12px;color:rgba(255,255,255,.45);margin:2px 0 0}
.cx-panel__kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#f1f5f9}
.cx-pk{background:#fff;padding:12px 8px;text-align:center}
.cx-pk__v{display:block;font-size:15px;font-weight:800;color:#0f172a}
.cx-pk__l{display:block;font-size:9px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-top:2px}
.cx-ptabs{display:flex;gap:1px;padding:0 24px;border-bottom:1px solid #f1f5f9}
.cx-ptab{padding:11px 14px;border:none;background:transparent;font-size:12px;font-weight:600;color:#94a3b8;cursor:pointer;font-family:inherit;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .12s}
.cx-ptab:hover{color:#0f172a}.cx-ptab--on{color:#16a34a;border-bottom-color:#16a34a}
.cx-panel__body{flex:1;overflow-y:auto;padding:20px 24px}
.cx-panel-loading,.cx-panel-empty{text-align:center;padding:32px;color:#94a3b8;font-size:13px}
.cx-info{display:flex;flex-direction:column}
.cx-info__edit{align-self:flex-end;padding:6px 14px;border-radius:8px;border:1.5px solid #e2e8f0;background:#fff;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;color:#374151;transition:all .12s;margin-bottom:12px}
.cx-info__edit:hover{background:#f8fafc;border-color:#cbd5e1}
.cx-info__row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #f8fafc}
.cx-info__row:last-child{border-bottom:none}
.cx-info__label{font-size:12px;font-weight:600;color:#94a3b8}
.cx-info__value{font-size:13px;font-weight:500;color:#0f172a;text-align:right;max-width:60%;word-break:break-word}
.cx-edit{display:flex;flex-direction:column;gap:12px}
.cx-edit__field{display:flex;flex-direction:column;gap:4px}
.cx-edit__field--full{grid-column:1/-1}
.cx-edit__field label{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
.cx-edit__field input,.cx-edit__field textarea{padding:9px 12px;border-radius:10px;border:1.5px solid #e2e8f0;font-size:13px;font-family:inherit;color:#0f172a;outline:none;transition:border-color .12s;width:100%;box-sizing:border-box}
.cx-edit__field input:focus,.cx-edit__field textarea:focus{border-color:#16a34a}
.cx-edit__field textarea{resize:vertical}
.cx-edit__actions{display:flex;gap:8px;justify-content:flex-end;margin-top:4px}
.cx-hist{display:flex;flex-direction:column}
.cx-hist__row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #f8fafc}
.cx-hist__row:last-child{border-bottom:none}
.cx-hist__dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.cx-hist__main{flex:1;min-width:0}
.cx-hist__top{display:flex;align-items:center;gap:6px}
.cx-hist__field{font-size:12px;font-weight:600;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cx-hist__badge{font-size:9px;font-weight:700;padding:2px 7px;border-radius:999px;flex-shrink:0}
.cx-hist__when{font-size:11px;color:#94a3b8;display:block;margin-top:2px}
.cx-hist__price{font-size:13px;font-weight:700;color:#0f172a;flex-shrink:0;font-variant-numeric:tabular-nums}
.cx-plist{display:flex;flex-direction:column;gap:8px;margin-bottom:14px}
.cx-pitem{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f8fafc;border-radius:10px;border:1px solid #f1f5f9}
.cx-pitem__name{font-size:13px;font-weight:600;color:#0f172a}
.cx-pitem__note{display:block;font-size:11px;color:#94a3b8;margin-top:1px}
.cx-pitem__right{display:flex;align-items:center;gap:8px}
.cx-pitem__price{font-size:15px;font-weight:800;color:#16a34a}
.cx-pitem__del{background:none;border:none;cursor:pointer;color:#94a3b8;font-size:16px;line-height:1}
.cx-pitem__del:hover{color:#ef4444}
.cx-padd{background:#f8fafc;border-radius:12px;padding:14px;border:1px solid #f1f5f9}
.cx-padd__title{font-size:12px;font-weight:700;color:#374151;margin:0 0 8px}
.cx-padd__form{display:flex;gap:6px;flex-wrap:wrap}
.cx-padd__form select,.cx-padd__form input{padding:7px 10px;border-radius:8px;border:1.5px solid #e2e8f0;font-size:12px;font-family:inherit;outline:none;flex:1;min-width:100px}
.cx-padd__form select:focus,.cx-padd__form input:focus{border-color:#16a34a}
.cx-btn{padding:9px 16px;border-radius:10px;border:none;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;transition:all .14s;display:inline-flex;align-items:center;gap:6px}
.cx-btn--primary{background:#0f172a;color:#fff}.cx-btn--primary:hover:not(:disabled){background:#1e293b}.cx-btn--primary:disabled{opacity:.5;cursor:not-allowed}
.cx-btn--ghost{background:transparent;color:#64748b;border:1.5px solid #e2e8f0}.cx-btn--ghost:hover{background:#f8fafc}
.cx-btn--outline{background:#fff;color:#374151;border:1.5px solid #e2e8f0}.cx-btn--outline:hover{background:#f8fafc;border-color:#cbd5e1}
.cx-btn--sm{padding:6px 12px;font-size:11px}
.cx-empty{text-align:center;padding:60px 20px}.cx-empty__ico{font-size:40px;display:block;margin-bottom:10px}.cx-empty__title{font-size:15px;font-weight:700;margin:0 0 4px}.cx-empty__sub{font-size:12px;color:#94a3b8;margin:0}
.cx-sk-rows{padding:12px;display:flex;flex-direction:column;gap:8px}
.cx-sk-row{height:52px;border-radius:10px;background:linear-gradient(90deg,#f1f5f9 25%,#e8ecf2 50%,#f1f5f9 75%);background-size:200% 100%;animation:cxShim 1.6s infinite}
.cx-toast{position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:12px;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;box-shadow:0 8px 32px rgba(0,0,0,.18);animation:cxUp .2s ease}
.cx-toast--ok{background:#0f172a;color:#fff}.cx-toast--err{background:#ef4444;color:#fff}
@keyframes cxUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes cxFade{from{opacity:0}to{opacity:1}}
@keyframes cxShim{to{background-position:-200% 0}}
@media(max-width:1100px){.cx-kpis{grid-template-columns:repeat(2,1fr)}}
@media(max-width:900px){.cx-panel{width:100vw}.cx-sort-chips{display:none}}
@media(max-width:640px){.cx-page{padding:16px 12px 80px}.cx-kpis{grid-template-columns:repeat(2,1fr);gap:8px}.cx-kpi{padding:12px 14px}.cx-kpi__value{font-size:18px}.cx-table thead{display:none}.cx-table,.cx-table tbody,.cx-table tr,.cx-table td{display:block}.cx-table tr{padding:12px;border-bottom:1px solid #f1f5f9}.cx-table td{padding:4px 0;border:none}.cx-td--right{text-align:left}.cx-toolbar{flex-direction:column;align-items:stretch}.cx-search{max-width:100%}.cx-result-count{display:none}.cx-padd__form{flex-direction:column}}
`
