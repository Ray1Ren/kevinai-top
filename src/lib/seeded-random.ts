// Deterministic seeded random for reproducible particles / static fallback.
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function seededRandomArray(seed: number, count: number): number[] {
  const rnd = mulberry32(seed)
  return Array.from({ length: count }, () => rnd())
}
