import { useEffect, useState } from 'react'

const CURRENT_BENCHMARK_VERSION = '20260726-opus5-eight-models-v1'

export interface LocalizedText {
  zh: string
  en: string
}

export interface BenchmarkModelDefinition {
  id: string
  label: string
  shortLabel: string
  color: string
}

export interface BenchmarkTaskModel {
  score: number | null
  breakdown: number[] | null
  time: string
  round: 'current' | 'previous'
  tool: string
  note: LocalizedText
  status?: LocalizedText
  accuracy?: string
  stability?: string
  playHref?: string
}

export interface CurrentBenchmarkTask {
  name: LocalizedText
  project: LocalizedText
  date: string
  image: string
  detailImage: string
  promptPath: string
  dimensions: LocalizedText[]
  dimensionMax: number[]
  conclusion: LocalizedText
  models: Record<string, BenchmarkTaskModel>
}

export interface CurrentBenchmarkData {
  metadata: {
    roundId: string
    title: LocalizedText
    dateRange: string
    taskOrder: string[]
    scoringNote: LocalizedText
    methodNote: LocalizedText
    publicDataNote: LocalizedText
    models: BenchmarkModelDefinition[]
  }
  summary: {
    overall: Array<{ model: string; score: number; tasksCount: number }>
    speedTable: Array<{ task: string; values: Record<string, string> }>
    tokenUsage: {
      unit: string
      formula: LocalizedText
      table: Array<{
        task: string
        values: Record<string, { new: number; cache: number }>
      }>
    }
  }
  tasks: Record<string, CurrentBenchmarkTask>
}

export function localizeText(value: LocalizedText, isEnglish: boolean) {
  return isEnglish ? value.en : value.zh
}

export function useCurrentBenchmarks(): {
  data: CurrentBenchmarkData | null
  loading: boolean
  error: string | null
} {
  const [data, setData] = useState<CurrentBenchmarkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(`/data/benchmarks-20260725.json?v=${CURRENT_BENCHMARK_VERSION}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then((json: CurrentBenchmarkData) => {
        setData(json)
        setLoading(false)
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return
        setError(requestError instanceof Error ? requestError.message : String(requestError))
        setLoading(false)
      })

    return () => controller.abort()
  }, [])

  return { data, loading, error }
}
