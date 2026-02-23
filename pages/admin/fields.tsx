import { useEffect, useState, useCallback, useRef, type CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/router'
import AdminLayout from '@/components/ui/admin/AdminLayout'

// ─── Types ────────────────────────────────────────────────────────────────────

type SportType = 'futbol5' | 'futbol7' | 'futbol11' | 'padel' | 'tenis' | 'basquet' | 'voleibol' | 'otro'

interface Field {
  id: number
  name: string
  sport?: SportType
  price: number
  price_day?: number
  price_night?: number
  night_from_hour?: number
  description?: string | null
  features?: string[] | null
  hours?: string[] | null
  location?: string | null
  active?: boolean
  monthly_statements?: { status: string }[] | null
}

interface FieldImage {
  id: number
  url: string
  is_main: boolean
}

interface FormErrors {
  name?: string
  price?: string
  sport?: string
  hours?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PROVINCES = ['San José','Alajuela','Cartago','Heredia','Guanacaste','Puntarenas','Limón']

const SPORTS: { value: SportType; label: string; icon: string }[] = [
  { value: 'futbol5',  label: 'Fútbol 5',   icon: '⚽' },
  { value: 'futbol7',  label: 'Fútbol 7',   icon: '⚽' },
  { value: 'futbol11', label: 'Fútbol 11',  icon: '⚽' },
  { value: 'padel',    label: 'Pádel',      icon: '🎾' },
  { value: 'tenis',    label: 'Tenis',      icon: '🥎' },
  { value: 'basquet',  label: 'Básquet',    icon: '🏀' },
  { value: 'voleibol', label: 'Voleibol',   icon: '🏐' },
  { value: 'otro',     label: 'Otro',       icon: '🏟️' },
]

const FEATURES = ['Iluminación','Parqueo','Camerinos','Baños','Techada','Vestuario','Cafetería','WiFi']

const ALL_HOURS = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00',
]

const NIGHT_HOURS = ['17','18','19','20','21']

const DEFAULT_IMG = 'https://images.unsplash.com/photo-1606925797300-0b35e9d1794e?auto=format&fit=crop&w=800&q=60'

const SPORT_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  futbol5:  { icon:'⚽', label:'Fútbol 5',  color:'#16a34a' },
  futbol7:  { icon:'⚽', label:'Fútbol 7',  color:'#16a34a' },
  futbol11: { icon:'⚽', label:'Fútbol 11', color:'#16a34a' },
  padel:    { icon:'🎾', label:'Pádel',     color:'#2563eb' },
  tenis:    { icon:'🥎', label:'Tenis',     color:'#0891b2' },
  basquet:  { icon:'🏀', label:'Básquet',   color:'#ea580c' },
  voleibol: { icon:'🏐', label:'Voleibol',  color:'#7c3aed' },
  otro:     { icon:'🏟️', label:'Otro',      color:'#64748b' },
}

