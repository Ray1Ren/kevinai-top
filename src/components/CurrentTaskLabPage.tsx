import SEOHead from './SEOHead'
import FullPrompt from './FullPrompt'
import PlayableComparison from './PlayableComparison'
import { localizeText, useCurrentBenchmarks } from '../hooks/useCurrentBenchmarks'
import { useLocale } from '../hooks/useLocale'

interface CurrentTaskLabPageProps {
  taskId: '2d' | '3d' | 'vision' | 'aesthetic'
}

function formatTime(value: string, isEnglish: boolean) {
  if (!isEnglish) return value
  return value
    .replace('分钟（截止）', 'min (cutoff)')
    .replace('分钟', 'min')
    .replace('秒／题中位', 's median/item')
    .replace('两次尝试共 30 分钟', '30 min across two attempts')
}

export default function CurrentTaskLabPage({ taskId }: CurrentTaskLabPageProps) {
  const { data, loading, error } = useCurrentBenchmarks()
  const { isEnglish, bundlePath } = useLocale()
  const task = data?.tasks[taskId]

  if (loading) {
    return (
      <div className="min-h-[60dvh] pt-28 text-center text-graphite-400" role="status" aria-live="polite">
        {isEnglish ? 'Loading evaluation results…' : '评测结果加载中…'}
      </div>
    )
  }

  if (error || !data || !task) {
    return (
      <div className="min-h-[60dvh] pt-28 text-center text-red-400" role="alert">
        {isEnglish ? 'Unable to load current Lab data' : '本轮实验室数据加载失败'}：{error ?? taskId}
      </div>
    )
  }

  const rankedModels = [...data.metadata.models].sort((left, right) => {
    const leftScore = task.models[left.id]?.score
    const rightScore = task.models[right.id]?.score
    return (rightScore ?? -1) - (leftScore ?? -1)
  })
  const playableEntries = rankedModels
    .map((model) => {
      const result = task.models[model.id]
      if (!result?.playHref || result.score === null) return null
      return {
        id: model.id,
        label: model.shortLabel,
        src: bundlePath(result.playHref),
        score: result.score,
      }
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
  const defaultPlayable = playableEntries[0]
  const isPlayableTask = playableEntries.length > 0

  return (
    <>
      <SEOHead
        title={`${localizeText(task.name, isEnglish)} · ${localizeText(task.project, isEnglish)}`}
        description={localizeText(task.conclusion, isEnglish)}
      />
      <section className="pt-24 pb-20 md:pb-28">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="mb-12 max-w-3xl">
            <span className="mb-2 block text-xs uppercase tracking-widest text-pitch-500">
              {localizeText(task.name, isEnglish)} · {task.date}
            </span>
            <h1 className="mb-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              {localizeText(task.project, isEnglish)}
            </h1>
            <p className="mb-6 leading-relaxed text-graphite-200">
              {localizeText(task.conclusion, isEnglish)}
            </p>
            <FullPrompt
              isEnglish={isEnglish}
              promptPath={task.promptPath}
              summary={isEnglish
                ? 'Every newly tested system received this same complete brief without follow-up prompts.'
                : '本轮新测模型都收到这份完整同题任务书，中途没有补提示。'}
            />
          </div>

          {isPlayableTask && defaultPlayable && (
            <PlayableComparison
              title={isEnglish ? 'Open the submitted builds' : '原作直接打开'}
              description={isEnglish
                ? `${defaultPlayable.label} opens first because it received the highest quality score in this task.`
                : `默认打开本题质量分最高的 ${defaultPlayable.label}，上方可以切换其他原作。`}
              defaultId={defaultPlayable.id}
              entries={playableEntries}
              loadingLabel={taskId === 'aesthetic'
                ? (isEnglish ? 'Loading the page…' : '页面加载中…')
                : undefined}
              footnote={isEnglish
                ? 'These are the submitted web files, preserved as evidence. Controls and mobile support vary by build.'
                : '这里保留的是各家交来的网页原作，作为结果证据；操作方式与手机适配程度各不相同。'}
            />
          )}

          <div className="mb-12 grid gap-4 lg:grid-cols-2">
            {[task.image, task.detailImage].map((image, index) => (
              <figure key={image} className="overflow-hidden rounded-2xl border border-white/5 bg-graphite-900/30">
                <img
                  src={image}
                  alt={index === 0
                    ? `${localizeText(task.project, isEnglish)} ${isEnglish ? 'total score chart' : '总分图'}`
                    : `${localizeText(task.project, isEnglish)} ${isEnglish ? 'score breakdown chart' : '评分拆分图'}`}
                  loading="lazy"
                  className="h-auto w-full"
                />
              </figure>
            ))}
          </div>

          <section className="mb-12" aria-labelledby={`${taskId}-model-results`}>
            <div className="mb-5 max-w-3xl">
              <h2 id={`${taskId}-model-results`} className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                {isEnglish ? 'Result notes and original links' : '分数、观察与原作入口'}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-graphite-400">
                {localizeText(data.metadata.scoringNote, isEnglish)}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {rankedModels.map((model) => {
                const result = task.models[model.id]
                const status = result.status ? localizeText(result.status, isEnglish) : null
                return (
                  <article
                    key={model.id}
                    data-model-result={model.id}
                    data-score-key="score"
                    className="flex min-h-full flex-col rounded-2xl border border-white/5 bg-graphite-900/30 p-5"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">{model.label}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-graphite-500">{result.tool}</p>
                      </div>
                      <span
                        data-model-score
                        className="text-2xl font-semibold tabular-nums"
                        style={{ color: model.color }}
                      >
                        {result.score === null ? '—' : result.score.toFixed(1)}
                      </span>
                    </div>
                    <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-graphite-400">
                        {result.round === 'current'
                          ? (isEnglish ? 'This round' : '本轮')
                          : (isEnglish ? 'Prior published round' : '上期公开')}
                      </span>
                      <span className="rounded-full border border-white/10 px-2.5 py-1 text-graphite-400">
                        {formatTime(result.time, isEnglish)}
                      </span>
                      {result.accuracy && (
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-graphite-400">
                          {isEnglish ? 'Accuracy' : '准确'} {result.accuracy}
                        </span>
                      )}
                      {result.stability && (
                        <span className="rounded-full border border-white/10 px-2.5 py-1 text-graphite-400">
                          {isEnglish ? 'Stable' : '稳定'} {result.stability}
                        </span>
                      )}
                    </div>
                    {status && <p className="mb-2 text-sm font-medium text-amber-300">{status}</p>}
                    <p className="flex-1 text-sm leading-relaxed text-graphite-300">
                      {localizeText(result.note, isEnglish)}
                    </p>
                    {result.playHref && (
                      <a
                        href={bundlePath(result.playHref)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-5 inline-flex items-center text-sm text-pitch-500 transition-colors hover:text-pitch-400 active:scale-[0.98]"
                      >
                        {isEnglish ? 'Open submitted build' : '打开原作'} <span className="ml-1" aria-hidden="true">↗</span>
                      </a>
                    )}
                  </article>
                )
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-white/5 bg-graphite-900/30" aria-labelledby={`${taskId}-score-breakdown`}>
            <div className="border-b border-white/5 px-4 py-5 md:px-6">
              <h2 id={`${taskId}-score-breakdown`} className="text-xl font-semibold text-white">
                {isEnglish ? 'Frozen score breakdown' : '冻结评分拆分'}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[58rem] text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-graphite-400">
                    <th className="px-4 py-3 font-medium md:px-6">{isEnglish ? 'Model and tool' : '模型与工具'}</th>
                    {task.dimensions.map((dimension, index) => (
                      <th key={dimension.zh} className="px-3 py-3 text-right font-medium">
                        {localizeText(dimension, isEnglish)} / {task.dimensionMax[index]}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right font-medium">{isEnglish ? 'Total' : '总分'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rankedModels.map((model, rowIndex) => {
                    const result = task.models[model.id]
                    return (
                      <tr key={model.id} className={rowIndex < rankedModels.length - 1 ? 'border-b border-white/5' : ''}>
                        <th className="px-4 py-4 text-left font-medium text-graphite-200 md:px-6">
                          <span className="block text-white">{model.label}</span>
                          <span className="mt-1 block text-[11px] font-normal text-graphite-500">{result.tool}</span>
                        </th>
                        {task.dimensions.map((dimension, index) => (
                          <td key={dimension.zh} className="px-3 py-4 text-right tabular-nums text-graphite-200">
                            {result.breakdown ? result.breakdown[index].toFixed(1) : '—'}
                          </td>
                        ))}
                        <td className="px-4 py-4 text-right font-semibold tabular-nums text-white">
                          {result.score === null ? '—' : result.score.toFixed(1)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-white/5 px-4 py-4 text-xs leading-relaxed text-graphite-500 md:px-6">
              {localizeText(data.metadata.methodNote, isEnglish)}
            </p>
          </section>
        </div>
      </section>
    </>
  )
}
