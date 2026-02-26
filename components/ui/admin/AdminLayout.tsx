/**
 * GolPlay — AdminLayout
 * Estructura principal del panel administrativo.
 * 
 * - Auth + role guard centralizado (no duplicar en cada página)
 * - Sidebar fija en desktop, drawer en móvil
 * - Sidebar colapsable con persistencia en localStorage
 * - Inyecta role + userId a children como render prop (opcional)
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'

export type Role = 'admin' | 'owner'

interface AdminLayoutProps {
  children: React.ReactNode | ((ctx: { role: Role; userId: string }) => React.ReactNode)
}

interface UserContext {
  role: Role
  userId: string
  email: string
  name: string
}

// ─── Breakpoint ───────────────────────────────────────────────────────────────
const DESKTOP_BP = 768

// ─── Sidebar width constants ──────────────────────────────────────────────────
export const SIDEBAR_EXPANDED  = 240
export const SIDEBAR_COLLAPSED = 64

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()

  // Auth state
  const [ctx, setCtx] = useState<UserContext | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Sidebar state
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })
  const [isDesktop, setIsDesktop] = useState(false)

  // ── Auth + role guard (centralizado aquí, no repetir en páginas) ──
  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || !profile || !['admin', 'owner'].includes(profile.role)) {
        router.replace('/login')
        return
      }

      setCtx({
        role: profile.role as Role,
        userId: user.id,
        email: user.email ?? '',
        name: user.user_metadata?.full_name ?? user.email ?? 'Usuario',
      })
      setAuthChecked(true)
    }
    check()
  }, [router])

  // ── Responsive detection ──
  useEffect(() => {
    const check = () => {
      const desktop = window.innerWidth >= DESKTOP_BP
      setIsDesktop(desktop)
      if (desktop) setMobileOpen(false)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Collapse toggle with persistence ──
  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }, [])

  // ── Close drawer on route change ──
  useEffect(() => {
    setMobileOpen(false)
  }, [router.pathname])

  // ── Prevent body scroll when drawer open ──
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // ── Block render until auth resolves ──
  if (!authChecked || !ctx) return null

  const sidebarWidth = isDesktop
    ? (collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED)
    : 0

  return (
    <div style={S.root}>

      {/* ── Desktop sidebar ── */}
      {isDesktop && (
        <div style={{
          ...S.sidebarWrapper,
          width: sidebarWidth,
          transition: 'width 0.25s cubic-bezier(.4,0,.2,1)',
        }}>
          <AdminSidebar
            role={ctx.role}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapse}
          />
        </div>
      )}

      {/* ── Mobile drawer ── */}
      {!isDesktop && mobileOpen && (
        <div
          style={S.overlay}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        >
          <div
            style={S.drawer}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Menú de navegación"
          >
            <AdminSidebar
              role={ctx.role}
              collapsed={false}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* ── Main area ── */}
      <div style={{ ...S.main, marginLeft: 0 }}>

        {/* Topbar — always visible */}
        <AdminTopbar
          userName={ctx.name}
          userEmail={ctx.email}
          role={ctx.role}
          onMenu={() => setMobileOpen(true)}
          showMenu={!isDesktop}
        />

        {/* Page content */}
        <main style={S.content}>
          {typeof children === 'function'
            ? children({ role: ctx.role, userId: ctx.userId })
            : children}
        </main>

      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f8fafc',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  sidebarWrapper: {
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    height: '100vh',
    overflowX: 'hidden',
    zIndex: 20,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,.45)',
    backdropFilter: 'blur(3px)',
    zIndex: 100,
    display: 'flex',
  },
  drawer: {
    width: SIDEBAR_EXPANDED,
    height: '100%',
    background: '#fff',
    boxShadow: '4px 0 24px rgba(0,0,0,.12)',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0, // prevents flex overflow
  },
  content: {
    flex: 1,
    padding: '24px 24px',
  },
}
