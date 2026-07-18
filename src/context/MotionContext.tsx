import { useEffect, useState, type ReactNode } from 'react'
import { MotionContext } from './motion'

export function MotionProvider({ children }: { children: ReactNode }) {
  const [reducedMotion, setReducedMotion] = useState(false)
  const [motionPaused, setMotionPaused] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    document.body.toggleAttribute('data-motion-paused', motionPaused)
  }, [motionPaused])

  return (
    <MotionContext.Provider
      value={{ reducedMotion: reducedMotion || motionPaused, motionPaused, setMotionPaused }}
    >
      {children}
    </MotionContext.Provider>
  )
}
