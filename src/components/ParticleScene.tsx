import { useRef, useMemo, memo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useMotion } from '../hooks/useMotion'
import { seededRandomArray } from '../lib/seeded-random'

interface ParticlesProps {
  count: number
  mouse: React.MutableRefObject<{ x: number; y: number }>
  offsetX: number
}

function ParticleShell({ count, mouse, offsetX }: ParticlesProps) {
  const groupRef = useRef<THREE.Group>(null)

  const geometry = useMemo(() => {
    const rnd = seededRandomArray(42, count * 2)
    const pos = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const pitch = new THREE.Color('#8ab82f')
    const chalk = new THREE.Color('#d8e3c2')
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))

    for (let i = 0; i < count; i++) {
      const y = 1 - (i / Math.max(1, count - 1)) * 2
      const latitudeRadius = Math.sqrt(Math.max(0, 1 - y * y))
      const theta = goldenAngle * i + (rnd[i * 2] - 0.5) * 0.08
      const radius = 1.64 + (rnd[i * 2 + 1] - 0.5) * 0.1
      pos[i * 3] = Math.cos(theta) * latitudeRadius * radius
      pos[i * 3 + 1] = y * radius
      pos[i * 3 + 2] = Math.sin(theta) * latitudeRadius * radius

      const color = i % 17 === 0 || i % 29 === 0 ? chalk : pitch
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [count])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.rotation.y = t * 0.045 + mouse.current.x * 0.09
    groupRef.current.rotation.x = Math.sin(t * 0.18) * 0.035 + mouse.current.y * 0.045
  })

  return (
    <group ref={groupRef} position={[offsetX, 0, 0]}>
      <points geometry={geometry}>
        <pointsMaterial
          size={0.042}
          vertexColors
          transparent
          opacity={0.84}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      <mesh>
        <icosahedronGeometry args={[1.72, 1]} />
        <meshBasicMaterial color="#8ab82f" wireframe transparent opacity={0.08} depthWrite={false} />
      </mesh>
    </group>
  )
}

function OrbitRings({ offsetX }: { offsetX: number }) {
  const groupRef = useRef<THREE.Group>(null)
  const rings = useMemo(() => {
    const rnd = seededRandomArray(7, 12)
    return [0, 1, 2].map((i) => ({
      radius: 2.05 + i * 0.58 + rnd[i] * 0.12,
      tiltX: (rnd[i + 3] - 0.5) * 0.6,
      tiltZ: (rnd[i + 6] - 0.5) * 0.6,
      speed: 0.03 + rnd[i + 9] * 0.04,
      geometry: new THREE.BufferGeometry().setFromPoints(
        new THREE.EllipseCurve(
          0,
          0,
          2.05 + i * 0.58 + rnd[i] * 0.12,
          (2.05 + i * 0.58 + rnd[i] * 0.12) * 0.76,
          0,
          Math.PI * 2,
          false,
          0,
        )
          .getPoints(128)
          .map((point) => new THREE.Vector3(point.x, point.y, 0)),
      ),
    }))
  }, [])

  useEffect(() => () => rings.forEach((ring) => ring.geometry.dispose()), [rings])

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.elapsedTime
    groupRef.current.children.forEach((child, i) => {
      child.rotation.z = t * rings[i].speed
    })
  })

  return (
    <group ref={groupRef} position={[offsetX, 0, 0]}>
      {rings.map((ring, i) => {
        return (
          <lineLoop
            key={i}
            geometry={ring.geometry}
            rotation={[ring.tiltX, 0, ring.tiltZ]}
          >
            <lineBasicMaterial color="#6c9324" transparent opacity={0.18} />
          </lineLoop>
        )
      })}
    </group>
  )
}

function Scene({ count }: { count: number }) {
  const mouse = useRef({ x: 0, y: 0 })
  const { reducedMotion } = useMotion()
  const { viewport, size } = useThree()
  const offsetX = size.width >= 1024 ? viewport.width * 0.24 : 0

  useEffect(() => {
    if (reducedMotion) return
    const handleMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [reducedMotion])

  return (
    <>
      <ParticleShell count={count} mouse={mouse} offsetX={offsetX} />
      <OrbitRings offsetX={offsetX} />
    </>
  )
}

const MemoizedScene = memo(Scene)

export default function ParticleScene({ count }: { count: number }) {
  const { reducedMotion, motionPaused } = useMotion()
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState !== 'hidden')

  useEffect(() => {
    const syncVisibility = () => setPageVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', syncVisibility)
    return () => document.removeEventListener('visibilitychange', syncVisibility)
  }, [])

  const frameloop = reducedMotion || motionPaused || !pageVisible ? 'never' : 'always'

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 55 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        frameloop={frameloop}
      >
        <MemoizedScene count={count} />
      </Canvas>
    </div>
  )
}
