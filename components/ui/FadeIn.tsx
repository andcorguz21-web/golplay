/**
 * GolPlay — FadeIn
 *
 * Wraps children in a div that fades up when it enters the viewport.
 * Uses IntersectionObserver and disconnects after first trigger.
 */

import { useRef, useState, useEffect } from 'react'
import type { CSSProperties, ReactNode, ReactElement } from 'react'

interface FadeInProps {
  children: ReactNode
  /** Delay before animation starts (ms). Default 0. */
  delay?: number
  /** Initial Y offset in px. Default 16. */
  offset?: number
  /** IntersectionObserver threshold. Default 0.05. */
  threshold?: number
  /** Animation duration in ms. Default 600. */
  duration?: number
  /** Extra inline styles applied to the wrapper. */
  style?: CSSProperties
  className?: string
}

export default function FadeIn({
  children,
  delay = 0,
  offset = 16,
  threshold = 0.05,
  duration = 600,
  style = {},
  className,
}: FadeInProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : `translateY(${offset}px)`,
        transition: `opacity ${duration}ms ease ${delay}ms, transform ${duration}ms ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}