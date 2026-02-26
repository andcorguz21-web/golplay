import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'
import * as XLSX from 'xlsx'

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStatus = 'active' | 'pending' | 'cancelled' | 'confirmed'
type TabId   = 'all' | 'upcoming' | 'today' | 'past' | 'cancelled'
type SortKey = 'date' | 'field' | 'client' | 'price'
type SortDir = 'asc' | 'desc'

interface Field {
  id: number
  name: string
  sport?: string
}

interface Booking {
  id: number
  date: string
  hour: string
  status: BookingStatus
  price?: number
  source?: string
  field_id?: number
  fieldName: string
  sport?: string
  customer_name?: string
  customer_last_name?: string
  customer_phone?: string
  customer_email?: string
  name?: string
  email?: string
  phone?: string
  hasConflict?: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const todayStr = () => new Date().toISOString().split('T')[0]

const fCRC = (v?: number) =>
  v != null ? `\u20a1${Math.round(v).toLocaleString('es-CR')}` : '\u2014'

const SPORT_ICON: Record<string, string> = {
  futbol:'⚽', futbol5:'⚽', futbol7:'⚽', futbol11:'⚽',
  padel:'🎾', tenis:'🥎', basquet:'🏀', voleibol:'🏐', otro:'🏟️',
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Activa',     cls: 'b-badge--active' },
  confirmed: { label: 'Confirmada', cls: 'b-badge--active' },
  pending:   { label: 'Pendiente',  cls: 'b-badge--pending' },
  cancelled: { label: 'Cancelada',  cls: 'b-badge--cancelled' },
}

function clientName(b: Booking) {
  const first = b.customer_name || b.name || ''
  const last  = b.customer_last_name || ''
  return `${first} ${last}`.trim() || null
}

function clientInitial(b: Booking) {
  return (clientName(b) ?? 'R')[0].toUpperCase()
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function detectConflicts(bookings: Booking[]): Booking[] {
  const map: Record<string, number> = {}
  bookings.forEach(b => {
    if (b.status === 'cancelled') return
    const key = `${b.field_id}|${b.date}|${b.hour}`
    map[key] = (map[key] ?? 0) + 1
  })
  return bookings.map(b => ({
    ...b,
    hasConflict: (map[`${b.field_id}|${b.date}|${b.hour}`] ?? 0) > 1,
  }))
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminBookings() {
  const router = useRouter()

  const [userId,   setUserId]   = useState<string | null>(null)
  const [ready,    setReady]    = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [fields,   setFields]   = useState<Field[]>([])

  const [tab,          setTab]          = useState<TabId>('all')
  const [search,       setSearch]       = useState('')
  const [filterField,  setFilterField]  = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [fromDate,     setFromDate]     = useState('')
  const [toDate,       setToDate]       = useState('')
  const [sortKey,      setSortKey]      = useState<SortKey>('date')
  const [sortDir,      setSortDir]      = useState<SortDir>('desc')

  const [detail,  setDetail]  = useState<Booking | null>(null)
  const [confirm, setConfirm] = useState<{ booking: Booking; action: 'cancel' | 'activate' } | null>(null)
  const [toast,   setToast]   = useState<{ msg: string; ok: boolean } | null>(null)
  const [acting,  setActing]  = useState<number | null>(null)

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Auth ────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login')
      else { setUserId(data.session.user.id); setReady(true) }
    })
  }, [router])

  // ── Load fields first (scoped to owner) ──────────────────────────────────
  useEffect(() => {
    if (!userId) return
    supabase
      .from('fields')
      .select('id, name, sport')
      .eq('owner_id', userId)
      .order('name')
      .then(({ data }) => { if (data) setFields(data) })
  }, [userId])

  // ── Load bookings — two queries, zero joins ───────────────────────────────
  const load = useCallback(async () => {
    if (!ready || !userId || fields.length === 0) return
    setLoading(true)
    setError(null)

    const fieldIds = fields.map(f => f.id)
    const fieldsMap = new Map<number, Field>(fields.map(f => [f.id, f]))

    let q = supabase
      .from('bookings')
      .select('id, date, hour, status, price, source, field_id, name, email, phone, customer_name, customer_last_name, customer_phone, customer_email')
      .in('field_id', fieldIds)
      .order('date', { ascending: false })
      .order('hour', { ascending: true })

    if (fromDate) q = q.gte('date', fromDate)
    if (toDate)   q = q.lte('date', toDate)

    const { data, error: bErr } = await q

    if (bErr) {
      setError(`Error al cargar reservas: ${bErr.message}`)
      setLoading(false)
      return
    }

    const raw: Booking[] = (data || []).map((b: any) => {
      const field = fieldsMap.get(b.field_id)
      return {
        id:                 b.id,
        date:               b.date,
        hour:               b.hour ?? '',
        status:             (b.status ?? 'confirmed') as BookingStatus,
        price:              b.price ? Number(b.price) : undefined,
        source:             b.source,
        field_id:           b.field_id,
        fieldName:          field?.name ?? '—',
        sport:              field?.sport,
        customer_name:      b.customer_name,
        customer_last_name: b.customer_last_name,
        customer_phone:     b.customer_phone,
        customer_email:     b.customer_email,
        name:               b.name,
        email:              b.email,
        phone:              b.phone,
      }
    })

    setBookings(detectConflicts(raw))
    setLoading(false)
  }, [ready, userId, fields, fromDate, toDate])

  useEffect(() => { load() }, [load])

  // ── Actions ──────────────────────────────────────────────────────────────
  const doAction = async (booking: Booking, action: 'cancel' | 'activate') => {
    setActing(booking.id)
    const newStatus = action === 'cancel' ? 'cancelled' : 'confirmed'
    const { error } = await supabase
      .from('bookings').update({ status: newStatus }).eq('id', booking.id)

    if (error) {
      showToast('Error al actualizar la reserva', false)
    } else {
      showToast(action === 'cancel' ? 'Reserva cancelada' : 'Reserva reactivada')
      setBookings(prev =>
        detectConflicts(prev.map(b =>
          b.id === booking.id ? { ...b, status: newStatus as BookingStatus } : b
        ))
      )
    }
    setActing(null)
    setConfirm(null)
    setDetail(null)
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const exportXLSX = useCallback(() => {
    const rows = filtered.map(b => ({
      Cancha:   b.fieldName,
      Fecha:    b.date,
      Hora:     b.hour,
      Estado:   STATUS_CFG[b.status]?.label ?? b.status,
      Cliente:  clientName(b) ?? '—',
      Teléfono: b.customer_phone || b.phone || '—',
      Email:    b.customer_email || b.email || '—',
      Precio:   b.price ?? '',
      Fuente:   b.source ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reservas')
    XLSX.writeFile(wb, `reservas_${todayStr()}.xlsx`)
    showToast('Exportado ✓')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings])

  // ── Derived ────────────────────────────────────────────────────────────────
  const today = todayStr()

  const counts = useMemo(() => ({
    all:       bookings.length,
    upcoming:  bookings.filter(b => b.date > today && b.status !== 'cancelled').length,
    today:     bookings.filter(b => b.date === today && b.status !== 'cancelled').length,
    past:      bookings.filter(b => b.date < today && b.status !== 'cancelled').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }), [bookings, today])

  const conflicts = useMemo(() => bookings.filter(b => b.hasConflict).length, [bookings])

  const filtered = useMemo(() => {
    let r = [...bookings]
    if (tab === 'upcoming')  r = r.filter(b => b.date > today && b.status !== 'cancelled')
    if (tab === 'today')     r = r.filter(b => b.date === today && b.status !== 'cancelled')
    if (tab === 'past')      r = r.filter(b => b.date < today && b.status !== 'cancelled')
    if (tab === 'cancelled') r = r.filter(b => b.status === 'cancelled')
    if (filterField !== 'all')  r = r.filter(b => String(b.field_id) === filterField)
    if (filterStatus !== 'all') r = r.filter(b => b.status === filterStatus)
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(b =>
        (clientName(b) ?? '').toLowerCase().includes(q) ||
        b.fieldName.toLowerCase().includes(q) ||
        (b.customer_email || b.email || '').toLowerCase().includes(q) ||
        (b.customer_phone || b.phone || '').includes(q)
      )
    }
    r.sort((a, b) => {
      if (sortKey === 'price')
        return sortDir === 'asc' ? (a.price ?? 0) - (b.price ?? 0) : (b.price ?? 0) - (a.price ?? 0)
      const av = sortKey === 'date' ? a.date + a.hour : sortKey === 'field' ? a.fieldName : clientName(a) ?? ''
      const bv = sortKey === 'date' ? b.date + b.hour : sortKey === 'field' ? b.fieldName : clientName(b) ?? ''
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return r
  }, [bookings, tab, filterField, filterStatus, search, sortKey, sortDir, today])

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  const clearFilters = () => {
    setSearch(''); setFilterField('all'); setFilterStatus('all')
    setFromDate(''); setToDate('')
  }

  const hasFilters = !!(search || filterField !== 'all' || filterStatus !== 'all' || fromDate || toDate)

  if (!ready) return null

  return (
    <AdminLayout>
      <style>{CSS}</style>

      {toast && (
        <div className={`bk-toast ${toast.ok ? 'bk-toast--ok' : 'bk-toast--err'}`}>
          {toast.ok ? '✓' : '✗'} {toast.msg}
        </div>
      )}

      <div className="bk">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="bk-hd">
          <div>
            <h1 className="bk-title">Reservas</h1>
            <p className="bk-sub">
              {loading ? 'Cargando…' : `${bookings.length} en el período seleccionado`}
            </p>
          </div>
          <div className="bk-hd__right">
            {conflicts > 0 && (
              <div className="bk-conflict-alert" onClick={() => setTab('today')}>
                <span>⚠</span>
                <span>{conflicts} conflicto{conflicts > 1 ? 's' : ''} detectado{conflicts > 1 ? 's' : ''}</span>
              </div>
            )}
            <button className="bk-btn bk-btn--ghost" onClick={load}><IcoRefresh/> Actualizar</button>
            <button className="bk-btn bk-btn--export" onClick={exportXLSX}><IcoExport/> Exportar</button>
          </div>
        </div>

        {/* ── Tabs ────────────────────────────────────────────────────── */}
        <div className="bk-tabs">
          {([
            { id: 'all',       label: 'Todas',      icon: '⊞' },
            { id: 'today',     label: 'Hoy',        icon: '🟢' },
            { id: 'upcoming',  label: 'Próximas',   icon: '📅' },
            { id: 'past',      label: 'Pasadas',    icon: '⏱' },
            { id: 'cancelled', label: 'Canceladas', icon: '✕' },
          ] as { id: TabId; label: string; icon: string }[]).map(t => (
            <button
              key={t.id}
              className={`bk-tab ${tab === t.id ? 'bk-tab--active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span>{t.icon}</span>
              {t.label}
              <span className="bk-tab__count">{counts[t.id]}</span>
            </button>
          ))}
        </div>

        {/* ── Filters ─────────────────────────────────────────────────── */}
        <div className="bk-filters">
          <div className="bk-search">
            <IcoSearch/>
            <input
              className="bk-search__input"
              placeholder="Buscar cliente, cancha, email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="bk-search__clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          <select className="bk-select" value={filterField} onChange={e => setFilterField(e.target.value)}>
            <option value="all">Todas las canchas</option>
            {fields.map(f => (
              <option key={f.id} value={String(f.id)}>
                {SPORT_ICON[f.sport ?? ''] ?? '🏟️'} {f.name}
              </option>
            ))}
          </select>

          <select className="bk-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="active">Activa</option>
            <option value="pending">Pendiente</option>
            <option value="cancelled">Cancelada</option>
          </select>

          <div className="bk-daterange">
            <input
              type="date" className="bk-dateinput"
              value={fromDate} onChange={e => setFromDate(e.target.value)}
              aria-label="Desde"
            />
            <span className="bk-daterange__sep">—</span>
            <input
              type="date" className="bk-dateinput"
              value={toDate} onChange={e => setToDate(e.target.value)}
              aria-label="Hasta"
            />
          </div>

          {hasFilters && (
            <button className="bk-btn bk-btn--ghost bk-btn--sm" onClick={clearFilters}>
              Limpiar
            </button>
          )}
        </div>

        {/* ── Error ───────────────────────────────────────────────────── */}
        {error && (
          <div className="bk-error">
            <span>⚠️</span>
            <span>{error}</span>
            <button className="bk-btn bk-btn--ghost bk-btn--sm" onClick={load}>Reintentar</button>
          </div>
        )}

        {/* ── Content ─────────────────────────────────────────────────── */}
        {loading ? (
          <SkeletonRows/>
        ) : filtered.length === 0 ? (
          <EmptyState hasFilters={hasFilters} onClear={clearFilters}/>
        ) : (
          <>
            {/* Desktop table */}
            <div className="bk-table-wrap">
              <table className="bk-table">
                <thead>
                  <tr>
                    <SortTh label="Cancha"  k="field"  cur={sortKey} dir={sortDir} onSort={toggleSort}/>
                    <SortTh label="Fecha"   k="date"   cur={sortKey} dir={sortDir} onSort={toggleSort}/>
                    <th className="bk-th">Hora</th>
                    <SortTh label="Cliente" k="client" cur={sortKey} dir={sortDir} onSort={toggleSort}/>
                    <th className="bk-th">Estado</th>
                    <SortTh label="Precio"  k="price"  cur={sortKey} dir={sortDir} onSort={toggleSort}/>
                    <th className="bk-th">Fuente</th>
                    <th className="bk-th bk-th--right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(b => (
                    <BookingRow
                      key={b.id} booking={b} today={today} acting={acting}
                      onDetail={() => setDetail(b)}
                      onAction={action => setConfirm({ booking: b, action })}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="bk-cards">
              {filtered.map(b => (
                <BookingCard
                  key={b.id} booking={b} today={today} acting={acting}
                  onDetail={() => setDetail(b)}
                  onAction={action => setConfirm({ booking: b, action })}
                />
              ))}
            </div>

            <div className="bk-footer">
              Mostrando <strong>{filtered.length}</strong> de <strong>{bookings.length}</strong> reservas
            </div>
          </>
        )}
      </div>

      {/* ── Detail Modal ──────────────────────────────────────────────── */}
      {detail && (
        <Modal onClose={() => setDetail(null)}>
          <div className="bk-modal__header">
            <div className="bk-modal__av">{clientInitial(detail)}</div>
            <div style={{ flex: 1 }}>
              <h3 className="bk-modal__name">{clientName(detail) ?? `Reserva #${detail.id}`}</h3>
              <p className="bk-modal__sub">{detail.customer_email || detail.email || '—'}</p>
            </div>
            <span className={`b-badge ${STATUS_CFG[detail.status]?.cls ?? ''}`}>
              {STATUS_CFG[detail.status]?.label ?? detail.status}
            </span>
          </div>

          {detail.hasConflict && (
            <div className="bk-modal__conflict">
              ⚠️ Esta reserva tiene un conflicto de horario con otra reserva en la misma cancha y franja horaria
            </div>
          )}

          <div className="bk-modal__grid">
            <DetailRow icon="🏟️" label="Cancha"   value={`${SPORT_ICON[detail.sport ?? ''] ?? ''} ${detail.fieldName}`.trim()}/>
            <DetailRow icon="📅" label="Fecha"    value={fmtDate(detail.date)}/>
            <DetailRow icon="🕐" label="Hora"     value={detail.hour}/>
            <DetailRow icon="💰" label="Precio"   value={fCRC(detail.price)}/>
            <DetailRow icon="📱" label="Teléfono" value={detail.customer_phone || detail.phone || '—'}/>
            <DetailRow icon="📧" label="Email"    value={detail.customer_email || detail.email || '—'}/>
            <DetailRow icon="🔌" label="Fuente"   value={detail.source ?? '—'}/>
            <DetailRow icon="🔢" label="ID"       value={`#${detail.id}`}/>
          </div>

          <div className="bk-modal__actions">
            {detail.status !== 'cancelled' ? (
              <button
                className="bk-btn bk-btn--danger"
                onClick={() => { setDetail(null); setConfirm({ booking: detail, action: 'cancel' }) }}
              >
                <IcoX/> Cancelar reserva
              </button>
            ) : (
              <button
                className="bk-btn bk-btn--primary"
                onClick={() => { setDetail(null); setConfirm({ booking: detail, action: 'activate' }) }}
              >
                <IcoCheck/> Reactivar
              </button>
            )}
            <button className="bk-btn bk-btn--ghost" onClick={() => setDetail(null)}>Cerrar</button>
          </div>
        </Modal>
      )}

      {/* ── Confirm Modal ─────────────────────────────────────────────── */}
      {confirm && (
        <Modal onClose={() => setConfirm(null)} small>
          <div className="bk-confirm">
            <div className={`bk-confirm__ico bk-confirm__ico--${confirm.action === 'cancel' ? 'danger' : 'ok'}`}>
              {confirm.action === 'cancel' ? '⚠️' : '✓'}
            </div>
            <h3 className="bk-confirm__title">
              {confirm.action === 'cancel' ? '¿Cancelar esta reserva?' : '¿Reactivar esta reserva?'}
            </h3>
            <p className="bk-confirm__body">
              {confirm.action === 'cancel'
                ? `Se cancelará la reserva de ${clientName(confirm.booking) ?? `#${confirm.booking.id}`} para ${confirm.booking.fieldName} el ${fmtDate(confirm.booking.date)} a las ${confirm.booking.hour}.`
                : `Se reactivará la reserva #${confirm.booking.id} para ${confirm.booking.fieldName}.`
              }
            </p>
            <div className="bk-confirm__btns">
              <button
                className={`bk-btn bk-btn--${confirm.action === 'cancel' ? 'danger' : 'primary'}`}
                disabled={acting === confirm.booking.id}
                onClick={() => doAction(confirm.booking, confirm.action)}
              >
                {acting === confirm.booking.id
                  ? 'Procesando…'
                  : confirm.action === 'cancel' ? 'Sí, cancelar' : 'Sí, reactivar'
                }
              </button>
              <button className="bk-btn bk-btn--ghost" onClick={() => setConfirm(null)}>Volver</button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BookingRow({ booking: b, today, acting, onDetail, onAction }: {
  booking: Booking; today: string; acting: number | null
  onDetail: () => void; onAction: (a: 'cancel' | 'activate') => void
}) {
  const isToday  = b.date === today
  const isFuture = b.date > today
  const cfg = STATUS_CFG[b.status] ?? { label: b.status, cls: '' }
  return (
    <tr className={`bk-tr${b.hasConflict ? ' bk-tr--conflict' : ''}${b.status === 'cancelled' ? ' bk-tr--cancelled' : ''}`}>
      <td className="bk-td">
        <div className="bk-td__field">
          <span style={{ fontSize: 18 }}>{SPORT_ICON[b.sport ?? ''] ?? '🏟️'}</span>
          <span className="bk-td__fname">{b.fieldName}</span>
          {b.hasConflict && <span className="bk-cdot" title="Conflicto de horario">⚠</span>}
        </div>
      </td>
      <td className="bk-td">
        <span className={`bk-date bk-date--${isToday ? 'today' : isFuture ? 'future' : 'past'}`}>
          {isToday ? '🟢 Hoy' : fmtDate(b.date)}
        </span>
      </td>
      <td className="bk-td bk-mono">{b.hour}</td>
      <td className="bk-td">
        <div className="bk-td__client">
          <div className="bk-av">{clientInitial(b)}</div>
          <div>
            <p className="bk-td__cname">{clientName(b) ?? `Reserva #${b.id}`}</p>
            <p className="bk-td__cemail">{b.customer_email || b.email || ''}</p>
          </div>
        </div>
      </td>
      <td className="bk-td"><span className={`b-badge ${cfg.cls}`}>{cfg.label}</span></td>
      <td className="bk-td bk-td--price">{fCRC(b.price)}</td>
      <td className="bk-td"><span className="bk-source">{b.source ?? 'online'}</span></td>
      <td className="bk-td bk-td--right">
        <button className="bk-act bk-act--view" onClick={onDetail} title="Ver detalle"><IcoEye/></button>
        {b.status !== 'cancelled'
          ? <button className="bk-act bk-act--cancel" onClick={() => onAction('cancel')} disabled={acting === b.id} title="Cancelar"><IcoX/></button>
          : <button className="bk-act bk-act--activate" onClick={() => onAction('activate')} disabled={acting === b.id} title="Reactivar"><IcoCheck/></button>
        }
      </td>
    </tr>
  )
}

function BookingCard({ booking: b, today, acting, onDetail, onAction }: {
  booking: Booking; today: string; acting: number | null
  onDetail: () => void; onAction: (a: 'cancel' | 'activate') => void
}) {
  const isToday  = b.date === today
  const isFuture = b.date > today
  const cfg = STATUS_CFG[b.status] ?? { label: b.status, cls: '' }
  return (
    <div className={`bk-card${b.hasConflict ? ' bk-card--conflict' : ''}${b.status === 'cancelled' ? ' bk-card--cancelled' : ''}`}>
      <div className="bk-card__top">
        <div className="bk-card__field">
          <span>{SPORT_ICON[b.sport ?? ''] ?? '🏟️'}</span>
          <strong>{b.fieldName}</strong>
          {b.hasConflict && <span className="bk-cdot">⚠</span>}
        </div>
        <span className={`b-badge ${cfg.cls}`}>{cfg.label}</span>
      </div>
      <div className="bk-card__row">
        <span className={`bk-date bk-date--${isToday ? 'today' : isFuture ? 'future' : 'past'}`}>
          {isToday ? '🟢 Hoy' : fmtDate(b.date)}
        </span>
        <span className="bk-mono" style={{ fontSize: 13, fontWeight: 600 }}>{b.hour}</span>
      </div>
      <div className="bk-card__client">
        <div className="bk-av bk-av--sm">{clientInitial(b)}</div>
        <span style={{ fontSize: 13 }}>{clientName(b) ?? `Reserva #${b.id}`}</span>
      </div>
      <div className="bk-card__foot">
        <span className="bk-card__price">{fCRC(b.price)}</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="bk-act bk-act--view" onClick={onDetail}><IcoEye/></button>
          {b.status !== 'cancelled'
            ? <button className="bk-act bk-act--cancel" onClick={() => onAction('cancel')} disabled={acting === b.id}><IcoX/></button>
            : <button className="bk-act bk-act--activate" onClick={() => onAction('activate')} disabled={acting === b.id}><IcoCheck/></button>
          }
        </div>
      </div>
    </div>
  )
}

function SortTh({ label, k, cur, dir, onSort }: {
  label: string; k: SortKey; cur: SortKey; dir: SortDir; onSort: (k: SortKey) => void
}) {
  const active = cur === k
  return (
    <th
      className={`bk-th bk-th--sort${active ? ' bk-th--active' : ''}`}
      onClick={() => onSort(k)}
    >
      {label}
      <span className="bk-sort">{active ? (dir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
    </th>
  )
}

function Modal({ children, onClose, small }: {
  children: React.ReactNode; onClose: () => void; small?: boolean
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="bk-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`bk-modal${small ? ' bk-modal--sm' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bk-drow">
      <span className="bk-drow__ico">{icon}</span>
      <span className="bk-drow__label">{label}</span>
      <span className="bk-drow__value">{value}</span>
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="bk-skeleton">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="bk-sk-row" style={{ animationDelay: `${i * 70}ms` }}>
          <div className="bk-sk" style={{ width: 130 }}/>
          <div className="bk-sk" style={{ width: 90 }}/>
          <div className="bk-sk" style={{ width: 50 }}/>
          <div className="bk-sk" style={{ width: 150, flex: 1 }}/>
          <div className="bk-sk" style={{ width: 72, borderRadius: '999px' }}/>
          <div className="bk-sk" style={{ width: 65 }}/>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <div className="bk-empty">
      <div className="bk-empty__ico">{hasFilters ? '🔍' : '📭'}</div>
      <h3 className="bk-empty__title">
        {hasFilters ? 'Sin resultados para estos filtros' : 'No hay reservas aún'}
      </h3>
      <p className="bk-empty__sub">
        {hasFilters
          ? 'Intentá con otros criterios o limpiá los filtros.'
          : 'Las reservas de tus canchas aparecerán aquí.'}
      </p>
      {hasFilters && (
        <button className="bk-btn bk-btn--primary bk-btn--sm" onClick={onClear}>
          Limpiar filtros
        </button>
      )}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const IcoSearch  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
const IcoExport  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
const IcoRefresh = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
const IcoEye     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IcoX       = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IcoCheck   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Syne:wght@700;800&display=swap');

.bk { font-family:'DM Sans',sans-serif; background:#f0f2f5; min-height:100vh; padding:24px 28px 60px; color:#0f172a; }

.bk-hd { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:20px; }
.bk-hd__right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.bk-title { font-family:'Syne',sans-serif; font-size:28px; font-weight:800; letter-spacing:-0.5px; margin:0; }
.bk-sub   { font-size:13px; color:#94a3b8; margin:4px 0 0; }
.bk-conflict-alert { display:flex; align-items:center; gap:6px; padding:7px 14px; border-radius:9px; background:#fff7ed; border:1.5px solid #fed7aa; color:#c2410c; font-size:12px; font-weight:700; cursor:pointer; animation:bkPulse 2.5s infinite; }
@keyframes bkPulse { 0%,100%{opacity:1} 50%{opacity:.7} }

.bk-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:9px; font-size:12px; font-weight:600; font-family:inherit; cursor:pointer; border:none; transition:all .13s; white-space:nowrap; }
.bk-btn--ghost   { background:white; color:#374151; border:1.5px solid #e2e8f0; }
.bk-btn--ghost:hover { background:#f8fafc; }
.bk-btn--export  { background:#0f172a; color:white; }
.bk-btn--export:hover { background:#1e293b; }
.bk-btn--primary { background:#16a34a; color:white; }
.bk-btn--primary:hover { background:#15803d; }
.bk-btn--danger  { background:#ef4444; color:white; }
.bk-btn--danger:hover  { background:#dc2626; }
.bk-btn--sm { padding:6px 12px; font-size:11px; border-radius:7px; }
.bk-btn:disabled { opacity:.45; cursor:not-allowed; }

.bk-tabs { display:flex; gap:4px; flex-wrap:wrap; margin-bottom:16px; }
.bk-tab { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:9px; font-size:12px; font-weight:600; font-family:inherit; border:1.5px solid transparent; background:white; color:#64748b; cursor:pointer; transition:all .13s; }
.bk-tab:hover { background:#f8fafc; color:#0f172a; border-color:#e2e8f0; }
.bk-tab--active { background:#0f172a; color:white; border-color:#0f172a; }
.bk-tab__count { font-size:10px; font-weight:700; padding:1px 6px; border-radius:999px; background:rgba(0,0,0,.07); }
.bk-tab--active .bk-tab__count { background:rgba(255,255,255,.18); }

.bk-filters { display:flex; align-items:center; gap:8px; flex-wrap:wrap; background:white; padding:12px 16px; border-radius:14px; border:1px solid #eaecf0; margin-bottom:16px; }
.bk-search { display:flex; align-items:center; gap:8px; background:#f8fafc; border:1.5px solid #e2e8f0; border-radius:9px; padding:0 12px; flex:1; min-width:180px; transition:border-color .12s; }
.bk-search:focus-within { border-color:#22c55e; background:white; }
.bk-search svg { color:#94a3b8; flex-shrink:0; }
.bk-search__input { border:none; background:transparent; font-size:13px; font-family:inherit; color:#0f172a; flex:1; outline:none; padding:8px 0; }
.bk-search__input::placeholder { color:#94a3b8; }
.bk-search__clear { background:none; border:none; cursor:pointer; color:#94a3b8; font-size:12px; padding:0; }
.bk-select { padding:8px 10px; border-radius:9px; border:1.5px solid #e2e8f0; background:white; font-size:12px; font-weight:500; font-family:inherit; color:#374151; cursor:pointer; outline:none; }
.bk-select:focus { border-color:#22c55e; }
.bk-daterange { display:flex; align-items:center; gap:6px; }
.bk-daterange__sep { font-size:11px; color:#cbd5e1; }
.bk-dateinput { padding:7px 10px; border-radius:8px; border:1.5px solid #e2e8f0; font-size:12px; font-family:inherit; color:#374151; outline:none; }
.bk-dateinput:focus { border-color:#22c55e; }

.bk-error { display:flex; align-items:center; gap:10px; padding:14px 20px; border-radius:12px; background:#fef2f2; border:1px solid #fecaca; color:#991b1b; font-size:13px; margin-bottom:16px; }

.bk-table-wrap { background:white; border-radius:16px; border:1px solid #eaecf0; box-shadow:0 1px 3px rgba(0,0,0,.04); overflow-x:auto; }
.bk-table { width:100%; border-collapse:collapse; }
.bk-th { padding:12px 16px; text-align:left; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#94a3b8; background:#f8fafc; border-bottom:1px solid #eaecf0; white-space:nowrap; }
.bk-th--sort { cursor:pointer; user-select:none; }
.bk-th--sort:hover { color:#374151; background:#f1f5f9; }
.bk-th--active { color:#0f172a; }
.bk-th--right { text-align:right; }
.bk-sort { opacity:.45; font-size:10px; }
.bk-th--active .bk-sort { opacity:1; }
.bk-tr { border-bottom:1px solid #f8fafc; transition:background .1s; }
.bk-tr:last-child { border-bottom:none; }
.bk-tr:hover { background:#fafcff; }
.bk-tr--conflict { background:#fffbeb !important; border-left:3px solid #f59e0b; }
.bk-tr--cancelled { opacity:.55; }
.bk-td { padding:13px 16px; font-size:13px; vertical-align:middle; }
.bk-td--price { font-weight:700; color:#15803d; }
.bk-td--right { text-align:right; }
.bk-mono { font-variant-numeric:tabular-nums; font-weight:600; }
.bk-td__field { display:flex; align-items:center; gap:8px; }
.bk-td__fname { font-weight:600; color:#0f172a; }
.bk-cdot { color:#f59e0b; font-size:12px; cursor:help; }
.bk-td__client { display:flex; align-items:center; gap:10px; }
.bk-av { width:32px; height:32px; border-radius:50%; flex-shrink:0; background:linear-gradient(135deg,#16a34a,#166534); color:white; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
.bk-av--sm { width:26px; height:26px; font-size:11px; }
.bk-td__cname  { font-size:13px; font-weight:600; color:#0f172a; margin:0; }
.bk-td__cemail { font-size:11px; color:#94a3b8; margin:1px 0 0; }
.bk-date { font-size:12px; font-weight:600; padding:3px 9px; border-radius:999px; white-space:nowrap; }
.bk-date--today  { background:#dcfce7; color:#15803d; }
.bk-date--future { background:#eff6ff; color:#2563eb; }
.bk-date--past   { background:#f1f5f9; color:#64748b; }
.bk-source { font-size:11px; color:#94a3b8; }
.b-badge { font-size:10px; font-weight:700; padding:3px 9px; border-radius:999px; white-space:nowrap; }
.b-badge--active    { background:#dcfce7; color:#15803d; }
.b-badge--pending   { background:#fef9c3; color:#854d0e; }
.b-badge--cancelled { background:#f1f5f9; color:#64748b; }

.bk-act { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:8px; border:1.5px solid #e2e8f0; background:white; cursor:pointer; transition:all .12s; color:#64748b; margin-left:4px; }
.bk-act:hover { transform:scale(1.08); }
.bk-act--view:hover     { border-color:#2563eb; color:#2563eb; background:#eff6ff; }
.bk-act--cancel:hover   { border-color:#ef4444; color:#ef4444; background:#fef2f2; }
.bk-act--activate:hover { border-color:#16a34a; color:#16a34a; background:#f0fdf4; }
.bk-act:disabled { opacity:.35; cursor:not-allowed; transform:none; }

.bk-footer { padding:12px; font-size:12px; color:#94a3b8; text-align:center; margin-top:4px; }
.bk-footer strong { color:#374151; }

.bk-skeleton { background:white; border-radius:16px; border:1px solid #eaecf0; overflow:hidden; padding:8px 0; }
.bk-sk-row { display:flex; align-items:center; gap:16px; padding:14px 20px; border-bottom:1px solid #f8fafc; animation:bkFadeIn .3s ease both; }
.bk-sk-row:last-child { border-bottom:none; }
@keyframes bkFadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
.bk-sk { border-radius:6px; flex-shrink:0; height:14px; background:linear-gradient(90deg,#f1f5f9 25%,#e8ecf2 50%,#f1f5f9 75%); background-size:200% 100%; animation:bkShimmer 1.5s infinite; }
@keyframes bkShimmer { to{background-position:-200% 0} }

.bk-empty { text-align:center; padding:64px 24px; background:white; border-radius:16px; border:1px solid #eaecf0; }
.bk-empty__ico   { font-size:48px; margin-bottom:16px; display:block; }
.bk-empty__title { font-family:'Syne',sans-serif; font-size:18px; font-weight:700; margin:0 0 8px; }
.bk-empty__sub   { font-size:14px; color:#94a3b8; margin:0 0 20px; }

.bk-cards { display:none; flex-direction:column; gap:10px; }
.bk-card { background:white; border-radius:14px; border:1px solid #eaecf0; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,.04); }
.bk-card--conflict { border-color:#f59e0b; background:#fffbeb; }
.bk-card--cancelled { opacity:.6; }
.bk-card__top    { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.bk-card__field  { display:flex; align-items:center; gap:7px; font-size:14px; font-weight:700; }
.bk-card__row    { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.bk-card__client { display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:12px; }
.bk-card__foot   { display:flex; align-items:center; justify-content:space-between; border-top:1px solid #f1f5f9; padding-top:10px; }
.bk-card__price  { font-size:14px; font-weight:700; color:#15803d; }

.bk-overlay { position:fixed; inset:0; background:rgba(15,23,42,.5); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:500; padding:20px; animation:bkOvIn .18s ease; }
@keyframes bkOvIn { from{opacity:0} to{opacity:1} }
.bk-modal { background:white; border-radius:20px; width:100%; max-width:520px; box-shadow:0 24px 80px rgba(0,0,0,.2); animation:bkMdIn .2s ease; overflow:hidden; }
.bk-modal--sm { max-width:380px; }
@keyframes bkMdIn { from{opacity:0;transform:scale(.96) translateY(8px)} to{opacity:1;transform:none} }
.bk-modal__header { display:flex; align-items:center; gap:14px; padding:24px 24px 0; }
.bk-modal__av { width:46px; height:46px; border-radius:50%; flex-shrink:0; background:linear-gradient(135deg,#16a34a,#166534); color:white; font-size:18px; font-weight:700; display:flex; align-items:center; justify-content:center; }
.bk-modal__name { font-family:'Syne',sans-serif; font-size:17px; font-weight:700; margin:0; }
.bk-modal__sub  { font-size:12px; color:#94a3b8; margin:2px 0 0; }
.bk-modal__conflict { margin:16px 24px 0; padding:10px 14px; border-radius:10px; background:#fffbeb; border:1px solid #fde68a; font-size:12px; color:#92400e; }
.bk-modal__grid { padding:20px 24px; display:flex; flex-direction:column; gap:4px; }
.bk-drow { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:9px; }
.bk-drow:hover { background:#f8fafc; }
.bk-drow__ico   { font-size:15px; width:22px; text-align:center; flex-shrink:0; }
.bk-drow__label { font-size:12px; color:#94a3b8; font-weight:600; width:76px; flex-shrink:0; }
.bk-drow__value { font-size:13px; font-weight:500; color:#0f172a; flex:1; word-break:break-all; }
.bk-modal__actions { display:flex; gap:8px; padding:0 24px 24px; }

.bk-confirm { padding:28px 24px 24px; text-align:center; }
.bk-confirm__ico { width:52px; height:52px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; margin:0 auto 16px; }
.bk-confirm__ico--danger { background:#fef2f2; }
.bk-confirm__ico--ok     { background:#f0fdf4; }
.bk-confirm__title { font-family:'Syne',sans-serif; font-size:17px; font-weight:700; margin:0 0 8px; }
.bk-confirm__body  { font-size:13px; color:#64748b; margin:0 0 24px; line-height:1.6; }
.bk-confirm__btns  { display:flex; flex-direction:column; gap:8px; }

.bk-toast { position:fixed; bottom:28px; right:28px; z-index:9999; padding:12px 20px; border-radius:12px; font-size:13px; font-weight:600; font-family:'DM Sans',sans-serif; box-shadow:0 8px 32px rgba(0,0,0,.18); animation:bkToastIn .2s ease; }
@keyframes bkToastIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
.bk-toast--ok  { background:#0f172a; color:white; }
.bk-toast--err { background:#ef4444; color:white; }

@media (max-width:900px) {
  .bk { padding:16px 16px 60px; }
  .bk-table-wrap { display:none; }
  .bk-cards { display:flex; }
  .bk-daterange { display:none; }
  .bk-hd__right .bk-btn--ghost { display:none; }
}
@media (max-width:600px) {
  .bk-title { font-size:22px; }
  .bk-tab { padding:6px 10px; font-size:11px; }
  .bk-modal { border-radius:20px 20px 0 0; }
  .bk-overlay { align-items:flex-end; padding:0; }
}
`
