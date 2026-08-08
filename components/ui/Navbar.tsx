/**
 * GolPlay — Navbar (oficial)
 * Desktop: links planos. Mobile: menú hamburguesa con todo.
 * Discovery siempre accesible: Complejos, Retos, Equipos, Mi tarjeta.
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Logo from './Logo'
import styles from './Navbar.module.css'

interface NavbarProps {
  dark?: boolean
}

interface UserState {
  email: string
  role: string
}

export default function Navbar({ dark = false }: NavbarProps) {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<UserState | null>(null)
  const [dropOpen, setDropOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const mobileRef = useRef<HTMLDivElement>(null)

  // ── Load session + role ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) return
      const u = data.session.user
      supabase.from('profiles').select('role').eq('id', u.id).single()
        .then(({ data: p }) => setUser({ email: u.email ?? '', role: p?.role ?? 'user' }))
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) { setUser(null); return }
      const u = session.user
      supabase.from('profiles').select('role').eq('id', u.id).single()
        .then(({ data: p }) => setUser({ email: u.email ?? '', role: p?.role ?? 'user' }))
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  // ── Scroll detection ──
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // ── Click outside (dropdown + mobile menu) ──
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) setMobileOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  // ── Close mobile menu on route change ──
  useEffect(() => {
    const close = () => setMobileOpen(false)
    router.events.on('routeChangeStart', close)
    return () => router.events.off('routeChangeStart', close)
  }, [router.events])

  const isDark = dark && !scrolled
  const navCls = dark
    ? `${styles.nav} ${scrolled ? styles.scrolled : styles.transparent}`
    : `${styles.nav} ${styles.light}`

  const linkCls = isDark ? `${styles.link} ${styles.linkDark}` : `${styles.link} ${styles.linkLight}`
  const keepCls = isDark ? `${styles.link} ${styles.linkDark} ${styles.linkKeep}` : `${styles.link} ${styles.linkLight} ${styles.linkKeep}`

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U'
  const isOwner = user?.role === 'owner' || user?.role === 'admin'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null); setDropOpen(false); setMobileOpen(false)
    router.push('/')
  }

  const roleLabel = user?.role === 'admin' ? 'Administrador'
    : user?.role === 'owner' ? 'Dueño de complejo' : 'Jugador'

  return (
    <nav className={navCls}>
      <Logo dark={isDark} height={100} className={styles.logo} />

      {/* ── Desktop links ── */}
      {user ? (
        <div className={styles.links} style={{ gap: 6 }}>
          <Link href="/reserve"             className={linkCls}>Complejos</Link>
          <Link href="/retos"               className={linkCls}>Retos</Link>
          <Link href="/equipos"             className={linkCls}>Equipos</Link>
          <Link href="/juegos"              className={linkCls}>Juegos</Link>
          <Link href="/jugadores/mi-perfil" className={linkCls}>Mi tarjeta</Link>
          <Link href="/favorites"           className={linkCls}>Favoritos</Link>
          {isOwner && <Link href="/admin" className={linkCls}>Mi negocio</Link>}

          <div ref={dropRef} style={{ position: 'relative' }}>
            <button type="button" onClick={() => setDropOpen(v => !v)} className={styles.avatar} aria-label="Menú de usuario">
              {initials}
            </button>
            {dropOpen && (
              <div className={styles.drop}>
                <div className={styles.dropHead}>
                  <p className={styles.dropEmail}>{user.email}</p>
                  <p className={styles.dropRole}>{roleLabel}</p>
                </div>
                {[
                  { href: '/perfil',              icon: '👤', label: 'Mi perfil' },
                  { href: '/jugadores/mi-perfil', icon: '🃏', label: 'Mi tarjeta' },
                  { href: '/favorites',           icon: '❤️', label: 'Favoritos' },
                  ...(isOwner ? [{ href: '/admin', icon: '🏟️', label: 'Mi negocio' }] : []),
                ].map(item => (
                  <Link key={item.href} href={item.href} onClick={() => setDropOpen(false)} className={styles.dropItem}>
                    <span>{item.icon}</span>{item.label}
                  </Link>
                ))}
                <div className={styles.dropDivider}>
                  <button type="button" onClick={handleSignOut} className={`${styles.dropItem} ${styles.dropItemSignOut}`}>
                    <span>↩</span>Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.links}>
          <Link href="/reserve"             className={linkCls}>Complejos</Link>
          <Link href="/retos"               className={linkCls}>Retos</Link>
          <Link href="/equipos"             className={linkCls}>Equipos</Link>
          <Link href="/juegos"              className={linkCls}>Juegos</Link>
          <Link href="/jugadores/mi-perfil" className={linkCls}>Mi tarjeta</Link>
          <Link href="/login"               className={keepCls}>Iniciar sesión</Link>
          <Link href="/register"            className={styles.cta}>Registrarse</Link>
        </div>
      )}

      {/* ── Mobile hamburger ── */}
      <div className={styles.mobileWrap} ref={mobileRef}>
        <button
          type="button"
          className={`${styles.menuBtn} ${dark ? styles.menuBtnDark : styles.menuBtnLight}`}
          onClick={() => setMobileOpen(v => !v)}
          aria-label="Menú"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          )}
        </button>

        {mobileOpen && (
          <div className={styles.mobileMenu}>
            <Link href="/reserve"             className={styles.mobileItem} onClick={() => setMobileOpen(false)}>🏟️ Complejos</Link>
            <Link href="/retos"               className={styles.mobileItem} onClick={() => setMobileOpen(false)}>⚔️ Retos</Link>
            <Link href="/equipos"             className={styles.mobileItem} onClick={() => setMobileOpen(false)}>🛡️ Equipos</Link>
            <Link href="/juegos"              className={styles.mobileItem} onClick={() => setMobileOpen(false)}>🎮 Juegos</Link>
            <Link href="/jugadores/mi-perfil" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>🃏 Mi tarjeta</Link>

            <div className={styles.mobileSep} />

            {user ? (
              <>
                <Link href="/perfil"    className={styles.mobileItem} onClick={() => setMobileOpen(false)}>👤 Mi perfil</Link>
                <Link href="/favorites" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>❤️ Favoritos</Link>
                {isOwner && <Link href="/admin" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>🏟️ Mi negocio</Link>}
                <button type="button" className={`${styles.mobileItem} ${styles.mobileSignOut}`} onClick={handleSignOut}>↩ Cerrar sesión</button>
              </>
            ) : (
              <>
                <Link href="/login" className={styles.mobileItem} onClick={() => setMobileOpen(false)}>Iniciar sesión</Link>
                <Link href="/register" className={styles.mobileCta} onClick={() => setMobileOpen(false)}>Registrarse</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}