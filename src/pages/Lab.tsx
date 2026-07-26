import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
import CurrentBenchmarkOverview from '../components/CurrentBenchmarkOverview'
import CurrentBenchmarkEfficiency from '../components/CurrentBenchmarkEfficiency'
import { localizeText, useCurrentBenchmarks } from '../hooks/useCurrentBenchmarks'
import { useLocale } from '../hooks/useLocale'

export default function Lab() {
  const { data, loading, error } = useCurrentBenchmarks()
  const { isEnglish, path } = useLocale()

  return (
    <>
      <SEOHead
        title={isEnglish ? 'Eight-model hands-on Lab' : '八模型四项实测'}
        description={isEnglish
          ? 'Compare frozen quality scores, time, token usage, and submitted builds across Opus 5, GPT-5.6 Sol, K3, Fable 5, Qwen 3.8, Grok 4.5, GLM 5.2, and MiniMax M3.'
          : '查看 Opus 5、GPT-5.6 Sol、K3、Fable 5、Qwen 3.8、Grok 4.5、GLM 5.2、MiniMax M3 的冻结分数、用时、Token 与网页原作。'}
      />
      <section className="pt-24 pb-20 md:pb-28">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="mb-14 max-w-3xl">
            <span className="mb-2 block text-xs uppercase tracking-widest text-pitch-500">Lab · 2026.07.25</span>
            <h1 className="mb-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              {isEnglish ? 'Eight models, four hands-on tests' : '八个模型，四项真人实测'}
            </h1>
            <p className="leading-relaxed text-graphite-200">
              {isEnglish
                ? 'This is the evidence page for the Opus 5 public-account review. Open the submitted 2D and 3D games, scroll through all eight product pages, and inspect the frozen image-test scores. Quality, time, and tokens are kept separate.'
                : '这是 Opus 5 公众号评测对应的证据页。2D、3D 和八个产品发布页都可以直接打开，识图分数与评分拆分也完整保留；质量、时间和 Token 分开呈现。'}
            </p>
          </div>

          {loading && (
            <div className="mb-16 rounded-2xl border border-white/5 bg-graphite-900/30 p-8 text-graphite-400" role="status" aria-live="polite">
              {isEnglish ? 'Loading the frozen benchmark…' : '正在加载冻结评测数据…'}
            </div>
          )}
          {error && (
            <div className="mb-16 rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-red-300" role="alert">
              {isEnglish ? 'Unable to load Lab data' : '实验室数据加载失败'}：{error}
            </div>
          )}

          {data && (
            <>
              <CurrentBenchmarkOverview data={data} />

              <section className="mb-20" aria-labelledby="task-links-title">
                <div className="mb-6 max-w-3xl">
                  <span className="text-xs uppercase tracking-widest text-pitch-500">
                    {isEnglish ? 'Evidence links' : '证据入口'}
                  </span>
                  <h2 id="task-links-title" className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                    {isEnglish ? 'Scores and originals, task by task' : '逐项看分数和原作'}
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {data.metadata.taskOrder.map((taskId) => {
                    const task = data.tasks[taskId]
                    const topResult = [...data.metadata.models]
                      .map((model) => ({ model, result: task.models[model.id] }))
                      .filter(({ result }) => result.score !== null)
                      .sort((left, right) => Number(right.result.score) - Number(left.result.score))[0]
                    return (
                      <Link
                        key={taskId}
                        to={path(`/lab/${taskId}`)}
                        className="group overflow-hidden rounded-2xl border border-white/5 bg-graphite-900/30 transition-colors hover:border-pitch-500/30 active:scale-[0.99]"
                      >
                        <div className="aspect-[16/9] overflow-hidden border-b border-white/5 bg-graphite-950/60">
                          <img
                            src={task.image}
                            alt={`${localizeText(task.project, isEnglish)} ${isEnglish ? 'score chart' : '分数图'}`}
                            loading="lazy"
                            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.015]"
                          />
                        </div>
                        <div className="p-5 md:p-6">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-xs text-graphite-400">{localizeText(task.project, isEnglish)}</span>
                            <span className="shrink-0 text-xs text-graphite-500">{task.date}</span>
                          </div>
                          <h3 className="text-xl font-semibold text-white transition-colors group-hover:text-pitch-500">
                            {localizeText(task.name, isEnglish)}
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-graphite-300">
                            {topResult
                              ? `${topResult.model.shortLabel} ${topResult.result.score?.toFixed(1)} · ${localizeText(task.conclusion, isEnglish)}`
                              : localizeText(task.conclusion, isEnglish)}
                          </p>
                          <span className="mt-4 inline-flex items-center text-sm text-pitch-500 transition-colors group-hover:text-pitch-400">
                            {isEnglish ? 'Open evidence' : '查看分数与原作'} <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>

              <CurrentBenchmarkEfficiency data={data} />

              <p className="mb-8 text-xs leading-relaxed text-graphite-500">
                {localizeText(data.metadata.methodNote, isEnglish)}
              </p>
              <p className="mb-16 text-xs leading-relaxed text-graphite-500">
                {localizeText(data.metadata.publicDataNote, isEnglish)}
              </p>
            </>
          )}

          <Link
            to={path('/lab/model-price-benchmark')}
            className="group mb-8 block overflow-hidden rounded-2xl border border-[#b8d9ff] bg-paper p-5 text-[#1d1d1f] transition-[border-color,transform] hover:border-[#0071e3] active:scale-[0.99] md:p-7"
          >
            <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[#0071e3]">API price · official sources</span>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">
                  {isEnglish ? 'API price & official benchmarks' : '模型 API 价格与官方评测'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6e6e73]">
                  {isEnglish
                    ? 'Compare six-model API pricing, the latest four hands-on tests across eight models, and provider claims without mixing incompatible test harnesses.'
                    : '一页查看六模型 API 定价、八模型四项最新实测与厂商公开评测；不同测试口径继续分开呈现。'}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-[#0066cc] transition-transform group-hover:translate-x-1">
                {isEnglish ? 'Open comparison' : '打开对比'} →
              </span>
            </div>
          </Link>

          <div className="text-right">
            <Link to={path('/lab/promo')} className="text-xs text-graphite-500 transition-colors hover:text-graphite-300">
              {isEnglish ? 'Prior round: One Kick promotion page →' : '上一轮《一脚晋级》宣传页归档 →'}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
