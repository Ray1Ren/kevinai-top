import { createContext } from 'react'

export interface MotionContextValue {
  reducedMotion: boolean
  motionPaused: boolean
  setMotionPaused: (value: boolean) => void
}

export const MotionContext = createContext<MotionContextValue | null>(null)
