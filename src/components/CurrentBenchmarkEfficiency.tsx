import type { CurrentBenchmarkData } from '../hooks/useCurrentBenchmarks'
import { localizeText } from '../hooks/useCurrentBenchmarks'
import { useLocale } from '../hooks/useLocale'

export default function CurrentBenchmarkEfficiency({ data }: { data: CurrentBenchmarkData }) {
  const { isEnglish } = useLocale()
  const models = data.metadata.models

  return (
    <section className="mb-20" aria-labelledby="current-efficiency-title">
      <div className="mb-6 max-w-3xl">
        <span className="text-xs uppercase tracking-widest text-pitch-500">
          {isEnglish ? 'Cost of the run' : '完成任务的代价'}
        </span>
        <h2 id="current-efficiency-title" className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
          {isEnglish ? 'Time and tokens, reported separately' : '时间和 Token，单独列'}
        </h2>
      </div>

      <div className="space-y-6">
        <article className="overflow-hidden rounded-2xl border border-white/5 bg-graphite-900/40">
          <div className="border-b border-white/5 px-4 py-5 md:px-6">
            <h3 className="text-xl font-semibold text-white">{isEnglish ? 'Completion time' : '三项 Agent 任务用时'}</h3>
            <p className="mt-2 text-sm text-graphite-400">
              {isEnglish ? 'Shorter is faster. Cutoff submissions are labeled.' : '越短越快，达到截止点的提交会单独标注。'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[72rem] text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-graphite-400">
                  <th className="px-4 py-3 font-medium md:px-6">{isEnglish ? 'Task' : '任务'}</th>
                  {models.map((model) => (
                    <th key={model.id} className="px-3 py-3 text-right font-medium" style={{ color: model.color }}>
                      {model.shortLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.summary.speedTable.map((row, index) => (
                  <tr key={row.task} className={index < data.summary.speedTable.length - 1 ? 'border-b border-white/5' : ''}>
                    <th className="px-4 py-4 text-left font-medium text-graphite-200 md:px-6">
                      {localizeText(data.tasks[row.task].name, isEnglish)}
                    </th>
                    {models.map((model) => (
                      <td key={model.id} className="px-3 py-4 text-right text-xs tabular-nums text-graphite-200">
                        {isEnglish ? row.values[model.id].replace('分钟', 'min').replace('（截止）', ' (cutoff)') : row.values[model.id]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-white/5 bg-graphite-900/40">
          <div className="border-b border-white/5 px-4 py-5 md:px-6">
            <h3 className="text-xl font-semibold text-white">{isEnglish ? 'New tokens and cache reads' : '新增 Token 与缓存读取'}</h3>
            <p className="mt-2 text-sm leading-relaxed text-graphite-400">
              {localizeText(data.summary.tokenUsage.formula, isEnglish)}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[72rem] text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-graphite-400">
                  <th className="px-4 py-3 font-medium md:px-6">{isEnglish ? 'Task' : '任务'}</th>
                  {models.map((model) => (
                    <th key={model.id} className="px-3 py-3 text-right font-medium" style={{ color: model.color }}>
                      {model.shortLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.summary.tokenUsage.table.map((row, index) => (
                  <tr key={row.task} className={index < data.summary.tokenUsage.table.length - 1 ? 'border-b border-white/5' : ''}>
                    <th className="px-4 py-4 text-left font-medium text-graphite-200 md:px-6">
                      {localizeText(data.tasks[row.task].name, isEnglish)}
                    </th>
                    {models.map((model) => {
                      const value = row.values[model.id]
                      return (
                        <td key={model.id} className="px-3 py-4 text-right tabular-nums">
                          <span className="text-sm text-white">{value.new.toFixed(1)}</span>
                          <span className="block pt-1 text-[11px] text-graphite-500">
                            {isEnglish ? 'cache' : '缓存'} {value.cache.toFixed(1)}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-white/5 px-4 py-4 text-xs text-graphite-500 md:px-6">
            {data.summary.tokenUsage.unit}
          </p>
        </article>
      </div>
    </section>
  )
}
