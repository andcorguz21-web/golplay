/**
 * GolPlay — Navbar (oficial)
 *
 * Reemplaza el Navbar de equipos. Variantes:
 *   - dark=true  → transparent over hero, dark when scrolled (uso: index, marketing dark)
 *   - dark=false → light bone background (uso: app interna sobre bone, marketing light)
 *
 * Si hay sesión activa: muestra links + avatar dropdown.
 * Si no hay sesión: muestra links + "Iniciar sesión" + CTA "Registrarse".
 *
 * Lee `profiles.role` para mostrar el link "Mi negocio" a owners/admin.
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Logo from './Logo'
import styles from './Navbar.module.css'

interface NavbarProps {
  /** If true, navbar is transparent over dark backgrounds and turns dark on scroll. Default false (light variant). */
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
  const dropRef = useRef<HTMLDivElement>(null)

  // ── Load session + role ─────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) return
      const u = data.session.user
      supabase
        .from('profiles')
        .select('role')
        .eq('id', u.id)
        .single()
        .then(({ data: p }) => {
          setUser({ email: u.email ?? '', role: p?.role ?? 'user' })
        })
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) {
        setUser(null)
        return
      }
      const u = session.user
      supabase
        .from('profiles')
        .select('role')
        .eq('id', u.id)
        .single()
        .then(({ data: p }) => {
          setUser({ email: u.email ?? '', role: p?.role ?? 'user' })
        })
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // ── Scroll detection ────────────────────────────────────────────
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // ── Click outside dropdown ──────────────────────────────────────
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false)
      }
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const isDark = dark && !scrolled
  const navCls = dark
    ? `${styles.nav} ${scrolled ? styles.scrolled : styles.transparent}`
    : `${styles.nav} ${styles.light}`

  const linkCls = isDark
    ? `${styles.link} ${styles.linkDark}`
    : `${styles.link} ${styles.linkLight}`
  const keepCls = isDark
    ? `${styles.link} ${styles.linkDark} ${styles.linkKeep}`
    : `${styles.link} ${styles.linkLight} ${styles.linkKeep}`

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'U'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setDropOpen(false)
    router.push('/')
  }

  const roleLabel =
    user?.role === 'admin' ? 'Administrador'
      : user?.role === 'owner' ? 'Dueño de complejo'
      : 'Jugador'

  return (
    <nav className={navCls}>
      <Logo dark={isDark} height={100} className={styles.logo} />

      {user ? (
        <div className={styles.links} style={{ gap: 6 }}>
          <Link href="/reserve"   className={linkCls}>Complejos</Link>
          <Link href="/retos"     className={linkCls}>Retos</Link>
          <Link href="/favorites" className={linkCls}>Favoritos</Link>
          {(user.role === 'owner' || user.role === 'admin') && (
            <Link href="/admin" className={linkCls}>Mi negocio</Link>
          )}

          <div ref={dropRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setDropOpen(v => !v)}
              className={styles.avatar}
              aria-label="Menú de usuario"
            >
              {initials}
            </button>

            {dropOpen && (
              <div className={styles.drop}>
                <div className={styles.dropHead}>
                  <p className={styles.dropEmail}>{user.email}</p>
                  <p className={styles.dropRole}>{roleLabel}</p>
                </div>
                {[
                  { href: '/perfil',    icon: '👤', label: 'Mi perfil' },
                  { href: '/favorites', icon: '❤️', label: 'Favoritos' },
                  ...(user.role === 'owner' || user.role === 'admin'
                    ? [{ href: '/admin', icon: '🏟️', label: 'Mi negocio' }]
                    : []),
                ].map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDropOpen(false)}
                    className={styles.dropItem}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
                <div className={styles.dropDivider}>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className={`${styles.dropItem} ${styles.dropItemSignOut}`}
                  >
                    <span>↩</span>Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.links}>
          <Link href="/reserve"  className={linkCls}>Complejos</Link>
          <Link href="/retos"    className={linkCls}>Retos</Link>
          <Link href="/login"    className={keepCls}>Iniciar sesión</Link>
          <Link href="/register" className={styles.cta}>Registrarse</Link>
        </div>
      )}

      {/* Mobile-only CTA */}
      <Link href="/reserve" className={styles.mcta}>Buscar</Link>
    </nav>
  )
}