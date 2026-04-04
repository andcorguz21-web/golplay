/**
 * GolPlay — AdminTopbar
 * Barra superior del panel administrativo.
 *
 * - Breadcrumbs automáticos basados en la ruta
 * - Avatar del usuario con iniciales
 * - Dropdown con perfil + cerrar sesión
 * - Badge de rol (Admin / Propietario)
 * - Botón hamburguesa solo en móvil
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { type Role } from './AdminLayout'
import { Menu, ChevronRight, LogOut, User, ChevronDown } from 'lucide-react'

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  userName: string
  userEmail: string
  role: Role
  onMenu: () => void
  showMenu: boolean
}

// ─── Breadcrumb config ────────────────────────────────────────────────────────
const ROUTE_LABELS: Record<string, string> = {
  'admin':           'Dashboard',
  'bookings':        'Reservas',
  'calendar':        'Calendario',
  'fields':          'Canchas',
  'payments':        'Pagos',
  'business-model':  'Modelo de negocio',
  'settings':        'Configuración',
  'new':             'Nuevo',
  'edit':            'Editar',
}

const ROLE_LABELS: Record<Role, { label: string; color: string; bg: string }> = {
  admin: { label: 'Administrador', color: '#1d4ed8', bg: '#eff6ff' },
  owner: { label: 'Propietario',   color: '#15803d', bg: '#f0fdf4' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?'
}

function useBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  // Skip 'admin' as root, show from index 1
  return segments.slice(1).map((seg, i) => ({
    label: ROUTE_LABELS[seg] ?? seg,
    path: '/' + segments.slice(0, i + 2).join('/'),
    isLast: i === segments.length - 2,
  }))
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminTopbar({ userName, userEmail, role, onMenu, showMenu }: Props) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const breadcrumbs = useBreadcrumbs(router.pathname)
  const roleCfg = ROLE_LABELS[role]

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  // Close on route change
  useEffect(() => { setMenuOpen(false) }, [router.pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <header style={S.topbar} role="banner">

      <div style={S.left}>
        {/* Hamburger — mobile only */}
        {showMenu && (
          <button
            onClick={onMenu}
            style={S.iconBtn}
            aria-label="Abrir menú"
          >
            <Menu size={20} color="#374151" />
          </button>
        )}

        {/* Breadcrumbs */}
        <nav style={S.breadcrumbs} aria-label="Ruta de navegación">
          <Link href="/admin" style={S.breadcrumbRoot}>
            Dashboard
          </Link>

          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ChevronRight size={13} color="#cbd5e1" />
              {crumb.isLast ? (
                <span style={S.breadcrumbCurrent}>{crumb.label}</span>
              ) : (
                <Link href={crumb.path} style={S.breadcrumbLink}>
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* ── Right: user area ── */}
      <div style={S.right}>

        {/* Role badge */}
        <span style={{ ...S.roleBadge, color: roleCfg.color, background: roleCfg.bg }}>
          {roleCfg.label}
        </span>

        {/* User menu */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            style={S.avatarBtn}
            aria-label="Menú de usuario"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            {/* Avatar */}
            <div style={S.avatar}>
              <span style={S.avatarText}>{getInitials(userName)}</span>
            </div>

            {/* Name — hidden on small screens via inline conditional */}
            <span style={S.userName}>{userName.split(' ')[0]}</span>
            <ChevronDown
              size={13}
              color="#64748b"
              style={{ transform: menuOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}
            />
          </button>

          {/* Dropdown */}
          {menuOpen && (
            <div
              style={S.dropdown}
              role="menu"
              aria-label="Opciones de usuario"
            >
              {/* User info */}
              <div style={S.dropdownHeader}>
                <div style={{ ...S.avatar, width: 36, height: 36, fontSize: 14 }}>
                  <span style={S.avatarText}>{getInitials(userName)}</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={S.dropdownName}>{userName}</p>
                  <p style={S.dropdownEmail}>{userEmail}</p>
                </div>
              </div>

              <div style={S.dropdownDivider} />

              {/* Menu items */}
              <button
                onClick={() => { router.push('/admin/profile'); setMenuOpen(false) }}
                style={S.dropdownItem}
                role="menuitem"
              >
                <User size={14} color="#64748b" />
                Mi perfil
              </button>

              <div style={S.dropdownDivider} />

              <button
                onClick={handleLogout}
                style={{ ...S.dropdownItem, color: '#dc2626' }}
                role="menuitem"
              >
                <LogOut size={14} color="#dc2626" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  topbar: {
    height: 56,
    background: '#fff',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    gap: 16,
    position: 'sticky',
    top: 0,
    zIndex: 10,
    flexShrink: 0,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    flex: 1,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  breadcrumbs: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
    overflow: 'hidden',
  },
  breadcrumbRoot: {
    fontSize: 13,
    color: '#94a3b8',
    textDecoration: 'none',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  breadcrumbLink: {
    fontSize: 13,
    color: '#94a3b8',
    textDecoration: 'none',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  breadcrumbCurrent: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  roleBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 999,
    whiteSpace: 'nowrap',
  },
  avatarBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '5px 8px 5px 5px',
    borderRadius: 10,
    border: '1px solid #f1f5f9',
    background: '#fff',
    cursor: 'pointer',
    transition: 'background 0.12s',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '0.02em',
  },
  userName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#0f172a',
    maxWidth: 100,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dropdown: {
    position: 'absolute',
    top: 42,
    right: 0,
    width: 220,
    background: '#fff',
    borderRadius: 14,
    border: '1px solid #f1f5f9',
    boxShadow: '0 12px 40px rgba(0,0,0,.12)',
    overflow: 'hidden',
    zIndex: 50,
    animation: 'fadeIn 0.12s ease',
  },
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 14px 12px',
  },
  dropdownName: {
    fontSize: 13,
    fontWeight: 600,
    color: '#0f172a',
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dropdownEmail: {
    fontSize: 11,
    color: '#94a3b8',
    margin: '2px 0 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dropdownDivider: {
    height: 1,
    background: '#f8fafc',
    margin: '0 4px',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    width: '100%',
    padding: '10px 14px',
    fontSize: 13,
    fontWeight: 500,
    color: '#374151',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.1s',
  },
}
  