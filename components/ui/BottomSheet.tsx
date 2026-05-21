/**
 * GolPlay — BottomSheet
 *
 * Mobile-first modal that slides up from the bottom.
 * Used for pickers, filters, and short forms.
 *
 * Locks body scroll while open. Animation uses keyframes
 * defined in styles/golplay-tokens.css (fadeIn, sheetUp).
 */

import { useEffect } from 'react'
import type { ReactNode, ReactElement } from 'react'
import styles from './BottomSheet.module.css'

interface BottomSheetProps {
  title: string
  onClose: () => void
  children: ReactNode
}

export default function BottomSheet({
  title,
  onClose,
  children,
}: BottomSheetProps): ReactElement {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className={styles.handle}>
          <div className={styles.bar} />
        </div>
        <div className={styles.head}>
          <span className={styles.title}>{title}</span>
          <button
            className={styles.close}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </>
  )
}