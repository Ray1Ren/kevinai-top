import { useState, useEffect } from 'react'
import { useLocale } from './useLocale'

export interface BenchmarkData {
  metadata: {
    title: string
    dateRange: string
    scoringNote: string
    methodNote: string
    publicDataNote: string
    modelOrder: string[]
  }
  summary: {
    table: Array<{ task: string; kimi: number; codex: number; minimax: number }>
    speedTable: Array<{ task: string; kimi: string; codex: string; minimax: string }>
    colors: { kimi: string; codex: string; minimax: string }
  }
  tasks: Record<
    string,
    {
      name: string
      project: string
      date: string
      prompt?: string
      models: Record<string, Record<string, string | number | boolean>>
      conclusion: string
      speedNote?: string
      playHref?: string
      dataHref?: string
    }
  >
}

export function useBenchmarks(): { data: BenchmarkData | null; loading: boolean; error: string | null } {
  const { isEnglish } = useLocale()
  const [data, setData] = useState<BenchmarkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setData(null)
    setLoading(true)
    setError(null)
    fetch(isEnglish ? '/data/benchmarks.en.json' : '/data/benchmarks.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json: BenchmarkData) => {
        setData(json)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
  }, [isEnglish])

  return { data, loading, error }
}
