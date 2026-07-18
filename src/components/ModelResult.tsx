import type { BenchmarkData } from '../hooks/useBenchmarks'
import { useLocale } from '../hooks/useLocale'

interface ModelResultProps {
  data: BenchmarkData
  taskKey: string
  model: 'kimi' | 'codex' | 'minimax'
  playHref?: string
}

export default function ModelResult({ data, taskKey, model, playHref }: ModelResultProps) {
  const { isEnglish } = useLocale()
  const task = data.tasks[taskKey]
  const m = task.models[model]
  const label = data.metadata.modelOrder[model === 'kimi' ? 0 : model === 'codex' ? 1 : 2]
  const color = data.summary.colors[model]
  const score = m.score as number
  const time = m.time as string | undefined
  const note = m.note as string

  return (
    <div className="rounded-xl border border-white/5 bg-graphite-900/30 p-5">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-medium text-graphite-200">{label}</span>
        <span className="text-2xl font-semibold tabular-nums" style={{ color }}>
          {typeof score === 'number' ? score.toFixed(1) : score}
        </span>
      </div>
      {time && <p className="text-xs text-graphite-500 mb-3">{isEnglish ? 'Time' : '用时'} {time}</p>}
      <p className="text-sm text-graphite-300 leading-relaxed">{note}</p>
      {playHref && (
        <a
          href={playHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center mt-4 text-sm text-pitch-500 hover:text-pitch-400 transition-colors active:scale-[0.98]"
        >
          {isEnglish ? 'Open original output' : '原样试玩'} <span className="ml-1">→</span>
        </a>
      )}
    </div>
  )
}
