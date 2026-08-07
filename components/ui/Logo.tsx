/**
 * GolPlay — Logo
 *
 * Renders the official SVG logo from /public/logo-golplay.svg.
 * - `dark` prop inverts colors via CSS filter (for use over dark backgrounds).
 * - `link` prop wraps logo in a Link to home (default: true).
 */

import Link from 'next/link'
import type { CSSProperties, ReactElement } from 'react'

interface LogoProps {
  /** If true, inverts logo to white. Use over dark backgrounds. */
  dark?: boolean
  /** Logo height in pixels. Width is auto. Default 100. */
  height?: number
  /** If true, wraps logo in a Link to "/". Default true. */
  link?: boolean
  /** Optional className for the wrapper. */
  className?: string
  /** Optional inline styles for the wrapper. */
  style?: CSSProperties
}

export default function Logo({
  dark = false,
  height = 100,
  link = true,
  className,
  style,
}: LogoProps): ReactElement {
  const img = (
    <img
      src={dark ? '/logo-golplay.svg' : '/logo-golplay1.svg'}
      alt="GolPlay"
      style={{
        height,
        width: 'auto',
        display: 'block',
        transition: 'opacity .3s',
      }}
    />
  )

  const wrapperStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    ...style,
  }

  if (!link) {
    return (
      <div className={className} style={wrapperStyle}>
        {img}
      </div>
    )
  }

  return (
    <Link
      href="/"
      className={className}
      style={{ ...wrapperStyle, cursor: 'pointer', textDecoration: 'none' }}
      aria-label="Ir al inicio"
    >
      {img}
    </Link>
  )
}