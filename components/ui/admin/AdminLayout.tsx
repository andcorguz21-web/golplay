/**
 * GolPlay — AdminLayout
 * v3.0: Incluye FAB flotante para crear reservas desde cualquier página admin.
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'
import AdminSidebar from './AdminSidebar'
import AdminTopbar from './AdminTopbar'
import CreateBookingModal from './CreateBookingModal'

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

const DESKTOP_BP = 768
export const SIDEBAR_EXPANDED  = 240
export const SIDEBAR_COLLAPSED = 64

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()

  const [ctx, setCtx] = useState<UserContext | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('sidebar_collapsed') === 'true'
  })
  const [isDesktop, setIsDesktop] = useState(false)

  // FAB state
  const [showBookingModal, setShowBookingModal] = useState(false)

  // ── Auth + role guard ──
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

  // ── Responsive ──
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

  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar_collapsed', String(next))
      return next
    })
  }, [])

  useEffect(() => { setMobileOpen(false) }, [router.pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

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

        <AdminTopbar
          userName={ctx.name}
          userEmail={ctx.email}
          role={ctx.role}
          onMenu={() => setMobileOpen(true)}
          showMenu={!isDesktop}
        />

        <main style={S.content}>
          {typeof children === 'function'
            ? children({ role: ctx.role, userId: ctx.userId })
            : children}
        </main>

      </div>

      {/* ── FAB: Nueva reserva ── */}
      <style>{FAB_CSS}</style>
      <button
        className="gp-fab"
        onClick={() => setShowBookingModal(true)}
        aria-label="Nueva reserva"
        title="Nueva reserva"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>

      {/* ── Create Booking Modal ── */}
      {showBookingModal && (
        <CreateBookingModal
          userId={ctx.userId}
          onClose={() => setShowBookingModal(false)}
          onCreated={() => {
            setShowBookingModal(false)
            // Reload current page to reflect new booking
            router.replace(router.asPath)
          }}
        />
      )}
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
    minWidth: 0,
  },
  content: {
    flex: 1,
    padding: '24px 24px',
  },
}

// ─── FAB CSS ──────────────────────────────────────────────────────────────────
const FAB_CSS = `
@keyframes gpFabIn { from { opacity: 0; transform: scale(.8) translateY(10px); } to { opacity: 1; transform: none; } }

.gp-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 90;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(22,163,74,.4), 0 2px 8px rgba(0,0,0,.1);
  transition: all .2s cubic-bezier(.4,0,.2,1);
  animation: gpFabIn .3s ease both .5s;
}
.gp-fab:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 8px 32px rgba(22,163,74,.5), 0 4px 12px rgba(0,0,0,.15);
}
.gp-fab:active {
  transform: scale(.95);
}

@media (max-width: 640px) {
  .gp-fab {
    bottom: 20px;
    right: 20px;
    width: 52px;
    height: 52px;
    border-radius: 14px;
  }
}
`
