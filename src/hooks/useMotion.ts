import { useContext } from 'react'
import { MotionContext } from '../context/motion'

export function useMotion() {
  const ctx = useContext(MotionContext)
  if (!ctx) throw new Error('useMotion must be used within MotionProvider')
  return ctx
}
