import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

const DayPicker = dynamic(
  () => import('react-day-picker').then((m) => m.DayPicker),
  { ssr: false }
)

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldOption = { id: number; name: string; location: string; sport?: string }
type ActivePanel = 'field' | 'date' | 'hour' | 'sport' | null

// ─── Constants ────────────────────────────────────────────────────────────────

const SPORT_OPTIONS = [
  { value: 'futbol',  label: 'Fútbol',  emoji: '⚽' },
  { value: 'padel',   label: 'Pádel',   emoji: '🎾' },
  { value: 'basquet', label: 'Básquet', emoji: '🏀' },
  { value: 'tenis',   label: 'Tenis',   emoji: '🥎' },
  { value: 'voleibol',label: 'Voleibol',emoji: '🏐' },
  { value: 'otro',    label: 'Otro',    emoji: '🏟️' },
]

const HOURS: string[] = [
  '08:00','09:00','10:00','11:00',
  '12:00','13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00','21:00','22:00',
]

const to12h = (h: string) => {
  const hour24 = Number(h.split(':')[0])
  const period = hour24 >= 12 ? 'pm' : 'am'
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${hour12}:00 ${period}`
}

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase()
}

// ─── Header ───────────────────────────────────────────────────────────────────

export default function Header() {
  const router = useRouter()

  // Auth
  const [user, setUser] = useState<User | null>(null)

  // Scroll
  const lastScrollY = useRef(0)
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)

  // Mobile menu
  const [mobileOpen, setMobileOpen] = useState(false)

  // User dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  // Search state
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [fieldOptions, setFieldOptions] = useState<FieldOption[]>([])
  const [fieldQuery, setFieldQuery] = useState('')
  const [selectedField, setSelectedField] = useState<FieldOption | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedHour, setSelectedHour] = useState<string | null>(null)
  const [selectedSport, setSelectedSport] = useState<string | null>(null)
  const searchBarRef = useRef<HTMLDivElement>(null)

  // ── Auth ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // ── Load field options ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('fields')
      .select('id, name, location, sport')
      .eq('active', true)
      .order('name')
      .then(({ data }) => setFieldOptions(data || []))
  }, [])

  // ── Scroll ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 10)
      setHidden(y > lastScrollY.current && y > 120)
      lastScrollY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Close on route change ─────────────────────────────────────────────────────
  useEffect(() => {
    setMobileOpen(false)
    setDropdownOpen(false)
    setActivePanel(null)
  }, [router.pathname])

  // ── Close dropdown on outside click ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (searchBarRef.current && !searchBarRef.current.contains(e.target as Node)) {
        setActivePanel(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Body scroll lock ──────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // ── Reactive filter: fires whenever any filter changes while on home page ─────
  useEffect(() => {
    // Only auto-filter on the home page and when there's no specific field selected
    if (router.pathname !== '/' || selectedField) return

    const params = new URLSearchParams()
    if (fieldQuery.trim()) params.set('q', fieldQuery.trim())
    if (selectedDate) params.set('date', selectedDate.toISOString().split('T')[0])
    if (selectedHour) params.set('hour', selectedHour)
    if (selectedSport) params.set('sport', selectedSport)

    const qs = params.toString()
    router.replace(qs ? `/?${qs}` : '/', undefined, { shallow: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldQuery, selectedDate, selectedHour, selectedSport])

  // ── Search handler ────────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    setActivePanel(null)

    if (selectedField) {
      // Go directly to field reservation page, carrying date/hour/sport as params
      const params = new URLSearchParams()
      if (selectedDate) params.set('date', selectedDate.toISOString().split('T')[0])
      if (selectedHour) params.set('hour', selectedHour)
      const qs = params.toString()
      router.push(`/reserve/${selectedField.id}${qs ? `?${qs}` : ''}`)
    } else {
      // Filter the home page
      const params = new URLSearchParams()
      if (fieldQuery.trim()) params.set('q', fieldQuery.trim())
      if (selectedDate) params.set('date', selectedDate.toISOString().split('T')[0])
      if (selectedHour) params.set('hour', selectedHour)
      if (selectedSport) params.set('sport', selectedSport)
      router.push(`/?${params.toString()}`, undefined, { shallow: true })
    }
  }, [selectedField, selectedDate, selectedHour, selectedSport, fieldQuery, router])

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut()
    setDropdownOpen(false)
    router.push('/')
  }, [router])

  const filteredFields = fieldOptions.filter((f) =>
    f.name.toLowerCase().includes(fieldQuery.toLowerCase()) ||
    f.location.toLowerCase().includes(fieldQuery.toLowerCase())
  )

  const sportLabel = SPORT_OPTIONS.find((s) => s.value === selectedSport)
  const hasAnyFilter = selectedField || selectedDate || selectedHour || selectedSport || fieldQuery.trim()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');

        .hdr {
          position: sticky;
          top: 0;
          z-index: 200;
          transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
          font-family: 'DM Sans', sans-serif;
          background: white;
        }

        .hdr--hidden { transform: translateY(-100%); }

        .hdr--scrolled {
          background: rgba(255,255,255,0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: 0 1px 0 rgba(0,0,0,0.06), 0 6px 28px rgba(0,0,0,0.07);
        }

        /* ── Top bar ── */
        .hdr__top {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 20px;
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
        }

        .hdr__logo {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          text-decoration: none;
          outline: none;
          border-radius: 8px;
        }

        .hdr__logo:focus-visible { box-shadow: 0 0 0 3px rgba(22,163,74,0.3); }

        .hdr__actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        @media (max-width: 900px) { .hdr__actions--desktop { display: none !important; } }

        .btn {
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          font-family: inherit;
          transition: all 0.15s ease;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
        }

        .btn--ghost { background: transparent; color: #374151; border: 1px solid #e5e7eb; }
        .btn--ghost:hover { background: #f9fafb; border-color: #d1d5db; }

        .btn--primary { background: #16a34a; color: white; box-shadow: 0 2px 8px rgba(22,163,74,0.3); }
        .btn--primary:hover { background: #15803d; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(22,163,74,0.4); }

        .btn--secondary { background: #f1f5f9; color: #374151; }
        .btn--secondary:hover { background: #e2e8f0; }

        /* ── Search bar container ── */
        .hdr__search-wrap {
          border-top: 1px solid #f0f0f0;
          padding: 10px 20px 12px;
          background: inherit;
        }

        /* ── Search bar ── */
        .search-bar {
          max-width: 780px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          background: white;
          border: 1.5px solid #e5e7eb;
          border-radius: 999px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          transition: box-shadow 0.2s, border-color 0.2s;
          position: relative;
        }

        .search-bar--active {
          border-color: #16a34a;
          box-shadow: 0 4px 24px rgba(22,163,74,0.15);
        }

        .search-seg {
          flex: 1;
          padding: 10px 20px;
          cursor: pointer;
          border-radius: 999px;
          transition: background 0.15s;
          min-width: 0;
          position: relative;
        }

        .search-seg:hover { background: #f9fafb; }
        .search-seg--active { background: white; box-shadow: 0 2px 16px rgba(0,0,0,0.12); z-index: 2; }

        .search-seg__label {
          font-size: 11px;
          font-weight: 700;
          color: #111;
          letter-spacing: 0.03em;
          display: block;
          margin-bottom: 1px;
        }

        .search-seg__value {
          font-size: 13px;
          color: #6b7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .search-seg__value--filled {
          color: #111;
          font-weight: 500;
        }

        .search-divider {
          width: 1px;
          height: 28px;
          background: #e5e7eb;
          flex-shrink: 0;
        }

        .search-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: none;
          background: #16a34a;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          margin-right: 5px;
          transition: background 0.15s, transform 0.15s;
          flex-shrink: 0;
          box-shadow: 0 2px 10px rgba(22,163,74,0.35);
        }

        .search-btn:hover { background: #15803d; transform: scale(1.05); }

        /* ── Dropdown panels ── */
        .search-panel {
          position: absolute;
          top: calc(100% + 10px);
          background: white;
          border-radius: 24px;
          box-shadow: 0 8px 16px rgba(0,0,0,0.08), 0 24px 56px rgba(0,0,0,0.14);
          border: 1px solid #f0f0f0;
          z-index: 500;
          animation: panelIn 0.18s ease;
          overflow: hidden;
        }

        @keyframes panelIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .search-panel--field { left: 0; width: 340px; padding: 16px; }
        .search-panel--date  { left: 50%; transform: translateX(-50%); padding: 12px; }
        .search-panel--date.open { transform: translateX(-50%) scale(1); }
        .search-panel--hour  { left: 50%; transform: translateX(-50%); width: 320px; padding: 16px; }
        .search-panel--sport { right: 60px; width: 300px; padding: 16px; }

        .panel__title {
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .field-search-input {
          width: 100%;
          padding: 11px 14px;
          border-radius: 12px;
          border: 1.5px solid #e5e7eb;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          margin-bottom: 10px;
          transition: border-color 0.15s;
          background: #fafafa;
        }

        .field-search-input:focus { border-color: #16a34a; background: white; }

        .field-list { max-height: 220px; overflow-y: auto; }

        .field-option {
          padding: 10px 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.12s;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .field-option:hover { background: #f0fdf4; }
        .field-option--selected { background: #f0fdf4; }

        .field-option__icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #dcfce7;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }

        .field-option__name { font-size: 14px; font-weight: 600; color: #111; }
        .field-option__loc  { font-size: 12px; color: #9ca3af; }

        .field-option--clear {
          border-top: 1px solid #f0f0f0;
          margin-top: 6px;
          padding-top: 10px;
          color: #ef4444;
          font-size: 13px;
          font-weight: 600;
        }

        .field-option--clear:hover { background: #fef2f2; }

        /* Hour grid */
        .hour-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }

        .hour-chip {
          padding: 9px 6px;
          border-radius: 10px;
          border: 1.5px solid #e5e7eb;
          font-size: 12px;
          font-weight: 600;
          text-align: center;
          cursor: pointer;
          transition: all 0.12s;
          font-family: inherit;
          background: white;
          color: #374151;
        }

        .hour-chip:hover { border-color: #16a34a; color: #16a34a; background: #f0fdf4; }
        .hour-chip--selected { background: #16a34a; border-color: #16a34a; color: white; box-shadow: 0 2px 8px rgba(22,163,74,0.3); }

        /* Sport grid */
        .sport-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .sport-chip {
          padding: 12px 8px;
          border-radius: 14px;
          border: 1.5px solid #e5e7eb;
          text-align: center;
          cursor: pointer;
          transition: all 0.12s;
          font-family: inherit;
          background: white;
        }

        .sport-chip:hover { border-color: #16a34a; background: #f0fdf4; }
        .sport-chip--selected { border-color: #16a34a; background: #f0fdf4; box-shadow: 0 2px 8px rgba(22,163,74,0.2); }

        .sport-chip__emoji { font-size: 22px; display: block; margin-bottom: 4px; }
        .sport-chip__label { font-size: 12px; font-weight: 600; color: #374151; }
        .sport-chip--selected .sport-chip__label { color: #16a34a; }

        /* Active filter indicator */
        .filter-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #16a34a;
          display: inline-block;
          margin-left: 4px;
          vertical-align: middle;
        }

        /* ── Avatar & Dropdown ── */
        .avatar-wrap { position: relative; }

        .avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #16a34a, #0f6930);
          color: white;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: 2px solid transparent;
          transition: border-color 0.15s, box-shadow 0.15s;
          font-family: inherit;
        }

        .avatar:hover, .avatar--open {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22,163,74,0.15);
        }

        .dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.06), 0 16px 40px rgba(0,0,0,0.12);
          border: 1px solid #f0f0f0;
          padding: 8px;
          min-width: 200px;
          z-index: 300;
          animation: dropIn 0.18s ease;
        }

        @keyframes dropIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .dropdown__email {
          padding: 10px 12px 8px;
          font-size: 12px;
          color: #9ca3af;
          border-bottom: 1px solid #f3f4f6;
          margin-bottom: 6px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .dropdown__item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          text-decoration: none;
          transition: background 0.12s;
          border: none;
          background: transparent;
          width: 100%;
          font-family: inherit;
          text-align: left;
        }

        .dropdown__item:hover { background: #f9fafb; color: #0f172a; }
        .dropdown__item--danger { color: #ef4444; }
        .dropdown__item--danger:hover { background: #fef2f2; color: #dc2626; }
        .dropdown__divider { height: 1px; background: #f3f4f6; margin: 6px 0; }

        /* ── Hamburger ── */
        .hamburger {
          display: none;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          width: 40px;
          height: 40px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 10px;
          transition: background 0.15s;
          padding: 0;
          flex-shrink: 0;
        }

        .hamburger:hover { background: #f3f4f6; }
        @media (max-width: 900px) { .hamburger { display: flex; } }

        .hamburger__line {
          width: 22px; height: 2px;
          background: #374151;
          border-radius: 2px;
          transition: transform 0.25s ease, opacity 0.25s ease;
          transform-origin: center;
        }

        .hamburger--open .hamburger__line:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .hamburger--open .hamburger__line:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .hamburger--open .hamburger__line:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        /* ── Mobile menu ── */
        .mobile-menu {
          display: none;
          position: fixed;
          inset: 0;
          top: 64px;
          background: white;
          z-index: 190;
          flex-direction: column;
          padding: 16px 20px 32px;
          overflow-y: auto;
          animation: slideDown 0.22s ease;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .mobile-menu--open { display: flex; }
        @media (min-width: 901px) { .mobile-menu { display: none !important; } }

        .mobile-menu__nav { display: flex; flex-direction: column; gap: 2px; margin-bottom: 24px; }

        .mobile-menu__divider { height: 1px; background: #f3f4f6; margin: 12px 0; }
        .mobile-menu__actions { display: flex; flex-direction: column; gap: 10px; }

        .mobile-menu__user {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: #f9fafb;
          border-radius: 14px;
          margin-bottom: 16px;
        }

        .mobile-menu__user-info { flex: 1; overflow: hidden; }
        .mobile-menu__user-email { font-size: 12px; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .btn--full { width: 100%; justify-content: center; padding: 14px; font-size: 15px; }

        /* Mobile search */
        .mobile-search {
          background: #f9fafb;
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .mobile-search__label {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 4px;
        }

        .mobile-search__input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1.5px solid #e5e7eb;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          background: white;
        }

        .mobile-search__input:focus { border-color: #16a34a; }

        .mobile-search__row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .mobile-search__select {
          padding: 11px 12px;
          border-radius: 12px;
          border: 1.5px solid #e5e7eb;
          font-size: 13px;
          font-family: inherit;
          outline: none;
          background: white;
          color: #374151;
          cursor: pointer;
          -webkit-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 10px center;
          padding-right: 28px;
        }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header
        className={`hdr ${hidden ? 'hdr--hidden' : ''} ${scrolled ? 'hdr--scrolled' : ''}`}
        role="banner"
      >
        {/* Top bar */}
        <div className="hdr__top">
          <Link href="/" className="hdr__logo" aria-label="GolPlay - Inicio">
            <Image src="/logo-golplay.svg" alt="GolPlay" width={100} height={270} priority />
          </Link>

          <div className="hdr__actions hdr__actions--desktop">
            {user ? (
              <AuthenticatedActions
              user={user}
              dropdownOpen={dropdownOpen}
              setDropdownOpen={setDropdownOpen}
              dropdownRef={dropdownRef}
              onSignOut={handleSignOut}
              router={router}
            />
            ) : (
              <>
                <button className="btn btn--ghost" onClick={() => router.push('/login')}>Iniciar sesión</button>
                <button className="btn btn--primary" onClick={() => router.push('/register')}>Registrarse</button>
              </>
            )}
          </div>

          <button
            className={`hamburger ${mobileOpen ? 'hamburger--open' : ''}`}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            <span className="hamburger__line" />
            <span className="hamburger__line" />
            <span className="hamburger__line" />
          </button>
        </div>

        {/* ── SEARCH BAR ──────────────────────────────────────────────────── */}
        <div className="hdr__search-wrap">
          <div
            ref={searchBarRef}
            className={`search-bar ${activePanel ? 'search-bar--active' : ''}`}
            role="search"
            aria-label="Buscador de canchas"
          >

            {/* Segment: Cancha / Ubicación */}
            <div
              className={`search-seg ${activePanel === 'field' ? 'search-seg--active' : ''}`}
              style={{ flex: 1.4 }}
              onClick={() => setActivePanel(activePanel === 'field' ? null : 'field')}
              role="button"
              tabIndex={0}
              aria-label="Seleccionar cancha o ubicación"
              onKeyDown={(e) => e.key === 'Enter' && setActivePanel('field')}
            >
              <span className="search-seg__label">Cancha / Lugar</span>
              <span className={`search-seg__value ${(selectedField || fieldQuery.trim()) ? 'search-seg__value--filled' : ''}`}>
                {selectedField
                  ? selectedField.name
                  : fieldQuery.trim()
                  ? `"${fieldQuery.trim()}"`
                  : 'Buscá por nombre o zona'}
                {(selectedField || fieldQuery.trim()) && <span className="filter-dot" />}
              </span>

              {activePanel === 'field' && (
                <div className="search-panel search-panel--field">
                  <p className="panel__title">Canchas disponibles</p>
                  <input
                    className="field-search-input"
                    placeholder="Buscar cancha o zona..."
                    value={fieldQuery}
                    onChange={(e) => setFieldQuery(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  <div className="field-list">
                    {/* Free-search option: filter home without selecting a specific field */}
                    {fieldQuery.trim() && !selectedField && (
                      <div
                        className="field-option"
                        style={{ background: '#f0fdf4', marginBottom: 6, border: '1.5px solid #bbf7d0', borderRadius: 12 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          setActivePanel(null)
                          // reactive effect will push the filter
                        }}
                      >
                        <div className="field-option__icon" style={{ background: '#dcfce7' }}>🔍</div>
                        <div>
                          <p className="field-option__name" style={{ color: '#15803d' }}>Buscar "{fieldQuery.trim()}"</p>
                          <p className="field-option__loc" style={{ color: '#16a34a' }}>Filtrar resultados en la página</p>
                        </div>
                      </div>
                    )}
                    {filteredFields.length === 0 && !fieldQuery.trim() && (
                      <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>
                        Escribí para buscar canchas
                      </p>
                    )}
                    {filteredFields.length === 0 && fieldQuery.trim() && (
                      <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '4px 0 12px' }}>
                        Sin canchas con ese nombre exacto
                      </p>
                    )}
                    {filteredFields.map((f) => (
                      <div
                        key={f.id}
                        className={`field-option ${selectedField?.id === f.id ? 'field-option--selected' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedField(f)
                          setFieldQuery('')
                          setActivePanel('date')
                        }}
                      >
                        <div className="field-option__icon">⚽</div>
                        <div>
                          <p className="field-option__name">{f.name}</p>
                          <p className="field-option__loc">📍 {f.location}</p>
                        </div>
                      </div>
                    ))}
                    {selectedField && (
                      <div
                        className="field-option field-option--clear"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedField(null)
                          setFieldQuery('')
                        }}
                      >
                        ✕ Limpiar selección
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="search-divider" />

            {/* Segment: Fecha */}
            <div
              className={`search-seg ${activePanel === 'date' ? 'search-seg--active' : ''}`}
              onClick={() => setActivePanel(activePanel === 'date' ? null : 'date')}
              role="button"
              tabIndex={0}
              aria-label="Seleccionar fecha"
              onKeyDown={(e) => e.key === 'Enter' && setActivePanel('date')}
            >
              <span className="search-seg__label">Fecha</span>
              <span className={`search-seg__value ${selectedDate ? 'search-seg__value--filled' : ''}`}>
                {selectedDate
                  ? selectedDate.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })
                  : 'Cualquier día'}
                {selectedDate && <span className="filter-dot" />}
              </span>

              {activePanel === 'date' && (
                <div className="search-panel search-panel--date" onClick={(e) => e.stopPropagation()}>
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    disabled={{ before: new Date() }}
                    onSelect={(d) => {
                      setSelectedDate(d)
                      setActivePanel('hour')
                    }}
                  />
                  {selectedDate && (
                    <button
                      onClick={() => setSelectedDate(undefined)}
                      style={{ display: 'block', margin: '0 auto 8px', fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      ✕ Limpiar fecha
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="search-divider" />

            {/* Segment: Hora */}
            <div
              className={`search-seg ${activePanel === 'hour' ? 'search-seg--active' : ''}`}
              onClick={() => setActivePanel(activePanel === 'hour' ? null : 'hour')}
              role="button"
              tabIndex={0}
              aria-label="Seleccionar hora"
              onKeyDown={(e) => e.key === 'Enter' && setActivePanel('hour')}
            >
              <span className="search-seg__label">Hora</span>
              <span className={`search-seg__value ${selectedHour ? 'search-seg__value--filled' : ''}`}>
                {selectedHour ? to12h(selectedHour) : 'Cualquier hora'}
                {selectedHour && <span className="filter-dot" />}
              </span>

              {activePanel === 'hour' && (
                <div className="search-panel search-panel--hour" onClick={(e) => e.stopPropagation()}>
                  <p className="panel__title">Elegí el horario</p>
                  <div className="hour-grid">
                    {HOURS.map((h) => (
                      <button
                        key={h}
                        className={`hour-chip ${selectedHour === h ? 'hour-chip--selected' : ''}`}
                        onClick={() => {
                          setSelectedHour(selectedHour === h ? null : h)
                          setActivePanel('sport')
                        }}
                      >
                        {to12h(h)}
                      </button>
                    ))}
                  </div>
                  {selectedHour && (
                    <button
                      onClick={() => setSelectedHour(null)}
                      style={{ display: 'block', margin: '10px auto 0', fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      ✕ Limpiar hora
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="search-divider" />

            {/* Segment: Deporte */}
            <div
              className={`search-seg ${activePanel === 'sport' ? 'search-seg--active' : ''}`}
              onClick={() => setActivePanel(activePanel === 'sport' ? null : 'sport')}
              role="button"
              tabIndex={0}
              aria-label="Seleccionar deporte"
              onKeyDown={(e) => e.key === 'Enter' && setActivePanel('sport')}
            >
              <span className="search-seg__label">Deporte</span>
              <span className={`search-seg__value ${selectedSport ? 'search-seg__value--filled' : ''}`}>
                {sportLabel ? `${sportLabel.emoji} ${sportLabel.label}` : 'Cualquiera'}
                {selectedSport && <span className="filter-dot" />}
              </span>

              {activePanel === 'sport' && (
                <div className="search-panel search-panel--sport" onClick={(e) => e.stopPropagation()}>
                  <p className="panel__title">Tipo de deporte</p>
                  <div className="sport-grid">
                    {SPORT_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        className={`sport-chip ${selectedSport === s.value ? 'sport-chip--selected' : ''}`}
                        onClick={() => {
                          setSelectedSport(selectedSport === s.value ? null : s.value)
                          setActivePanel(null)
                        }}
                      >
                        <span className="sport-chip__emoji">{s.emoji}</span>
                        <span className="sport-chip__label">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Search button */}
            <button
              className="search-btn"
              onClick={handleSearch}
              aria-label="Buscar canchas"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 21L16.65 16.65M10 18C5.58 18 2 14.42 2 10C2 5.58 5.58 2 10 2C14.42 2 18 5.58 18 10C18 14.42 14.42 18 10 18Z" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Active filters summary */}
          {hasAnyFilter && (
            <div style={{ maxWidth: 780, margin: '8px auto 0', display: 'flex', gap: 8, flexWrap: 'wrap', paddingLeft: 4 }}>
              {fieldQuery.trim() && !selectedField && (
                <span style={{ fontSize: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '3px 10px', borderRadius: 999, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  🔍 "{fieldQuery.trim()}"
                  <button onClick={() => setFieldQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                </span>
              )}
              {selectedField && (
                <span style={{ fontSize: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '3px 10px', borderRadius: 999, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ⚽ {selectedField.name}
                  <button onClick={() => setSelectedField(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                </span>
              )}
              {selectedDate && (
                <span style={{ fontSize: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '3px 10px', borderRadius: 999, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  📅 {selectedDate.toLocaleDateString('es-CR', { day: 'numeric', month: 'short' })}
                  <button onClick={() => setSelectedDate(undefined)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                </span>
              )}
              {selectedHour && (
                <span style={{ fontSize: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '3px 10px', borderRadius: 999, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  🕐 {to12h(selectedHour)}
                  <button onClick={() => setSelectedHour(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                </span>
              )}
              {selectedSport && sportLabel && (
                <span style={{ fontSize: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', padding: '3px 10px', borderRadius: 999, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {sportLabel.emoji} {sportLabel.label}
                  <button onClick={() => setSelectedSport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                </span>
              )}
              <button
                onClick={() => { setSelectedField(null); setSelectedDate(undefined); setSelectedHour(null); setSelectedSport(null); setFieldQuery(''); router.push('/') }}
                style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '3px 6px' }}
              >
                Limpiar todo
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── MOBILE MENU ────────────────────────────────────────────────────── */}
      <nav
        id="mobile-menu"
        className={`mobile-menu ${mobileOpen ? 'mobile-menu--open' : ''}`}
        aria-label="Menú móvil"
        aria-hidden={!mobileOpen}
      >
        {user && (
          <div className="mobile-menu__user">
            <div className="avatar" style={{ flexShrink: 0 }}>{getInitials(user.email ?? 'U')}</div>
            <div className="mobile-menu__user-info">
              <p className="mobile-menu__user-email">{user.email}</p>
            </div>
          </div>
        )}

        {/* Mobile search */}
        <div className="mobile-search">
          <p className="mobile-search__label">🔍 Buscar cancha</p>
          <input
            className="mobile-search__input"
            placeholder="Nombre o zona..."
            value={fieldQuery}
            onChange={(e) => setFieldQuery(e.target.value)}
          />
          <div className="mobile-search__row">
            <select
              className="mobile-search__select"
              value={selectedSport ?? ''}
              onChange={(e) => setSelectedSport(e.target.value || null)}
            >
              <option value="">🏟️ Deporte</option>
              {SPORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>
              ))}
            </select>
            <select
              className="mobile-search__select"
              value={selectedHour ?? ''}
              onChange={(e) => setSelectedHour(e.target.value || null)}
            >
              <option value="">🕐 Hora</option>
              {HOURS.map((h) => (
                <option key={h} value={h}>{to12h(h)}</option>
              ))}
            </select>
          </div>
          <button
            className="btn btn--primary btn--full"
            style={{ marginTop: 4 }}
            onClick={() => { handleSearch(); setMobileOpen(false) }}
          >
            Buscar canchas
          </button>
        </div>

        <div className="mobile-menu__nav">
          {user && (
            <>
              <Link href="/reservas" className="mobile-nav__link" onClick={() => setMobileOpen(false)}>
                Mis reservas <span>›</span>
              </Link>
              <Link href="/admin" className="mobile-nav__link" onClick={() => setMobileOpen(false)}>
                Mi negocio <span>›</span>
              </Link>
            </>
          )}
        </div>

        <div className="mobile-menu__divider" />
        <div className="mobile-menu__actions">
          {user ? (
            <button className="btn btn--ghost btn--full" onClick={handleSignOut}>Cerrar sesión</button>
          ) : (
            <>
              <button className="btn btn--ghost btn--full" onClick={() => { router.push('/login'); setMobileOpen(false) }}>Iniciar sesión</button>
              <button className="btn btn--primary btn--full" onClick={() => { router.push('/register'); setMobileOpen(false) }}>Registrarse gratis</button>
            </>
          )}
        </div>
      </nav>
    </>
  )
}

// ─── Authenticated Actions ────────────────────────────────────────────────────

function AuthenticatedActions({
  user, dropdownOpen, setDropdownOpen, dropdownRef, onSignOut, router,
}: {
  user: User
  dropdownOpen: boolean
  setDropdownOpen: (v: boolean) => void
  dropdownRef: React.RefObject<HTMLDivElement | null>
  onSignOut: () => void
  router: ReturnType<typeof useRouter>
}) {
  return (
    <>
      <button className="btn btn--secondary" onClick={() => router.push('/admin')}>Mi negocio</button>
      <div className="avatar-wrap" ref={dropdownRef}>
        <button
          className={`avatar ${dropdownOpen ? 'avatar--open' : ''}`}
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-label="Menú de usuario"
          aria-expanded={dropdownOpen}
          aria-haspopup="true"
        >
          {getInitials(user.email ?? 'U')}
        </button>
        {dropdownOpen && (
          <div className="dropdown" role="menu">
            <p className="dropdown__email">{user.email}</p>
            <Link href="/reservas" className="dropdown__item" role="menuitem" onClick={() => setDropdownOpen(false)}>
              <span>📅</span> Mis reservas
            </Link>
            <Link href="/admin" className="dropdown__item" role="menuitem" onClick={() => setDropdownOpen(false)}>
              <span>🏟️</span> Mi negocio
            </Link>
            <Link href="/perfil" className="dropdown__item" role="menuitem" onClick={() => setDropdownOpen(false)}>
              <span>👤</span> Perfil
            </Link>
            <div className="dropdown__divider" />
            <button className="dropdown__item dropdown__item--danger" role="menuitem" onClick={onSignOut}>
              <span>↩</span> Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </>
  )
}
