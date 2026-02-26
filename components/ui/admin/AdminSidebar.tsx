/**
 * GolPlay — AdminSidebar
 * Navegación principal del panel administrativo.
 *
 * - Íconos SVG inline (sin dependencias extra)
 * - Ruta activa destacada con indicador visual
 * - Colapsable en desktop (solo muestra íconos)
 * - Tooltips en estado colapsado
 * - Secciones agrupadas
 * - Rol-aware: admin ve todo, owner ve su subset
 */

import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import { type Role } from './AdminLayout'
import {
  LayoutDashboard, CalendarDays, BookOpen, Dumbbell,
  CreditCard, BarChart2, Settings, LogOut, ChevronLeft,
  ChevronRight, X,
} from 'lucide-react'

// ─── Nav config ───────────────────────────────────────────────────────────────
interface NavItem {
  label: string
  path: string
  icon: React.ElementType
  roles: Role[]
  badge?: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { label: 'Dashboard',       path: '/admin',               icon: LayoutDashboard, roles: ['admin', 'owner'] },
      { label: 'Reservas',        path: '/admin/bookings',       icon: BookOpen,        roles: ['admin', 'owner'] },
      { label: 'Calendario',      path: '/admin/calendar',       icon: CalendarDays,    roles: ['admin', 'owner'] },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { label: 'Canchas',         path: '/admin/fields',         icon: Dumbbell,        roles: ['admin', 'owner'] },
      { label: 'Pagos',           path: '/admin/payments',       icon: CreditCard,      roles: ['admin', 'owner'] },
      { label: 'Modelo negocio',  path: '/admin/business-model', icon: BarChart2,       roles: ['admin', 'owner'] },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { label: 'Configuración',   path: '/admin/settings',       icon: Settings,        roles: ['admin'] },
    ],
  },
]

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  role: Role | null
  collapsed?: boolean
  onToggleCollapse?: () => void
  onClose?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isActive(pathname: string, path: string): boolean {
  if (path === '/admin') return pathname === '/admin'
  return pathname.startsWith(path)
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminSidebar({ role, collapsed = false, onToggleCollapse, onClose }: Props) {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const visibleSections = NAV.map(section => ({
    ...section,
    items: section.items.filter(item => role && item.roles.includes(role)),
  })).filter(s => s.items.length > 0)

  return (
    <aside
      style={{
        ...S.sidebar,
        width: collapsed ? 64 : 240,
        transition: 'width 0.25s cubic-bezier(.4,0,.2,1)',
      }}
      aria-label="Navegación principal"
    >
      {/* ── Logo / Header ── */}
      <div style={{ ...S.logoRow, justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && (
          <div style={S.logoWrap}>
            <div style={S.logoDot} />
            <span style={S.logoText}>GolPlay</span>
          </div>
        )}

        {/* Mobile close */}
        {onClose && (
          <button onClick={onClose} style={S.iconBtn} aria-label="Cerrar menú">
            <X size={18} color="#64748b" />
          </button>
        )}

        {/* Desktop collapse toggle */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            style={S.iconBtn}
            aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed
              ? <ChevronRight size={16} color="#64748b" />
              : <ChevronLeft  size={16} color="#64748b" />}
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav style={S.nav} aria-label="Secciones del panel">
        {visibleSections.map(section => (
          <div key={section.title} style={S.section}>

            {/* Section title — hidden when collapsed */}
            {!collapsed && (
              <p style={S.sectionTitle}>{section.title}</p>
            )}

            {section.items.map(item => {
              const active = isActive(router.pathname, item.path)
              const Icon = item.icon

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  style={{
                    ...S.navItem,
                    ...(active ? S.navItemActive : {}),
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    padding: collapsed ? '10px 0' : '9px 12px',
                  }}
                >
                  {/* Active indicator bar */}
                  {active && !collapsed && <span style={S.activeBar} />}

                  <Icon
                    size={18}
                    color={active ? '#0f172a' : '#64748b'}
                    style={{ flexShrink: 0 }}
                  />

                  {!collapsed && (
                    <span style={{ ...S.navLabel, color: active ? '#0f172a' : '#374151', fontWeight: active ? 600 : 500 }}>
                      {item.label}
                    </span>
                  )}

                  {!collapsed && item.badge && (
                    <span style={S.badge}>{item.badge}</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer / Logout ── */}
      <div style={{ ...S.footer, alignItems: collapsed ? 'center' : 'stretch' }}>
        <div style={S.divider} />
        <button
          onClick={handleLogout}
          style={{
            ...S.logoutBtn,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '10px 0' : '9px 12px',
          }}
          title={collapsed ? 'Cerrar sesión' : undefined}
          aria-label="Cerrar sesión"
        >
          <LogOut size={17} color="#ef4444" style={{ flexShrink: 0 }} />
          {!collapsed && <span style={{ fontSize: 13, fontWeight: 500, color: '#ef4444' }}>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  sidebar: {
    height: '100vh',
    background: '#fff',
    borderRight: '1px solid #f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '18px 16px 14px',
    borderBottom: '1px solid #f8fafc',
    minHeight: 60,
    gap: 8,
  },
  logoWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    flexShrink: 0,
  },
  logoText: {
    fontSize: 17,
    fontWeight: 800,
    color: '#0f172a',
    letterSpacing: '-0.02em',
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  nav: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '4px 12px 6px',
    margin: 0,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    textDecoration: 'none',
    fontSize: 14,
    transition: 'background 0.12s, color 0.12s',
    position: 'relative',
    color: 'inherit',
    width: '100%',
  },
  navItemActive: {
    background: '#f1f5f9',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: '20%',
    height: '60%',
    width: 3,
    borderRadius: '0 3px 3px 0',
    background: '#16a34a',
  },
  navLabel: {
    fontSize: 13,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  badge: {
    marginLeft: 'auto',
    fontSize: 10,
    fontWeight: 700,
    background: '#dcfce7',
    color: '#15803d',
    padding: '2px 6px',
    borderRadius: 999,
  },
  footer: {
    padding: '0 8px 12px',
    display: 'flex',
    flexDirection: 'column',
  },
  divider: {
    height: 1,
    background: '#f1f5f9',
    margin: '8px 4px 8px',
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.12s',
  },
}
