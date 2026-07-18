import { Suspense, lazy, useMemo, memo, useEffect, useState } from 'react'
import { useMotion } from '../hooks/useMotion'
import { seededRandomArray } from '../lib/seeded-random'

const ParticleScene = lazy(() => import('./ParticleScene'))

const StaticOrbit = memo(function StaticOrbit() {
  const dots = useMemo(() => {
    const rnd = seededRandomArray(99, 36 * 3)
    return Array.from({ length: 36 }, (_, i) => {
      const angle = (i / 36) * Math.PI * 2
      const radius = 140 + rnd[i * 3] * 120
      const size = 2 + rnd[i * 3 + 1] * 4
      return { angle, radius, size }
    })
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[260, 360, 460].map((r, i) => (
        <div
          key={i}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-pitch-500/10"
          style={{ width: r, height: r }}
        />
      ))}
      {dots.map((d, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-pitch-500/40"
          style={{
            width: d.size,
            height: d.size,
            left: `calc(50% + ${Math.cos(d.angle) * d.radius}px)`,
            top: `calc(50% + ${Math.sin(d.angle) * d.radius}px)`,
          }}
        />
      ))}
    </div>
  )
})

export default function ParticleOrbit() {
  const { reducedMotion, motionPaused } = useMotion()
  const [device, setDevice] = useState(() => ({
    width: typeof window === 'undefined' ? 0 : window.innerWidth,
    coarse:
      typeof window === 'undefined' ? true : window.matchMedia('(pointer: coarse)').matches,
  }))

  useEffect(() => {
    const pointer = window.matchMedia('(pointer: coarse)')
    const syncDevice = () => setDevice({ width: window.innerWidth, coarse: pointer.matches })
    syncDevice()
    window.addEventListener('resize', syncDevice)
    pointer.addEventListener('change', syncDevice)
    return () => {
      window.removeEventListener('resize', syncDevice)
      pointer.removeEventListener('change', syncDevice)
    }
  }, [])

  const count = useMemo(() => {
    if (reducedMotion || motionPaused) return 0
    if (device.coarse || device.width < 768) return 0
    if (device.width < 1024) return 220
    return 520
  }, [device, reducedMotion, motionPaused])

  if (reducedMotion || motionPaused || count === 0) {
    return <StaticOrbit />
  }

  return (
    <Suspense fallback={<StaticOrbit />}>
      <ParticleScene count={count} />
    </Suspense>
  )
}
