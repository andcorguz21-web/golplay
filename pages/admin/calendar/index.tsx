/**
 * GolPlay — Calendario Administrativo
 * pages/admin/calendar/index.tsx
 *
 * Dependencias: npm install react-day-picker
 */

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import AdminLayout from '@/components/ui/admin/AdminLayout'
import DailyCalendar from '@/components/ui/admin/daily'
import WeeklyCalendar from '@/components/ui/admin/week'
import { DayPicker } from 'react-day-picker'
import 'react-day-picker/dist/style.css'
import {
  ChevronLeft, ChevronRight, CalendarDays,
  LayoutGrid, Calendar, ChevronDown, Filter,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convierte Date a "YYYY-MM-DD" en hora local (evita el bug UTC de toISOString) */
function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Obtiene el lunes de la semana de una fecha dada */
function getWeekStart(d: Date): Date {
  const result = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = result.getDay() === 0 ? 7 : result.getDay()
  result.setDate(result.getDate() - (day - 1))
  return result
}

/** Etiqueta de semana "28 ene — 3 feb 2026" */
function weekLabel(base: Date): string {
  const monday = getWeekStart(base)
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  const from = monday.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })
  const to   = sunday.toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${from} — ${to}`
}

type View = 'daily' | 'weekly'

interface Field { id: string; name: string }

// ─── Styles ───────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page: {
    background: '#f8fafc',
    minHeight: '100vh',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  inner: { maxWidth: 1440, margin: '0 auto', padding: '28px 20px' },

  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', flexWrap: 'wrap',
    gap: 14, marginBottom: 24,
  },
  h1: { fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 },

  toolRow: {
    display: 'flex', alignItems: 'center',
    gap: 10, flexWrap: 'wrap',
  },

  // Nav group: prev · label · next · Today
  navGroup: {
    display: 'flex', alignItems: 'center', gap: 2,
    background: '#fff', border: '1px solid #e2e8f0',
    borderRadius: 12, overflow: 'hidden',
  },
  navBtn: {
    padding: '8px 10px', background: 'none', border: 'none',
    cursor: 'pointer', color: '#64748b', display: 'flex',
    alignItems: 'center', transition: 'background 0.15s',
  },
  navLabel: {
    padding: '8px 14px', fontSize: 13, fontWeight: 600,
    color: '#0f172a', minWidth: 130, textAlign: 'center',
    borderLeft: '1px solid #f1f5f9', borderRight: '1px solid #f1f5f9',
    cursor: 'pointer', userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  todayBtn: {
    padding: '8px 14px', background: 'none', border: 'none',
    fontSize: 13, fontWeight: 600, color: '#2563eb',
    cursor: 'pointer', transition: 'background 0.15s',
  },

  // View switch
  viewSwitch: {
    display: 'flex', background: '#f1f5f9',
    borderRadius: 10, padding: 3, gap: 2,
  },
  viewBtnActive: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '7px 14px', fontSize: 13, fontWeight: 600,
    background: '#fff', color: '#0f172a', border: 'none',
    borderRadius: 8, cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,.08)',
  },
  viewBtnInactive: {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '7px 14px', fontSize: 13, fontWeight: 500,
    background: 'transparent', color: '#64748b', border: 'none',
    borderRadius: 8, cursor: 'pointer',
  },

  // Field filter
  selectWrap: { position: 'relative' },
  select: {
    appearance: 'none', background: '#fff',
    border: '1px solid #e2e8f0', borderRadius: 10,
    padding: '8px 30px 8px 12px', fontSize: 13,
    fontWeight: 500, color: '#374151',
    cursor: 'pointer', outline: 'none',
  },

  // Popover
  popover: {
    position: 'absolute', top: 44, right: 0,
    background: '#fff', borderRadius: 18,
    boxShadow: '0 18px 48px rgba(0,0,0,.16)',
    padding: 12, zIndex: 50,
    border: '1px solid #f1f5f9',
  },

  // Legend
  legend: {
    display: 'flex', alignItems: 'center', gap: 16,
    flexWrap: 'wrap', marginBottom: 20,
  },
  legendItem: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b' },
  legendDot: (color: string) => ({ width: 8, height: 8, borderRadius: '50%', background: color }),
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdminCalendar() {
  const router = useRouter()
  const [view, setView] = useState<View>('weekly')
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0); return t
  })
  const [openCalendar, setOpenCalendar] = useState(false)
  const [fields, setFields] = useState<Field[]>([])
  const [fieldFilter, setFieldFilter] = useState('all')
  const popoverRef = useRef<HTMLDivElement>(null)

  // Auth guard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/login')
    })
  }, [router])

  // Load fields for filter
  useEffect(() => {
    supabase.from('fields').select('id, name').eq('active', true).then(({ data }) => {
      setFields(data?.map((f: any) => ({ id: String(f.id), name: f.name })) ?? [])
    })
  }, [])

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenCalendar(false)
      }
    }
    if (openCalendar) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openCalendar])

  // Navigation
  const navigate = useCallback((dir: 1 | -1) => {
    setSelectedDate(prev => {
      const d = new Date(prev)
      if (view === 'daily') {
        d.setDate(d.getDate() + dir)
      } else {
        d.setDate(d.getDate() + dir * 7)
      }
      return d
    })
  }, [view])

  const goToday = useCallback(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0)
    setSelectedDate(t)
  }, [])

  // Date label in nav bar
  const navLabel = useMemo(() => {
    if (view === 'daily') {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const isToday = selectedDate.getTime() === today.getTime()
      if (isToday) return 'Hoy'
      return selectedDate.toLocaleDateString('es-CR', { day: 'numeric', month: 'short', year: 'numeric' })
    }
    return weekLabel(selectedDate)
  }, [view, selectedDate])

  const isToday = useMemo(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0)
    return selectedDate.getTime() === t.getTime()
  }, [selectedDate])

  const dateStr = toLocalDateStr(selectedDate)

  return (
    <AdminLayout>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        * { box-sizing: border-box; }
        button:focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
        .rdp { --rdp-accent-color: #0f172a; --rdp-background-color: #f1f5f9; }
      `}</style>

      <div style={S.page}>
        <div style={S.inner}>

          {/* ── Header ── */}
          <div style={S.header}>
            <h1 style={S.h1}>Calendario</h1>

            <div style={S.toolRow}>

              {/* Field filter */}
              {fields.length > 1 && (
                <div style={S.selectWrap}>
                  <select
                    style={S.select}
                    value={fieldFilter}
                    onChange={e => setFieldFilter(e.target.value)}
                    aria-label="Filtrar por cancha"
                  >
                    <option value="all">Todas las canchas</option>
                    {fields.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} color="#94a3b8" style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              )}

              {/* Date navigation */}
              <div style={S.navGroup}>
                <button
                  style={S.navBtn}
                  onClick={() => navigate(-1)}
                  aria-label={view === 'daily' ? 'Día anterior' : 'Semana anterior'}
                >
                  <ChevronLeft size={16} />
                </button>

                {/* Clicking the label opens the date picker */}
                <div ref={popoverRef} style={{ position: 'relative' }}>
                  <button
                    style={S.navLabel}
                    onClick={() => setOpenCalendar(v => !v)}
                    aria-label="Seleccionar fecha"
                    aria-expanded={openCalendar}
                  >
                    {navLabel}
                  </button>

                  {openCalendar && (
                    <div style={S.popover}>
                      <DayPicker
                        mode="single"
                        selected={selectedDate}
                        onSelect={date => {
                          if (!date) return
                          setSelectedDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()))
                          setOpenCalendar(false)
                        }}
                      />
                    </div>
                  )}
                </div>

                <button
                  style={S.navBtn}
                  onClick={() => navigate(1)}
                  aria-label={view === 'daily' ? 'Día siguiente' : 'Semana siguiente'}
                >
                  <ChevronRight size={16} />
                </button>

                {!isToday && (
                  <button
                    style={S.todayBtn}
                    onClick={goToday}
                    aria-label="Ir a hoy"
                  >
                    Hoy
                  </button>
                )}
              </div>

              {/* View switch */}
              <div style={S.viewSwitch} role="group" aria-label="Cambiar vista">
                <button
                  style={view === 'daily' ? S.viewBtnActive : S.viewBtnInactive}
                  onClick={() => setView('daily')}
                  aria-pressed={view === 'daily'}
                >
                  <Calendar size={13} />
                  Diario
                </button>
                <button
                  style={view === 'weekly' ? S.viewBtnActive : S.viewBtnInactive}
                  onClick={() => setView('weekly')}
                  aria-pressed={view === 'weekly'}
                >
                  <LayoutGrid size={13} />
                  Semanal
                </button>
              </div>
            </div>
          </div>

          {/* ── Legend ── */}
          <div style={S.legend}>
            {[
              { label: 'Confirmada', color: '#16a34a' },
              { label: 'Pendiente',  color: '#d97706' },
              { label: 'Cancelada',  color: '#dc2626' },
              { label: 'Conflicto',  color: '#ef4444', dashed: true },
            ].map(({ label, color }) => (
              <div key={label} style={S.legendItem}>
                <span style={S.legendDot(color)} />
                {label}
              </div>
            ))}
            <div style={{ ...S.legendItem, marginLeft: 'auto' }}>
              <span style={{ width: 24, height: 3, borderRadius: 999, background: 'linear-gradient(90deg,#16a34a,#d97706,#dc2626)', display: 'inline-block' }} />
              <span style={{ marginLeft: 5 }}>Barra de ocupación (semanal)</span>
            </div>
          </div>

          {/* ── Calendar view ── */}
          <div style={{ transition: 'opacity 0.2s ease' }}>
            {view === 'daily' ? (
              <DailyCalendar
                selectedDate={dateStr}
                fieldFilter={fieldFilter}
              />
            ) : (
              <WeeklyCalendar
                selectedDate={dateStr}
                fieldFilter={fieldFilter}
              />
            )}
          </div>

        </div>
      </div>
    </AdminLayout>
  )
}