const fCRC = (v: number) => `₡${Math.round(v).toLocaleString('es-CR')}`

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminFields() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  // Data
  const [fields,  setFields]  = useState<Field[]>([])
  const [loading, setLoading] = useState(true)
  const [gallery, setGallery] = useState<FieldImage[]>([])
  const [uploading, setUploading] = useState(false)

  // UI state
  const [drawerOpen,  setDrawerOpen]  = useState(false)
  const [editingId,   setEditingId]   = useState<number | null>(null)
  const [deleteModal, setDeleteModal] = useState<Field | null>(null)
  const [toast,       setToast]       = useState<{ msg: string; ok: boolean } | null>(null)
  const [search,      setSearch]      = useState('')
  const [filterSport, setFilterSport] = useState<SportType | 'all'>('all')
  const [filterStatus,setFilterStatus]= useState<'all' | 'active' | 'inactive'>('all')
  const [togglingId,  setTogglingId]  = useState<number | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [activeSection, setActiveSection] = useState<'info'|'schedule'|'gallery'>('info')

  // Form state
  const [fName,          setFName]          = useState('')
  const [fSport,         setFSport]         = useState<SportType>('futbol5')
  const [fPrice,         setFPrice]         = useState('')
  const [fPriceDay,      setFPriceDay]      = useState('')
  const [fPriceNight,    setFPriceNight]    = useState('')
  const [fNightFrom,     setFNightFrom]     = useState(18)
  const [fDescription,   setFDescription]   = useState('')
  const [fFeatures,      setFFeatures]      = useState<string[]>([])
  const [fHours,         setFHours]         = useState<string[]>([])
  const [fLocation,      setFLocation]      = useState('')
  const [fActive,        setFActive]        = useState(true)
  const [errors,         setErrors]         = useState<FormErrors>({})

  const drawerRef = useRef<HTMLDivElement>(null)
  const fileRef   = useRef<HTMLInputElement>(null)

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return }
      setUserId(data.user.id)
    })
  }, [router])

  // ── Close drawer on outside click ──────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node) && drawerOpen) {
        // don't close if clicking the delete modal
        const target = e.target as HTMLElement
        if (target.closest('.f-modal-overlay')) return
        handleDrawerClose()
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [drawerOpen])

  // ── Body scroll lock ────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  // ── Toast ───────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3200)
  }, [])

  // ── Load fields ─────────────────────────────────────────────────────────────
  const loadFields = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('fields')
      .select('*, monthly_statements(status)')
      .order('id')
    setFields(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadFields() }, [loadFields])

  const isBlocked = (f: Field) =>
    f.monthly_statements?.some(s => s.status === 'overdue') ?? false

  // ── Gallery ─────────────────────────────────────────────────────────────────
  const loadGallery = useCallback(async (fieldId: number) => {
    const { data } = await supabase
      .from('field_images').select('*').eq('field_id', fieldId).order('created_at')
    setGallery(data || [])
  }, [])

  const uploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingId || !e.target.files?.[0]) return
    const file = e.target.files[0]

    // Validate file type & size
    if (!file.type.startsWith('image/')) { showToast('Solo se permiten imágenes', false); return }
    if (file.size > 5 * 1024 * 1024)    { showToast('La imagen no puede superar 5MB', false); return }

    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `fields/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage.from('field-images').upload(path, file)
    if (upErr) { showToast('Error al subir imagen', false); setUploading(false); return }
    const { data } = supabase.storage.from('field-images').getPublicUrl(path)
    await supabase.from('field_images').insert({ field_id: editingId, url: data.publicUrl, is_main: gallery.length === 0 })
    await loadGallery(editingId)
    setUploading(false)
    showToast('Imagen subida ✓')
    if (fileRef.current) fileRef.current.value = ''
  }

  const setMainImage = async (imgId: number) => {
    if (!editingId) return
    await supabase.from('field_images').update({ is_main: false }).eq('field_id', editingId)
    await supabase.from('field_images').update({ is_main: true }).eq('id', imgId)
    await loadGallery(editingId)
  }

  const deleteImage = async (img: FieldImage) => {
    await supabase.from('field_images').delete().eq('id', img.id)
    if (editingId) await loadGallery(editingId)
    showToast('Imagen eliminada')
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: FormErrors = {}
    if (!fName.trim())           errs.name  = 'El nombre es obligatorio'
    if (!fSport)                 errs.sport = 'Seleccioná un deporte'
    const p = Number(fPrice)
    if (!fPrice || isNaN(p) || p <= 0) errs.price = 'Ingresá un precio válido mayor a 0'
    if (fHours.length === 0)     errs.hours = 'Seleccioná al menos un horario'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  const saveField = async () => {
    if (!validate() || !userId) return
    setSaving(true)

    const payload = {
      name:             fName.trim(),
      sport:            fSport,
      price:            Number(fPrice),
      price_day:        fPriceDay    ? Number(fPriceDay)    : null,
      price_night:      fPriceNight  ? Number(fPriceNight)  : null,
      night_from_hour:  Number(fNightFrom),
      description:      fDescription.trim() || null,
      features:         fFeatures,
      hours:            fHours,
      location:         fLocation || null,
      active:           fActive,
    }

    const { error } = editingId
      ? await supabase.from('fields').update(payload).eq('id', editingId)
      : await supabase.from('fields').insert({ ...payload, owner_id: userId })

    setSaving(false)
    if (error) { showToast('Error al guardar la cancha', false); return }

    showToast(editingId ? 'Cancha actualizada ✓' : 'Cancha creada ✓')
    handleDrawerClose()
    loadFields()
  }

  // ── Toggle active ───────────────────────────────────────────────────────────
  const toggleActive = async (field: Field) => {
    if (isBlocked(field)) { showToast('Cancha bloqueada por deuda pendiente', false); return }
    setTogglingId(field.id)
    const { error } = await supabase.from('fields').update({ active: !field.active }).eq('id', field.id)
    setTogglingId(null)
    if (error) { showToast('Error al actualizar estado', false); return }
    setFields(fs => fs.map(f => f.id === field.id ? { ...f, active: !f.active } : f))
    showToast(field.active ? 'Cancha desactivada' : 'Cancha activada ✓')
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  const deleteField = async () => {
    if (!deleteModal) return
    const { error } = await supabase.from('fields').delete().eq('id', deleteModal.id)
    setDeleteModal(null)
    if (error) { showToast('Error al eliminar la cancha', false); return }
    showToast('Cancha eliminada')
    loadFields()
  }

  // ── Duplicate ───────────────────────────────────────────────────────────────
  const duplicateField = async (field: Field) => {
    if (!userId) return
    await supabase.from('fields').insert({
      owner_id: userId,
      name:     `${field.name} (copia)`,
      sport:    field.sport,
      price:    field.price,
      price_day:   field.price_day,
      price_night: field.price_night,
      night_from_hour: field.night_from_hour,
      description: field.description,
      features:    field.features,
      hours:       field.hours,
      location:    field.location,
      active:      false,
    })
    showToast('Cancha duplicada — revisá y activá cuando esté lista')
    loadFields()
  }

  // ── Open drawer ─────────────────────────────────────────────────────────────
  const openNew = () => {
    resetForm()
    setDrawerOpen(true)
    setActiveSection('info')
  }

  const openEdit = async (field: Field) => {
    if (isBlocked(field)) { showToast('Cancha bloqueada por deuda pendiente', false); return }
    resetForm()
    setEditingId(field.id)
    setFName(field.name)
    setFSport((field.sport as SportType) ?? 'futbol5')
    setFPrice(String(field.price))
    setFPriceDay(field.price_day ? String(field.price_day) : '')
    setFPriceNight(field.price_night ? String(field.price_night) : '')
    setFNightFrom(field.night_from_hour ?? 18)
    setFDescription(field.description ?? '')
    setFFeatures(field.features ?? [])
    setFHours(field.hours ?? [])
    setFLocation(field.location ?? '')
    setFActive(field.active !== false)
    await loadGallery(field.id)
    setDrawerOpen(true)
    setActiveSection('info')
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setTimeout(resetForm, 300)
  }

  const resetForm = () => {
    setEditingId(null); setFName(''); setFSport('futbol5'); setFPrice('')
    setFPriceDay(''); setFPriceNight(''); setFNightFrom(18)
    setFDescription(''); setFFeatures([]); setFHours([])
    setFLocation(''); setFActive(true); setGallery([]); setErrors({})
  }

  const toggle = <T extends string>(val: T, list: T[], set: (v: T[]) => void) =>
    set(list.includes(val) ? list.filter(v => v !== val) : [...list, val])

  // ── Filtered fields ─────────────────────────────────────────────────────────
  const displayed = fields.filter(f => {
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase())
    const matchSport  = filterSport === 'all' || f.sport === filterSport
    const matchStatus = filterStatus === 'all'
      || (filterStatus === 'active'   && f.active !== false)
      || (filterStatus === 'inactive' && f.active === false)
    return matchSearch && matchSport && matchStatus
  })

  const activeCount   = fields.filter(f => f.active !== false).length
  const inactiveCount = fields.filter(f => f.active === false).length

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <style>{CSS}</style>

      {/* Toast */}
      {toast && (
        <div className={`f-toast ${toast.ok ? 'f-toast--ok' : 'f-toast--err'}`}>{toast.msg}</div>
      )}

      {/* Delete confirmation modal */}
      {deleteModal && (
        <div className="f-modal-overlay" role="dialog" aria-modal="true">
          <div className="f-modal">
            <div className="f-modal__icon">🗑️</div>
            <h3 className="f-modal__title">Eliminar cancha</h3>
            <p className="f-modal__body">
              ¿Estás seguro de que querés eliminar <strong>{deleteModal.name}</strong>?
              Esta acción no se puede deshacer y eliminará todas las imágenes asociadas.
            </p>
            <div className="f-modal__actions">
              <button className="f-btn f-btn--ghost" onClick={() => setDeleteModal(null)}>
                Cancelar
              </button>
              <button className="f-btn f-btn--danger" onClick={deleteField}>
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer backdrop */}
      {drawerOpen && <div className="f-backdrop" onClick={handleDrawerClose} />}

      {/* Drawer */}
      <div className={`f-drawer ${drawerOpen ? 'f-drawer--open' : ''}`} ref={drawerRef} role="dialog" aria-modal="true">
        <div className="f-drawer__header">
          <div>
            <h2 className="f-drawer__title">
              {editingId ? 'Editar cancha' : 'Nueva cancha'}
            </h2>
            <p className="f-drawer__sub">
              {editingId ? `ID #${editingId}` : 'Completá los datos para agregar la cancha'}
            </p>
          </div>
          <button className="f-drawer__close" onClick={handleDrawerClose} aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Drawer tabs */}
        <div className="f-tabs">
          {(['info','schedule','gallery'] as const).map(tab => (
            <button
              key={tab}
              className={`f-tab ${activeSection === tab ? 'f-tab--active' : ''}`}
              onClick={() => setActiveSection(tab)}
            >
              {tab === 'info' ? '📋 Información' : tab === 'schedule' ? '⏰ Horarios' : '📸 Fotos'}
              {tab === 'schedule' && fHours.length > 0 && (
                <span className="f-tab__badge">{fHours.length}</span>
              )}
              {tab === 'gallery' && gallery.length > 0 && (
                <span className="f-tab__badge">{gallery.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="f-drawer__body">

          {/* ── TAB: INFO ──────────────────────────────────────────────── */}
          {activeSection === 'info' && (
            <div className="f-section">

              {/* Sport selector */}
              <div className="f-field">
                <label className="f-label">Tipo de deporte <span className="f-req">*</span></label>
                <div className="f-sports">
                  {SPORTS.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      className={`f-sport-chip ${fSport === s.value ? 'f-sport-chip--active' : ''}`}
                      onClick={() => setFSport(s.value)}
                    >
                      <span>{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
                {errors.sport && <span className="f-error">{errors.sport}</span>}
              </div>

              {/* Name */}
              <div className="f-field">
                <label className="f-label" htmlFor="f-name">Nombre de la cancha <span className="f-req">*</span></label>
                <input
                  id="f-name"
                  className={`f-input ${errors.name ? 'f-input--err' : ''}`}
                  placeholder="Ej: Cancha Los Pinos"
                  value={fName}
                  onChange={e => { setFName(e.target.value); if (errors.name) setErrors(p => ({...p, name: undefined})) }}
                />
                {errors.name && <span className="f-error">{errors.name}</span>}
              </div>

              {/* Location */}
              <div className="f-field">
                <label className="f-label" htmlFor="f-location">Provincia</label>
                <select
                  id="f-location"
                  className="f-input"
                  value={fLocation}
                  onChange={e => setFLocation(e.target.value)}
                >
                  <option value="">Seleccioná una provincia</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Prices */}
              <div className="f-field">
                <label className="f-label">Precios <span className="f-req">*</span></label>
                <div className="f-price-grid">
                  <div>
                    <label className="f-sublabel">Precio base / hora</label>
                    <div className="f-input-prefix">
                      <span>₡</span>
                      <input
                        className={`f-input f-input--inner ${errors.price ? 'f-input--err' : ''}`}
                        type="number" min="0" placeholder="15000"
                        value={fPrice}
                        onChange={e => { setFPrice(e.target.value); if (errors.price) setErrors(p => ({...p, price: undefined})) }}
                      />
                    </div>
                    {errors.price && <span className="f-error">{errors.price}</span>}
                  </div>
                  <div>
                    <label className="f-sublabel">Precio día (opcional)</label>
                    <div className="f-input-prefix">
                      <span>₡</span>
                      <input className="f-input f-input--inner" type="number" min="0" placeholder="12000" value={fPriceDay} onChange={e => setFPriceDay(e.target.value)}/>
                    </div>
                  </div>
                  <div>
                    <label className="f-sublabel">Precio noche (opcional)</label>
                    <div className="f-input-prefix">
                      <span>₡</span>
                      <input className="f-input f-input--inner" type="number" min="0" placeholder="18000" value={fPriceNight} onChange={e => setFPriceNight(e.target.value)}/>
                    </div>
                  </div>
                  <div>
                    <label className="f-sublabel">Inicio de noche</label>
                    <select className="f-input" value={fNightFrom} onChange={e => setFNightFrom(Number(e.target.value))}>
                      {NIGHT_HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="f-field">
                <label className="f-label" htmlFor="f-desc">Descripción</label>
                <textarea
                  id="f-desc"
                  className="f-input f-textarea"
                  placeholder="Describí la cancha, superficie, dimensiones, etc."
                  value={fDescription}
                  onChange={e => setFDescription(e.target.value)}
                />
              </div>

              {/* Features */}
              <div className="f-field">
                <label className="f-label">Características</label>
                <div className="f-chips">
                  {FEATURES.map(feat => (
                    <button
                      key={feat}
                      type="button"
                      className={`f-chip ${fFeatures.includes(feat) ? 'f-chip--active' : ''}`}
                      onClick={() => toggle(feat, fFeatures, setFFeatures)}
                    >
                      {fFeatures.includes(feat) && <span className="f-chip__check">✓</span>}
                      {feat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active status */}
              <div className="f-field">
                <label className="f-label">Estado inicial</label>
                <div className="f-status-toggle">
                  <button
                    type="button"
                    className={`f-status-opt ${fActive ? 'f-status-opt--on' : ''}`}
                    onClick={() => setFActive(true)}
                  >
                    <span className="f-dot f-dot--on"/>
                    Activa — recibe reservas
                  </button>
                  <button
                    type="button"
                    className={`f-status-opt ${!fActive ? 'f-status-opt--off' : ''}`}
                    onClick={() => setFActive(false)}
                  >
                    <span className="f-dot f-dot--off"/>
                    Inactiva — sin reservas
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ── TAB: SCHEDULE ──────────────────────────────────────────── */}
          {activeSection === 'schedule' && (
            <div className="f-section">
              <div className="f-field">
                <div className="f-schedule-head">
                  <div>
                    <label className="f-label">Horarios disponibles <span className="f-req">*</span></label>
                    <p className="f-hint">Seleccioná las horas en que se puede reservar esta cancha</p>
                  </div>
                  <div className="f-schedule-actions">
                    <button className="f-btn-link" onClick={() => setFHours(ALL_HOURS)}>Todos</button>
                    <button className="f-btn-link f-btn-link--red" onClick={() => setFHours([])}>Limpiar</button>
                  </div>
                </div>
                {errors.hours && <span className="f-error">{errors.hours}</span>}
                <div className="f-hours">
                  {ALL_HOURS.map(h => {
                    const hourNum = Number(h.split(':')[0])
                    const isNight = hourNum >= fNightFrom
                    const sel     = fHours.includes(h)
                    return (
                      <button
                        key={h}
                        type="button"
                        className={`f-hour ${sel ? 'f-hour--active' : ''} ${isNight ? 'f-hour--night' : ''}`}
                        onClick={() => toggle(h, fHours, setFHours)}
                        title={isNight ? 'Horario nocturno' : 'Horario diurno'}
                      >
                        <span className="f-hour__time">{h}</span>
                        {isNight && <span className="f-hour__tag">🌙</span>}
                      </button>
                    )
                  })}
                </div>
                <div className="f-hours-legend">
                  <span className="f-legend__item"><span className="f-hour f-hour--day-demo"/>Día</span>
                  <span className="f-legend__item"><span className="f-hour f-hour--night-demo"/>Noche (desde {fNightFrom}:00)</span>
                  <span className="f-legend__item"><span className="f-hour f-hour--sel-demo"/>Seleccionado</span>
                </div>
              </div>

              {fHours.length > 0 && (
                <div className="f-hours-summary">
                  <p className="f-hours-summary__title">{fHours.length} hora{fHours.length>1?'s':''} seleccionadas</p>
                  <div className="f-hours-summary__list">
                    {fHours.sort().map(h => (
                      <span key={h} className="f-hours-summary__chip">
                        {h}
                        <button onClick={() => setFHours(p => p.filter(x => x !== h))}>×</button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB: GALLERY ───────────────────────────────────────────── */}
          {activeSection === 'gallery' && (
            <div className="f-section">
              {!editingId ? (
                <div className="f-gallery-notice">
                  <span>💡</span>
                  <p>Primero guardá la cancha, luego podrás agregar fotos.</p>
                </div>
              ) : (
                <>
                  <div className="f-field">
                    <label className="f-label">Fotos de la cancha</label>
                    <p className="f-hint">La primera imagen marcada como principal se mostrará en el listado. Máx. 5MB por imagen.</p>
                    <label className="f-upload-area" htmlFor="img-upload">
                      <input id="img-upload" ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={uploadImage} disabled={uploading}/>
                      {uploading ? (
                        <div className="f-upload-area__loading">
                          <div className="f-spinner"/>
                          <span>Subiendo imagen…</span>
                        </div>
                      ) : (
                        <>
                          <div className="f-upload-area__icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          </div>
                          <span className="f-upload-area__text">Hacé clic o arrastrá una imagen aquí</span>
                          <span className="f-upload-area__sub">PNG, JPG, WebP · Máx 5MB</span>
                        </>
                      )}
                    </label>
                  </div>

                  {gallery.length > 0 ? (
                    <div className="f-gallery">
                      {gallery.map(img => (
                        <div key={img.id} className={`f-gallery-item ${img.is_main ? 'f-gallery-item--main' : ''}`}>
                          <img src={img.url} alt="Foto de cancha" className="f-gallery-img" loading="lazy"/>
                          {img.is_main && <span className="f-gallery-main-badge">Principal</span>}
                          <div className="f-gallery-actions">
                            {!img.is_main && (
                              <button className="f-gallery-btn f-gallery-btn--star" onClick={() => setMainImage(img.id)} title="Marcar como principal">
                                ★
                              </button>
                            )}
                            <button className="f-gallery-btn f-gallery-btn--del" onClick={() => deleteImage(img)} title="Eliminar">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="f-gallery-empty">
                      <span>📷</span>
                      <p>Aún no hay fotos para esta cancha</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </div>

        {/* Drawer footer */}
        <div className="f-drawer__footer">
          <button className="f-btn f-btn--ghost" onClick={handleDrawerClose}>
            Cancelar
          </button>
          <button className="f-btn f-btn--primary" onClick={saveField} disabled={saving}>
            {saving ? <><div className="f-spinner f-spinner--sm f-spinner--white"/>Guardando…</> : editingId ? 'Guardar cambios' : 'Crear cancha'}
          </button>
        </div>
      </div>

      {/* ── MAIN PAGE ──────────────────────────────────────────────────────── */}
      <div className="f-page">

        {/* Header */}
        <div className="f-header">
          <div className="f-header__left">
            <h1 className="f-title">Canchas</h1>
            <p className="f-subtitle">
              {fields.length} cancha{fields.length !== 1 ? 's' : ''} ·
              <span className="f-subtitle__active"> {activeCount} activa{activeCount !== 1 ? 's' : ''}</span>
              {inactiveCount > 0 && <span className="f-subtitle__inactive"> · {inactiveCount} inactiva{inactiveCount !== 1 ? 's' : ''}</span>}
            </p>
          </div>
          <button className="f-btn f-btn--primary f-btn--add" onClick={openNew}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            Agregar cancha
          </button>
        </div>

        {/* Filters */}
        <div className="f-filters">
          <div className="f-search">
            <svg className="f-search__ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              className="f-search__input"
              placeholder="Buscar cancha…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && <button className="f-search__clear" onClick={() => setSearch('')}>×</button>}
          </div>
          <div className="f-filter-group">
            <select className="f-filter-select" value={filterSport} onChange={e => setFilterSport(e.target.value as any)}>
              <option value="all">Todos los deportes</option>
              {SPORTS.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
            </select>
            <div className="f-status-filter">
              {(['all','active','inactive'] as const).map(s => (
                <button
                  key={s}
                  className={`f-status-btn ${filterStatus === s ? 'f-status-btn--active' : ''}`}
                  onClick={() => setFilterStatus(s)}
                >
                  {s === 'all' ? 'Todas' : s === 'active' ? '🟢 Activas' : '⚪ Inactivas'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="f-grid">
            {[...Array(4)].map((_,i) => <FieldSkeleton key={i}/>)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="f-empty">
            {fields.length === 0 ? (
              <>
                <div className="f-empty__icon">⚽</div>
                <h3 className="f-empty__title">No tenés canchas registradas</h3>
                <p className="f-empty__sub">Agregá tu primera cancha para comenzar a recibir reservas</p>
                <button className="f-btn f-btn--primary" onClick={openNew}>+ Agregar primera cancha</button>
              </>
            ) : (
              <>
                <div className="f-empty__icon">🔍</div>
                <h3 className="f-empty__title">Sin resultados</h3>
                <p className="f-empty__sub">Probá con otros filtros o términos de búsqueda</p>
                <button className="f-btn f-btn--ghost" onClick={() => { setSearch(''); setFilterSport('all'); setFilterStatus('all') }}>
                  Limpiar filtros
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="f-grid">
            {displayed.map((field, idx) => {
              const sport    = SPORT_CONFIG[field.sport ?? ''] ?? SPORT_CONFIG.otro
              const active   = field.active !== false
              const blocked  = isBlocked(field)
              const toggling = togglingId === field.id
              return (
                <div
                  key={field.id}
                  className={`f-card ${!active ? 'f-card--inactive' : ''} ${blocked ? 'f-card--blocked' : ''}`}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Color accent bar */}
                  <div className="f-card__bar" style={{ background: active ? sport.color : '#e2e8f0' }}/>

                  {/* Card image */}
                  <div
                    className="f-card__img"
                    style={{ backgroundImage: `url(${DEFAULT_IMG})`, opacity: active ? 1 : 0.5 }}
                  >
                    <div className="f-card__img-overlay">
                      <span className="f-card__sport-badge">
                        {sport.icon} {sport.label}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="f-card__body">
                    <div className="f-card__top">
                      <div className="f-card__title-row">
                        <h3 className="f-card__name">{field.name}</h3>
                        {blocked && <span className="f-card__blocked-badge">🔒 Bloqueada</span>}
                      </div>
                      <div className="f-card__meta">
                        {field.location && <span className="f-card__loc">📍 {field.location}</span>}
                        {field.hours && field.hours.length > 0 && (
                          <span className="f-card__hours">⏰ {field.hours.length} horarios</span>
                        )}
                      </div>
                    </div>

                    {/* Prices */}
                    <div className="f-card__prices">
                      <div className="f-card__price-main">
                        <span className="f-card__price-val">{fCRC(field.price)}</span>
                        <span className="f-card__price-unit">/hora</span>
                      </div>
                      {(field.price_day || field.price_night) && (
                        <div className="f-card__price-detail">
                          {field.price_day   && <span>☀️ {fCRC(field.price_day)}</span>}
                          {field.price_night && <span>🌙 {fCRC(field.price_night)}</span>}
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    {field.features && field.features.length > 0 && (
                      <div className="f-card__features">
                        {field.features.slice(0,4).map(feat => (
                          <span key={feat} className="f-card__feat">{feat}</span>
                        ))}
                        {field.features.length > 4 && (
                          <span className="f-card__feat f-card__feat--more">+{field.features.length - 4}</span>
                        )}
                      </div>
                    )}

                    {/* Status + Actions */}
                    <div className="f-card__footer">
                      <label className="f-toggle" title={active ? 'Desactivar cancha' : 'Activar cancha'}>
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleActive(field)}
                          disabled={toggling || blocked}
                        />
                        <span className="f-toggle__track"/>
                        <span className={`f-toggle__label ${active ? 'f-toggle__label--on' : 'f-toggle__label--off'}`}>
                          {toggling ? '…' : active ? 'Activa' : 'Inactiva'}
                        </span>
                      </label>

                      <div className="f-card__actions">
                        <button
                          className="f-card__action f-card__action--edit"
                          onClick={() => openEdit(field)}
                          title="Editar"
                          disabled={blocked}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button
                          className="f-card__action f-card__action--dupe"
                          onClick={() => duplicateField(field)}
                          title="Duplicar"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                        </button>
                        <button
                          className="f-card__action f-card__action--del"
                          onClick={() => setDeleteModal(field)}
                          title="Eliminar"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Add card */}
            <button className="f-card-add" onClick={openNew}>
              <div className="f-card-add__icon">+</div>
              <span className="f-card-add__text">Agregar cancha</span>
            </button>
          </div>
        )}
      </div>

      {/* FAB mobile */}
      <button className="f-fab" onClick={openNew} aria-label="Agregar cancha">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
      </button>
    </AdminLayout>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function FieldSkeleton() {
  return (
    <div className="f-card-skeleton">
      <div className="f-sk" style={{height:130}}/>
      <div style={{padding:'16px 16px 12px', display:'flex', flexDirection:'column', gap:8}}>
        <div className="f-sk" style={{height:16, width:'60%'}}/>
        <div className="f-sk" style={{height:12, width:'40%'}}/>
        <div className="f-sk" style={{height:24, width:'50%', marginTop:4}}/>
        <div style={{display:'flex', gap:6, marginTop:4}}>
          {[...Array(3)].map((_,i)=><div key={i} className="f-sk" style={{height:22,width:56,borderRadius:999}}/>)}
        </div>
      </div>
    </div>
  )
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Syne:wght@700;800&display=swap');

/* ── Root ──────────────────────────────────────────────────────────────────── */
.f-page {
  font-family: 'DM Sans', sans-serif;
  background: #f0f2f5;
  min-height: 100vh;
  padding: 28px 28px 80px;
  color: #0f172a;
}

/* ── Header ────────────────────────────────────────────────────────────────── */
.f-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
}
.f-title    { font-family:'Syne',sans-serif; font-size:26px; font-weight:800; letter-spacing:-.5px; margin:0; }
.f-subtitle { font-size:13px; color:#94a3b8; margin:3px 0 0; }
.f-subtitle__active   { color:#16a34a; font-weight:600; }
.f-subtitle__inactive { color:#f59e0b; font-weight:600; }

/* ── Filters ───────────────────────────────────────────────────────────────── */
.f-filters { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:24px; align-items:center; }

.f-search {
  display:flex; align-items:center; gap:8px;
  background:white; border:1.5px solid #e8ecf0; border-radius:10px;
  padding:0 12px; height:38px; flex:1; min-width:200px; max-width:320px;
  transition:border-color .15s;
}
.f-search:focus-within { border-color:#22c55e; }
.f-search__ico   { color:#94a3b8; flex-shrink:0; }
.f-search__input { border:none; outline:none; font-family:inherit; font-size:13px; flex:1; background:transparent; color:#0f172a; }
.f-search__input::placeholder { color:#94a3b8; }
.f-search__clear { background:none; border:none; cursor:pointer; color:#94a3b8; font-size:16px; padding:0; line-height:1; transition:color .12s; }
.f-search__clear:hover { color:#0f172a; }

.f-filter-group { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.f-filter-select {
  height:38px; padding:0 12px; border-radius:10px; border:1.5px solid #e8ecf0;
  background:white; font-size:13px; font-family:inherit; color:#374151;
  cursor:pointer; outline:none; transition:border-color .15s;
}
.f-filter-select:focus { border-color:#22c55e; }

.f-status-filter { display:flex; gap:2px; background:#f1f5f9; border-radius:10px; padding:3px; }
.f-status-btn    { padding:5px 12px; border-radius:7px; border:none; background:transparent; font-size:12px; font-weight:500; color:#64748b; cursor:pointer; font-family:inherit; transition:all .12s; white-space:nowrap; }
.f-status-btn--active { background:white; color:#0f172a; font-weight:600; box-shadow:0 1px 3px rgba(0,0,0,.08); }

/* ── Grid ──────────────────────────────────────────────────────────────────── */
.f-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:18px; }

/* ── Field card ────────────────────────────────────────────────────────────── */
.f-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  border: 1.5px solid #eaecf0;
  box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.04);
  transition: box-shadow .2s, transform .2s, border-color .2s;
  display: flex; flex-direction: column;
  position: relative;
  animation: fCardIn .35s ease both;
}
@keyframes fCardIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
.f-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.1); transform:translateY(-2px); border-color:#d1d9e0; }
.f-card--inactive { opacity:.7; }
.f-card--inactive:hover { opacity:1; }
.f-card--blocked { border-color:#fecaca; }

.f-card__bar { height:4px; width:100%; flex-shrink:0; }

.f-card__img {
  height:130px;
  background-size:cover; background-position:center;
  position:relative;
  flex-shrink:0;
}
.f-card__img-overlay {
  position:absolute; inset:0;
  background:linear-gradient(to top, rgba(0,0,0,.55), transparent);
  display:flex; align-items:flex-end; padding:10px 12px;
}
.f-card__sport-badge {
  font-size:11px; font-weight:700; color:white;
  background:rgba(0,0,0,.35); backdrop-filter:blur(4px);
  padding:3px 8px; border-radius:999px; letter-spacing:.02em;
}

.f-card__body { padding:14px 16px 12px; display:flex; flex-direction:column; gap:10px; flex:1; }

.f-card__top        { display:flex; flex-direction:column; gap:4px; }
.f-card__title-row  { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.f-card__name       { font-size:15px; font-weight:700; color:#0f172a; margin:0; }
.f-card__blocked-badge { font-size:10px; background:#fee2e2; color:#991b1b; padding:2px 7px; border-radius:999px; font-weight:700; }

.f-card__meta  { display:flex; gap:10px; flex-wrap:wrap; }
.f-card__loc, .f-card__hours { font-size:11px; color:#94a3b8; font-weight:500; }

.f-card__prices     { display:flex; flex-direction:column; gap:3px; }
.f-card__price-main { display:flex; align-items:baseline; gap:3px; }
.f-card__price-val  { font-family:'Syne',sans-serif; font-size:20px; font-weight:700; color:#0f172a; }
.f-card__price-unit { font-size:12px; color:#94a3b8; }
.f-card__price-detail { display:flex; gap:8px; font-size:11px; color:#94a3b8; font-weight:600; }

.f-card__features { display:flex; flex-wrap:wrap; gap:5px; }
.f-card__feat     { font-size:10px; font-weight:600; background:#f1f5f9; color:#64748b; padding:3px 8px; border-radius:999px; }
.f-card__feat--more { background:#e2e8f0; }

.f-card__footer  { display:flex; align-items:center; justify-content:space-between; gap:8px; padding-top:6px; border-top:1px solid #f8fafc; margin-top:auto; }
.f-card__actions { display:flex; gap:4px; }
.f-card__action  { width:30px; height:30px; border-radius:8px; border:1.5px solid #e8ecf0; background:white; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .12s; color:#64748b; }
.f-card__action:hover:not(:disabled)   { border-color:#cbd5e1; color:#0f172a; background:#f8fafc; }
.f-card__action--edit:hover:not(:disabled)  { border-color:#2563eb; color:#2563eb; background:#eff6ff; }
.f-card__action--dupe:hover:not(:disabled)  { border-color:#0891b2; color:#0891b2; background:#ecfeff; }
.f-card__action--del:hover:not(:disabled)   { border-color:#ef4444; color:#ef4444; background:#fef2f2; }
.f-card__action:disabled { opacity:.35; cursor:not-allowed; }

/* Add card */
.f-card-add {
  background:white; border:2px dashed #d1d9e0; border-radius:16px;
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:10px; padding:32px; cursor:pointer; transition:all .18s;
  min-height:200px;
}
.f-card-add:hover { border-color:#22c55e; background:#f0fdf4; }
.f-card-add__icon { width:44px; height:44px; border-radius:12px; background:#f1f5f9; color:#94a3b8; font-size:24px; display:flex; align-items:center; justify-content:center; transition:all .18s; }
.f-card-add:hover .f-card-add__icon { background:#dcfce7; color:#16a34a; }
.f-card-add__text { font-size:13px; font-weight:600; color:#94a3b8; transition:color .18s; }
.f-card-add:hover .f-card-add__text { color:#16a34a; }

/* ── Toggle ────────────────────────────────────────────────────────────────── */
.f-toggle       { display:flex; align-items:center; gap:7px; cursor:pointer; }
.f-toggle input { display:none; }
.f-toggle__track {
  width:36px; height:20px; border-radius:999px; background:#e2e8f0;
  position:relative; transition:background .2s; flex-shrink:0;
}
.f-toggle__track::after {
  content:''; position:absolute; top:3px; left:3px;
  width:14px; height:14px; border-radius:50%; background:white;
  box-shadow:0 1px 3px rgba(0,0,0,.2); transition:transform .2s;
}
.f-toggle input:checked + .f-toggle__track { background:#22c55e; }
.f-toggle input:checked + .f-toggle__track::after { transform:translateX(16px); }
.f-toggle input:disabled + .f-toggle__track { opacity:.45; }
.f-toggle__label     { font-size:11px; font-weight:700; }
.f-toggle__label--on { color:#16a34a; }
.f-toggle__label--off{ color:#94a3b8; }

/* ── Status dot ────────────────────────────────────────────────────────────── */
.f-dot     { width:8px; height:8px; border-radius:50%; display:inline-block; flex-shrink:0; }
.f-dot--on { background:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,.2); }
.f-dot--off{ background:#e2e8f0; }

/* ── Empty state ───────────────────────────────────────────────────────────── */
.f-empty { text-align:center; padding:80px 20px; display:flex; flex-direction:column; align-items:center; gap:12px; }
.f-empty__icon  { font-size:48px; }
.f-empty__title { font-family:'Syne',sans-serif; font-size:18px; font-weight:700; margin:0; }
.f-empty__sub   { font-size:13px; color:#94a3b8; margin:0; }

/* ── Skeleton ──────────────────────────────────────────────────────────────── */
.f-card-skeleton { background:white; border-radius:16px; overflow:hidden; border:1.5px solid #eaecf0; }
.f-sk { background:linear-gradient(90deg,#f1f5f9 25%,#e8ecf2 50%,#f1f5f9 75%); background-size:200% 100%; animation:fShimmer 1.6s infinite; border-radius:6px; }
@keyframes fShimmer { to{background-position:-200% 0} }

/* ── Drawer ────────────────────────────────────────────────────────────────── */
.f-backdrop {
  position:fixed; inset:0; background:rgba(15,23,42,.45);
  backdrop-filter:blur(3px); z-index:200; animation:fFadeIn .2s ease;
}
@keyframes fFadeIn { from{opacity:0} to{opacity:1} }

.f-drawer {
  position:fixed; top:0; right:0; bottom:0; width:520px; max-width:100vw;
  background:white; z-index:300;
  display:flex; flex-direction:column;
  box-shadow:-8px 0 40px rgba(0,0,0,.18);
  transform:translateX(100%);
  transition:transform .3s cubic-bezier(.4,0,.2,1);
}
.f-drawer--open { transform:translateX(0); }

.f-drawer__header {
  display:flex; align-items:flex-start; justify-content:space-between;
  padding:24px 24px 0; gap:12px; flex-shrink:0;
}
.f-drawer__title { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; margin:0; }
.f-drawer__sub   { font-size:12px; color:#94a3b8; margin:3px 0 0; }
.f-drawer__close {
  width:32px; height:32px; border-radius:8px; border:1.5px solid #e8ecf0;
  background:white; display:flex; align-items:center; justify-content:center;
  cursor:pointer; flex-shrink:0; transition:all .12s; color:#64748b;
}
.f-drawer__close:hover { background:#f8fafc; color:#0f172a; }

.f-tabs { display:flex; gap:2px; padding:16px 24px 0; border-bottom:1px solid #f1f5f9; flex-shrink:0; }
.f-tab  {
  padding:9px 16px; border:none; background:transparent;
  font-size:13px; font-weight:600; color:#64748b;
  cursor:pointer; font-family:inherit; border-bottom:2px solid transparent;
  margin-bottom:-1px; transition:all .14s; display:flex; align-items:center; gap:6px;
}
.f-tab:hover    { color:#0f172a; }
.f-tab--active  { color:#16a34a; border-bottom-color:#16a34a; }
.f-tab__badge   { background:#f1f5f9; color:#64748b; font-size:10px; font-weight:700; padding:1px 6px; border-radius:999px; }
.f-tab--active .f-tab__badge { background:#dcfce7; color:#15803d; }

.f-drawer__body  { flex:1; overflow-y:auto; padding:20px 24px; }
.f-drawer__footer{ padding:16px 24px; border-top:1px solid #f1f5f9; display:flex; justify-content:flex-end; gap:10px; flex-shrink:0; background:white; }

/* ── Form ──────────────────────────────────────────────────────────────────── */
.f-section { display:flex; flex-direction:column; gap:20px; }
.f-field   { display:flex; flex-direction:column; gap:6px; }
.f-label   { font-size:12px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:.04em; }
.f-sublabel{ font-size:11px; font-weight:600; color:#64748b; margin-bottom:4px; display:block; }
.f-req     { color:#ef4444; }
.f-hint    { font-size:11px; color:#94a3b8; margin:0; }
.f-error   { font-size:11px; color:#ef4444; font-weight:600; }

.f-input {
  width:100%; padding:10px 12px; border-radius:10px;
  border:1.5px solid #e8ecf0; font-family:inherit; font-size:13px;
  color:#0f172a; background:white; outline:none;
  transition:border-color .15s, box-shadow .15s;
  box-sizing:border-box;
}
.f-input:focus { border-color:#22c55e; box-shadow:0 0 0 3px rgba(34,197,94,.1); }
.f-input--err  { border-color:#ef4444; }
.f-input--err:focus { box-shadow:0 0 0 3px rgba(239,68,68,.1); }
.f-textarea    { height:80px; resize:vertical; }

.f-input-prefix { position:relative; }
.f-input-prefix > span {
  position:absolute; left:12px; top:50%; transform:translateY(-50%);
  font-size:13px; font-weight:600; color:#94a3b8; pointer-events:none;
}
.f-input--inner { padding-left:26px; }

.f-price-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }

/* Sports */
.f-sports { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; }
.f-sport-chip {
  display:flex; flex-direction:column; align-items:center; gap:4px;
  padding:10px 6px; border-radius:12px; border:1.5px solid #e8ecf0;
  background:white; cursor:pointer; transition:all .13s; font-family:inherit;
}
.f-sport-chip span:first-child { font-size:20px; }
.f-sport-chip span:last-child  { font-size:10px; font-weight:700; color:#64748b; }
.f-sport-chip:hover { border-color:#22c55e; background:#f0fdf4; }
.f-sport-chip--active { border-color:#22c55e; background:#f0fdf4; box-shadow:0 0 0 3px rgba(34,197,94,.12); }
.f-sport-chip--active span:last-child { color:#16a34a; }

/* Chips */
.f-chips { display:flex; flex-wrap:wrap; gap:7px; }
.f-chip  {
  display:flex; align-items:center; gap:5px;
  padding:6px 12px; border-radius:999px;
  border:1.5px solid #e8ecf0; background:white;
  font-size:12px; font-weight:600; color:#64748b;
  cursor:pointer; transition:all .12s; font-family:inherit;
}
.f-chip:hover { border-color:#22c55e; color:#16a34a; background:#f0fdf4; }
.f-chip--active { background:#16a34a; border-color:#16a34a; color:white; }
.f-chip__check { font-size:10px; }

/* Status toggle */
.f-status-toggle { display:flex; gap:8px; }
.f-status-opt {
  flex:1; display:flex; align-items:center; gap:8px;
  padding:10px 14px; border-radius:10px;
  border:1.5px solid #e8ecf0; background:white;
  font-size:12px; font-weight:600; color:#64748b;
  cursor:pointer; transition:all .13s; font-family:inherit;
}
.f-status-opt--on  { border-color:#22c55e; background:#f0fdf4; color:#15803d; }
.f-status-opt--off { border-color:#e8ecf0; background:#f8fafc; color:#94a3b8; }

/* Hours */
.f-schedule-head    { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.f-schedule-actions { display:flex; gap:8px; flex-shrink:0; }
.f-btn-link { background:none; border:none; font-family:inherit; font-size:12px; font-weight:700; cursor:pointer; color:#16a34a; padding:0; }
.f-btn-link--red { color:#ef4444; }

.f-hours { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin-top:4px; }
.f-hour  {
  display:flex; flex-direction:column; align-items:center; gap:2px;
  padding:8px 4px; border-radius:10px;
  border:1.5px solid #e8ecf0; background:white;
  cursor:pointer; transition:all .12s; font-family:inherit;
}
.f-hour__time { font-size:11px; font-weight:700; color:#64748b; }
.f-hour__tag  { font-size:9px; line-height:1; }
.f-hour--night { border-color:#e0e7ff; }
.f-hour--night .f-hour__time { color:#4f46e5; }
.f-hour:hover  { border-color:#22c55e; background:#f0fdf4; }
.f-hour--active { background:#0f172a; border-color:#0f172a; }
.f-hour--active .f-hour__time { color:white; }
.f-hour--day-demo, .f-hour--night-demo, .f-hour--sel-demo {
  display:inline-block; width:24px; height:14px; border-radius:4px; vertical-align:middle;
}
.f-hour--day-demo   { background:white; border:1.5px solid #e8ecf0; }
.f-hour--night-demo { background:white; border:1.5px solid #e0e7ff; }
.f-hour--sel-demo   { background:#0f172a; border:1.5px solid #0f172a; }
.f-hours-legend     { display:flex; gap:16px; align-items:center; font-size:11px; color:#94a3b8; font-weight:600; flex-wrap:wrap; margin-top:4px; }
.f-legend__item     { display:flex; align-items:center; gap:5px; }

.f-hours-summary       { background:#f8fafc; border-radius:12px; padding:12px 14px; border:1px solid #f1f5f9; }
.f-hours-summary__title{ font-size:12px; font-weight:700; color:#374151; margin-bottom:8px; }
.f-hours-summary__list { display:flex; flex-wrap:wrap; gap:5px; }
.f-hours-summary__chip {
  display:flex; align-items:center; gap:5px;
  font-size:11px; font-weight:700; background:#e2e8f0; color:#374151;
  padding:3px 8px; border-radius:999px;
}
.f-hours-summary__chip button { background:none; border:none; cursor:pointer; color:#94a3b8; font-size:12px; padding:0; line-height:1; }
.f-hours-summary__chip button:hover { color:#ef4444; }

/* Gallery */
.f-gallery-notice { background:#fffbeb; border:1px solid #fde68a; border-radius:12px; padding:14px 16px; display:flex; gap:10px; align-items:flex-start; font-size:13px; color:#78350f; }
.f-gallery-empty  { text-align:center; padding:32px 20px; color:#94a3b8; font-size:13px; }
.f-gallery-empty span { font-size:32px; display:block; margin-bottom:8px; }

.f-upload-area {
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;
  border:2px dashed #d1d9e0; border-radius:12px; padding:28px;
  cursor:pointer; transition:all .15s;
  background:white;
}
.f-upload-area:hover { border-color:#22c55e; background:#f0fdf4; }
.f-upload-area__icon { color:#94a3b8; transition:color .15s; }
.f-upload-area:hover .f-upload-area__icon { color:#16a34a; }
.f-upload-area__text { font-size:13px; font-weight:600; color:#374151; }
.f-upload-area__sub  { font-size:11px; color:#94a3b8; }
.f-upload-area__loading { display:flex; flex-direction:column; align-items:center; gap:8px; font-size:13px; color:#94a3b8; }

.f-gallery { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:12px; }
.f-gallery-item { position:relative; border-radius:10px; overflow:hidden; aspect-ratio:4/3; border:2px solid transparent; transition:border-color .15s; }
.f-gallery-item--main { border-color:#22c55e; }
.f-gallery-img   { width:100%; height:100%; object-fit:cover; display:block; }
.f-gallery-main-badge { position:absolute; bottom:6px; left:6px; font-size:9px; font-weight:700; background:#22c55e; color:white; padding:2px 6px; border-radius:999px; letter-spacing:.04em; text-transform:uppercase; }
.f-gallery-actions { position:absolute; top:6px; right:6px; display:flex; gap:4px; opacity:0; transition:opacity .15s; }
.f-gallery-item:hover .f-gallery-actions { opacity:1; }
.f-gallery-btn { width:24px; height:24px; border-radius:6px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .12s; }
.f-gallery-btn--star { background:rgba(255,255,255,.9); color:#ca8a04; font-size:13px; }
.f-gallery-btn--del  { background:rgba(239,68,68,.9); color:white; }

/* ── Buttons ───────────────────────────────────────────────────────────────── */
.f-btn {
  display:inline-flex; align-items:center; gap:7px;
  padding:9px 18px; border-radius:10px;
  font-size:13px; font-weight:600; font-family:inherit;
  cursor:pointer; border:none; transition:all .14s;
  white-space:nowrap;
}
.f-btn--primary { background:#0f172a; color:white; }
.f-btn--primary:hover:not(:disabled) { background:#1e293b; }
.f-btn--primary:disabled { opacity:.5; cursor:not-allowed; }
.f-btn--ghost   { background:transparent; color:#374151; border:1.5px solid #e2e8f0; }
.f-btn--ghost:hover { background:#f8fafc; }
.f-btn--danger  { background:#ef4444; color:white; }
.f-btn--danger:hover { background:#dc2626; }
.f-btn--add     { background:#16a34a; box-shadow:0 2px 8px rgba(22,163,74,.3); }
.f-btn--add:hover { background:#15803d; transform:translateY(-1px); }
.f-btn--sm { padding:6px 13px; font-size:12px; border-radius:8px; }

/* ── Spinner ───────────────────────────────────────────────────────────────── */
.f-spinner { width:16px; height:16px; border-radius:50%; border:2px solid rgba(0,0,0,.1); border-top-color:#22c55e; animation:fSpin .7s linear infinite; }
.f-spinner--sm    { width:13px; height:13px; }
.f-spinner--white { border-color:rgba(255,255,255,.2); border-top-color:white; }
@keyframes fSpin { to{transform:rotate(360deg)} }

/* ── Toast ─────────────────────────────────────────────────────────────────── */
.f-toast {
  position:fixed; bottom:28px; right:28px; z-index:9999;
  padding:12px 20px; border-radius:12px;
  font-size:13px; font-weight:600; font-family:'DM Sans',sans-serif;
  box-shadow:0 8px 32px rgba(0,0,0,.18); animation:fToastIn .2s ease;
}
.f-toast--ok  { background:#0f172a; color:white; }
.f-toast--err { background:#ef4444; color:white; }
@keyframes fToastIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

/* ── Modal ─────────────────────────────────────────────────────────────────── */
.f-modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.5); backdrop-filter:blur(4px);
  display:flex; align-items:center; justify-content:center; z-index:400; padding:20px;
}
.f-modal {
  background:white; border-radius:20px; padding:32px; max-width:400px; width:100%;
  box-shadow:0 32px 80px rgba(0,0,0,.25); animation:fModalIn .2s ease;
  text-align:center;
}
@keyframes fModalIn { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:none} }
.f-modal__icon  { font-size:36px; margin-bottom:12px; }
.f-modal__title { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; margin:0 0 8px; }
.f-modal__body  { font-size:13px; color:#64748b; line-height:1.6; margin:0 0 24px; }
.f-modal__actions { display:flex; gap:10px; justify-content:center; }

/* ── FAB mobile ────────────────────────────────────────────────────────────── */
.f-fab {
  display:none; position:fixed; bottom:24px; right:24px;
  width:52px; height:52px; border-radius:50%;
  background:#16a34a; border:none;
  box-shadow:0 4px 20px rgba(22,163,74,.45);
  align-items:center; justify-content:center;
  cursor:pointer; z-index:100; transition:all .15s;
}
.f-fab:hover { background:#15803d; transform:scale(1.05); }

/* ── Responsive ────────────────────────────────────────────────────────────── */
@media (max-width:900px) {
  .f-drawer { width:100vw; }
  .f-price-grid { grid-template-columns:1fr 1fr; }
}
@media (max-width:640px) {
  .f-page { padding:16px 16px 80px; }
  .f-grid { grid-template-columns:1fr; }
  .f-filters { flex-direction:column; }
  .f-search { max-width:100%; }
  .f-btn--add { display:none; }
  .f-fab { display:flex; }
  .f-sports { grid-template-columns:repeat(4,1fr); }
  .f-price-grid { grid-template-columns:1fr; }
  .f-hours { grid-template-columns:repeat(4,1fr); }
}
`
