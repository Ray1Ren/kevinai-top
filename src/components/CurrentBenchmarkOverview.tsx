import { useMemo, useState } from 'react'
import type { CurrentBenchmarkData } from '../hooks/useCurrentBenchmarks'
import { localizeText } from '../hooks/useCurrentBenchmarks'
import { useLocale } from '../hooks/useLocale'

function scoreText(score: number | null) {
  return score === null ? '—' : score.toFixed(1)
}

export default function CurrentBenchmarkOverview({ data }: { data: CurrentBenchmarkData }) {
  const { isEnglish } = useLocale()
  const [selectedTask, setSelectedTask] = useState(data.metadata.taskOrder[0])
  const modelsById = useMemo(
    () => new Map(data.metadata.models.map((model) => [model.id, model])),
    [data.metadata.models],
  )
  const selected = data.tasks[selectedTask]
  const rankedModels = [...data.metadata.models].sort((left, right) => {
    const leftScore = selected.models[left.id]?.score
    const rightScore = selected.models[right.id]?.score
    return (rightScore ?? -1) - (leftScore ?? -1)
  })

  return (
    <section className="mb-16" aria-labelledby="round-overview-title">
      <div className="mb-6 max-w-3xl">
        <span className="text-xs uppercase tracking-widest text-pitch-500">
          {isEnglish ? 'Frozen results' : '冻结结果'}
        </span>
        <h2 id="round-overview-title" className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
          {isEnglish ? 'Quality scores across four tasks' : '四道题质量分'}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-graphite-400">
          {localizeText(data.metadata.scoringNote, isEnglish)}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <article className="overflow-hidden rounded-2xl border border-white/5 bg-graphite-900/40">
          <div className="border-b border-white/5 px-4 py-4 md:px-6">
            <p className="text-xs uppercase tracking-[0.18em] text-graphite-500">
              {isEnglish ? 'Comparable-task average' : '可比任务平均'}
            </p>
          </div>
          <div className="divide-y divide-white/5">
            {data.summary.overall.map((row, index) => {
              const model = modelsById.get(row.model)
              if (!model) return null
              const width = `${Math.max(3, row.score)}%`
              return (
                <div key={row.model} className="grid grid-cols-[2.25rem_minmax(7.5rem,0.7fr)_minmax(7rem,1fr)_3.4rem] items-center gap-3 px-4 py-3 md:px-6">
                  <span className="text-xs tabular-nums text-graphite-500">#{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{model.label}</p>
                    <p className="mt-0.5 text-[11px] text-graphite-500">
                      {row.tasksCount === 4
                        ? (isEnglish ? '4 tasks' : '4 项')
                        : (isEnglish ? '3 completed tasks' : '已完成 3 项')}
                    </p>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
                    <div
                      className="h-full rounded-full"
                      style={{ width, backgroundColor: model.color }}
                    />
                  </div>
                  <strong className="text-right text-lg tabular-nums text-white">{row.score.toFixed(1)}</strong>
                </div>
              )
            })}
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-white/5 bg-graphite-900/40">
          <div className="flex gap-2 overflow-x-auto border-b border-white/5 p-3" role="tablist" aria-label={isEnglish ? 'Choose a benchmark task' : '选择评测项目'}>
            {data.metadata.taskOrder.map((taskId) => {
              const task = data.tasks[taskId]
              const active = taskId === selectedTask
              return (
                <button
                  key={taskId}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedTask(taskId)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors active:scale-[0.98] ${
                    active
                      ? 'border-pitch-500 bg-pitch-600 text-paper'
                      : 'border-white/10 text-graphite-300 hover:border-white/25 hover:text-white'
                  }`}
                >
                  {localizeText(task.name, isEnglish)}
                </button>
              )
            })}
          </div>
          <div className="p-4 md:p-6">
            <div className="mb-5">
              <p className="text-xs text-graphite-500">{localizeText(selected.project, isEnglish)}</p>
              <h3 className="mt-1 text-xl font-semibold text-white">{localizeText(selected.name, isEnglish)}</h3>
            </div>
            <div className="space-y-3">
              {rankedModels.map((model) => {
                const result = selected.models[model.id]
                const score = result?.score ?? null
                return (
                  <div key={model.id} className="grid grid-cols-[minmax(7rem,0.75fr)_minmax(6rem,1fr)_3rem] items-center gap-3">
                    <span className="truncate text-xs text-graphite-300">{model.shortLabel}</span>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
                      {score !== null && (
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${score}%`, backgroundColor: model.color }}
                        />
                      )}
                    </div>
                    <span className="text-right text-sm tabular-nums text-white">{scoreText(score)}</span>
                  </div>
                )
              })}
            </div>
            <p className="mt-5 border-t border-white/5 pt-4 text-xs leading-relaxed text-graphite-500">
              {localizeText(selected.conclusion, isEnglish)}
            </p>
          </div>
        </article>
      </div>
    </section>
  )
}
