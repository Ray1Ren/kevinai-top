import type { BenchmarkData, TokenUsageRow } from '../hooks/useBenchmarks'
import { useLocale } from '../hooks/useLocale'

type ModelKey = 'kimi' | 'codex' | 'minimax'

const models: Array<{ key: ModelKey; label: string }> = [
  { key: 'kimi', label: 'Kimi K3' },
  { key: 'codex', label: 'GPT-5.6 Sol' },
  { key: 'minimax', label: 'MiniMax M3' },
]

function SpeedTable({ data }: { data: BenchmarkData }) {
  const { isEnglish } = useLocale()
  const { colors, speedTable } = data.summary

  return (
    <article className="overflow-hidden rounded-xl border border-white/5 bg-graphite-900/50">
      <div className="border-b border-white/5 px-4 py-5 md:px-6">
        <p className="text-xs uppercase tracking-[0.18em] text-pitch-500">
          {isEnglish ? 'Elapsed time' : '处理任务的速度'}
        </p>
        <h3 className="mt-2 text-xl font-semibold text-white">
          {isEnglish ? 'Completion time' : '任务完成用时'}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-graphite-400">
          {isEnglish
            ? 'Shorter is faster. Timing is reported separately and does not affect the quality score.'
            : '用时越短越快。这里只单列实测时间，不计入质量分。'}
        </p>
      </div>
      <div className="divide-y divide-white/5 sm:hidden">
        {speedTable.map((row) => (
          <div key={row.task} className="px-4 py-4">
            <p className="mb-3 text-sm font-medium text-white">{row.task}</p>
            <div className="grid grid-cols-3 gap-3">
              {models.map((model) => (
                <div key={model.key}>
                  <p className="text-[11px] font-medium" style={{ color: colors[model.key] }}>
                    {model.key === 'kimi' ? 'K3' : model.key === 'codex' ? 'GPT' : 'M3'}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-graphite-200">{row[model.key]}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[42rem] text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-graphite-400">
              <th className="px-4 py-3 font-medium md:px-6">{isEnglish ? 'Task' : '任务'}</th>
              {models.map((model) => (
                <th
                  key={model.key}
                  className="px-4 py-3 text-right font-medium"
                  style={{ color: colors[model.key] }}
                >
                  {model.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {speedTable.map((row, index) => (
              <tr key={row.task} className={index < speedTable.length - 1 ? 'border-b border-white/5' : ''}>
                <th className="px-4 py-4 text-left font-medium text-graphite-200 md:px-6">{row.task}</th>
                {models.map((model) => (
                  <td key={model.key} className="px-4 py-4 text-right tabular-nums text-graphite-200">
                    {row[model.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}

function TokenCell({ row, modelKey, unit, isTotal }: { row: TokenUsageRow; modelKey: ModelKey; unit: string; isTotal: boolean }) {
  const { isEnglish } = useLocale()
  const value = row[modelKey]

  return (
    <td className={`px-4 py-4 text-right tabular-nums ${isTotal ? 'bg-white/[0.025]' : ''}`}>
      <span className={isTotal ? 'font-semibold text-white' : 'text-graphite-200'}>
        {value.new.toFixed(1)}
      </span>
      <span className="block pt-1 text-xs text-graphite-500">
        {isEnglish ? 'cache' : '缓存'} {value.cache.toFixed(1)}
      </span>
      <span className="sr-only"> {unit}</span>
    </td>
  )
}

function TokenUsage({ data }: { data: BenchmarkData }) {
  const { isEnglish } = useLocale()
  const { colors, tokenUsage } = data.summary
  const totalRow = tokenUsage.table[tokenUsage.table.length - 1]
  const totalNew = models.reduce((sum, model) => sum + totalRow[model.key].new, 0)

  return (
    <article className="overflow-hidden rounded-xl border border-white/5 bg-graphite-900/50">
      <div className="grid gap-5 border-b border-white/5 px-4 py-5 md:grid-cols-[1fr_auto] md:items-end md:px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-pitch-500">
            {isEnglish ? 'Token usage' : 'Token 消耗量'}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {isEnglish ? 'New tokens and cache reads' : '新增 Token 与缓存读取'}
          </h3>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-graphite-400">
            {tokenUsage.valueOrderNote}
          </p>
        </div>
        <div className="border-l-2 border-pitch-500 pl-4 md:text-right">
          <p className="text-xs text-graphite-500">{isEnglish ? 'New tokens across 3 coding tasks' : '三项编码任务新增合计'}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
            {totalNew.toFixed(1)} <span className="text-sm font-normal text-graphite-400">{tokenUsage.unit}</span>
          </p>
        </div>
      </div>
      <div className="divide-y divide-white/5 sm:hidden">
        {tokenUsage.table.map((row, index) => {
          const isTotal = index === tokenUsage.table.length - 1
          return (
            <div key={row.task} className={`px-4 py-4 ${isTotal ? 'bg-white/[0.025]' : ''}`}>
              <p className="mb-3 text-sm font-medium text-white">{row.task}</p>
              <div className="grid grid-cols-3 gap-3">
                {models.map((model) => (
                  <div key={model.key}>
                    <p className="text-[11px] font-medium" style={{ color: colors[model.key] }}>
                      {model.key === 'kimi' ? 'K3' : model.key === 'codex' ? 'GPT' : 'M3'}
                    </p>
                    <p className={`mt-1 text-sm tabular-nums ${isTotal ? 'font-semibold text-white' : 'text-graphite-200'}`}>
                      {row[model.key].new.toFixed(1)}
                    </p>
                    <p className="mt-0.5 text-[11px] tabular-nums text-graphite-500">
                      {isEnglish ? 'cache' : '缓存'} {row[model.key].cache.toFixed(1)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[42rem] text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-graphite-400">
              <th className="px-4 py-3 font-medium md:px-6">{isEnglish ? 'Task' : '任务'}</th>
              {models.map((model) => (
                <th
                  key={model.key}
                  className="px-4 py-3 text-right font-medium"
                  style={{ color: colors[model.key] }}
                >
                  {model.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tokenUsage.table.map((row, index) => {
              const isTotal = index === tokenUsage.table.length - 1
              return (
                <tr key={row.task} className={index < tokenUsage.table.length - 1 ? 'border-b border-white/5' : ''}>
                  <th className={`px-4 py-4 text-left font-medium md:px-6 ${isTotal ? 'bg-white/[0.025] text-white' : 'text-graphite-200'}`}>
                    {row.task}
                  </th>
                  {models.map((model) => (
                    <TokenCell key={model.key} row={row} modelKey={model.key} unit={tokenUsage.unit} isTotal={isTotal} />
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-white/5 px-4 py-4 text-xs leading-relaxed text-graphite-500 md:px-6">
        {tokenUsage.exclusionNote}
      </p>
    </article>
  )
}

export default function BenchmarkEfficiency({ data }: { data: BenchmarkData }) {
  const { isEnglish } = useLocale()

  return (
    <section aria-labelledby="efficiency-title" className="mb-20">
      <div className="mb-6 max-w-2xl">
        <span className="text-xs uppercase tracking-widest text-pitch-500">{isEnglish ? 'Cost of the run' : '完成任务的代价'}</span>
        <h2 id="efficiency-title" className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
          {isEnglish ? 'Speed and token usage, reported separately' : '速度和 Token，单独列'}
        </h2>
      </div>
      <div className="space-y-6">
        <SpeedTable data={data} />
        <TokenUsage data={data} />
      </div>
    </section>
  )
}
