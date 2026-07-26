import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
import { localizeText, useCurrentBenchmarks } from '../hooks/useCurrentBenchmarks'
import { useLocale } from '../hooks/useLocale'

const priceRows = [
  { model: 'Claude Fable 5', multiple: 58.51, cost: 1.677, width: 97.52, tone: 'bg-[#0071e3]' },
  { model: 'GPT-5.6 Sol', multiple: 30.13, cost: 0.864, width: 50.22, tone: 'bg-[#0071e3]' },
  { model: 'Kimi K3', multiple: 17.26, cost: 0.495, width: 28.77, tone: 'bg-[#0071e3]' },
  { model: 'GLM-5.2', multiple: 11.7, cost: 0.335, width: 19.5, tone: 'bg-[#0071e3]' },
  { model: 'MiniMax M3', multiple: 2.69, cost: 0.077, width: 4.48, tone: 'bg-[#f06d2f]' },
  { model: 'DeepSeek V4 Pro', multiple: 1, cost: 0.029, width: 1.67, tone: 'bg-[#30a46c]', baseline: true },
]

const pricingSources = [
  { label: 'Claude', href: 'https://platform.claude.com/docs/en/about-claude/pricing' },
  { label: 'OpenAI', href: 'https://developers.openai.com/api/docs/pricing' },
  { label: 'Kimi', href: 'https://platform.kimi.com/docs/pricing/chat-k3' },
  { label: 'GLM', href: 'https://docs.z.ai/guides/overview/pricing' },
  { label: 'DeepSeek', href: 'https://api-docs.deepseek.com/quick_start/pricing/' },
  { label: 'MiniMax', href: 'https://platform.minimax.io/docs/guides/pricing-paygo' },
]

type LocalizedCopy = { zh: string; en: string }

type OfficialBenchmarkClaim = {
  model: string
  provider: string
  claim: LocalizedCopy
  metrics: Array<{ label: string; value: LocalizedCopy }>
  href: string
}

const officialBenchmarkClaims: OfficialBenchmarkClaim[] = [
  {
    model: 'Claude Fable 5',
    provider: 'Anthropic',
    claim: {
      zh: '官方称在其列出的绝大多数能力基准达到 SOTA。',
      en: 'Anthropic reports state-of-the-art results across nearly every capability benchmark it lists.',
    },
    metrics: [
      { label: 'Cognition FrontierCode', value: { zh: '最高分', en: 'Top score' } },
      { label: 'Hebbia Finance Benchmark', value: { zh: '最高分', en: 'Top score' } },
    ],
    href: 'https://www.anthropic.com/news/claude-fable-5-mythos-5',
  },
  {
    model: 'GPT-5.6 Sol',
    provider: 'OpenAI',
    claim: {
      zh: '官方模型目录将其定位为面向复杂专业工作的前沿模型。',
      en: 'OpenAI positions it as a frontier model for complex professional work.',
    },
    metrics: [
      { label: 'Reasoning', value: { zh: '最高档', en: 'Highest' } },
      { label: 'Official model tier', value: { zh: '前沿', en: 'Frontier' } },
    ],
    href: 'https://developers.openai.com/api/docs/models/gpt-5.6-sol',
  },
  {
    model: 'Kimi K3',
    provider: 'Moonshot AI',
    claim: {
      zh: 'Kimi 官方评测套件中，除 Claude Fable 5 与 GPT-5.6 Sol 外领先其余对照模型。',
      en: 'In Kimi’s own suite, K3 leads the other comparison models apart from Claude Fable 5 and GPT-5.6 Sol.',
    },
    metrics: [
      { label: 'DeepSWE', value: { zh: '67.3', en: '67.3' } },
      { label: 'BrowseComp', value: { zh: '90.4', en: '90.4' } },
    ],
    href: 'https://www.kimi.com/blog/kimi-k3',
  },
  {
    model: 'GLM-5.2',
    provider: 'Z.ai',
    claim: {
      zh: 'FrontierSWE、PostTrainBench、SWE-Marathon 三项均列开源模型第 1。',
      en: 'Ranks No. 1 among open models on FrontierSWE, PostTrainBench, and SWE-Marathon.',
    },
    metrics: [
      { label: 'Terminal-Bench 2.1', value: { zh: '81.0', en: '81.0' } },
      { label: 'SWE-bench Pro', value: { zh: '62.1', en: '62.1' } },
    ],
    href: 'https://docs.z.ai/guides/llm/glm-5.2',
  },
  {
    model: 'MiniMax M3',
    provider: 'MiniMax',
    claim: {
      zh: '官方页面显示 BrowseComp 超过 Opus 4.7，PostTrainBench 总榜第 3。',
      en: 'MiniMax reports a higher BrowseComp score than Opus 4.7 and No. 3 overall on PostTrainBench.',
    },
    metrics: [
      { label: 'BrowseComp', value: { zh: '83.5', en: '83.5' } },
      { label: 'PostTrainBench', value: { zh: '37.1 · #3', en: '37.1 · #3' } },
    ],
    href: 'https://www.minimax.io/models/text/m3',
  },
  {
    model: 'DeepSeek V4 Pro',
    provider: 'DeepSeek',
    claim: {
      zh: '官方称 Agentic Coding 达到开源 SOTA，World Knowledge 位列开放模型第 1。',
      en: 'DeepSeek reports open-source SOTA in agentic coding and No. 1 among open models in world knowledge.',
    },
    metrics: [
      { label: 'Agentic Coding', value: { zh: '开源 SOTA', en: 'Open SOTA' } },
      { label: 'World Knowledge', value: { zh: '开放模型第 1', en: 'No. 1 open model' } },
    ],
    href: 'https://api-docs.deepseek.com/news/news260424',
  },
]

function PriceChart({ isEnglish }: { isEnglish: boolean }) {
  const chartLabel = isEnglish
    ? 'Relative API cost for a real agent token mix. Claude Fable 5 is 58.51 times the DeepSeek V4 Pro baseline, GPT-5.6 Sol 30.13 times, Kimi K3 17.26 times, GLM-5.2 11.70 times, MiniMax M3 2.69 times, and DeepSeek V4 Pro 1 time.'
    : '按真实 Agent Token 构成计算的 API 相对成本。Claude Fable 5 为 DeepSeek V4 Pro 基准的 58.51 倍，GPT-5.6 Sol 为 30.13 倍，Kimi K3 为 17.26 倍，GLM-5.2 为 11.70 倍，MiniMax M3 为 2.69 倍，DeepSeek V4 Pro 为 1 倍。'

  return (
    <div className="mt-10" role="img" aria-label={chartLabel}>
      <div className="hidden grid-cols-[minmax(145px,0.34fr)_minmax(0,1fr)_96px] items-end gap-5 border-b border-[#d2d2d7] pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#86868b] sm:grid">
        <span>{isEnglish ? 'Model' : '模型'}</span>
        <span className="flex justify-between" aria-hidden="true"><span>0</span><span>10</span><span>20</span><span>30</span><span>40</span><span>50</span><span>60×</span></span>
        <span className="text-right">/ 1M</span>
      </div>

      <div className="divide-y divide-[#e5e5e7]">
        {priceRows.map((row) => (
          <div
            key={row.model}
            data-price-model={row.model}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 py-5 sm:grid-cols-[minmax(145px,0.34fr)_minmax(0,1fr)_96px] sm:gap-5"
          >
            <div className="min-w-0 text-[15px] font-semibold tracking-[-0.01em] text-[#1d1d1f]">
              {row.model}
              {row.baseline && (
                <span className="ml-2 rounded-full bg-[#e7f7ef] px-2 py-0.5 text-[10px] font-semibold text-[#1d7a50]">
                  {isEnglish ? 'Baseline' : '基准'}
                </span>
              )}
            </div>
            <div className="relative col-span-2 h-2.5 overflow-hidden rounded-full bg-[#e8e8ed] sm:col-span-1">
              <span className={`block h-full min-w-[3px] rounded-full ${row.tone}`} style={{ width: `${row.width}%` }} />
            </div>
            <div className="row-start-1 text-right sm:row-auto">
              <strong className="block text-[17px] font-semibold tabular-nums text-[#1d1d1f]">{row.multiple.toFixed(2)}×</strong>
              <span className="text-xs tabular-nums text-[#86868b]">${row.cost.toFixed(3)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OfficialBenchmarkList({ isEnglish }: { isEnglish: boolean }) {
  return (
    <div className="mt-10 border-t border-[#d2d2d7]" role="list" aria-label={isEnglish ? 'Provider-reported official benchmark claims for six models' : '六个模型由厂商公布的官方评测与排名'}>
      {officialBenchmarkClaims.map((item) => (
        <article
          key={item.model}
          data-official-benchmark={item.model}
          className="grid gap-5 border-b border-[#e5e5e7] py-7 md:grid-cols-[minmax(150px,0.72fr)_minmax(0,1.35fr)_minmax(260px,0.95fr)_auto] md:items-center md:gap-8"
          role="listitem"
        >
          <div>
            <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-[#1d1d1f]">{item.model}</h3>
            <p className="mt-1 text-xs text-[#86868b]">{item.provider}</p>
          </div>

          <p className="max-w-[52ch] text-sm leading-relaxed text-[#515154]">
            {isEnglish ? item.claim.en : item.claim.zh}
          </p>

          <dl className="grid grid-cols-2 gap-3">
            {item.metrics.map((metric) => (
              <div key={metric.label} className="border-l border-[#d2d2d7] pl-3">
                <dt className="text-[10px] font-medium leading-tight text-[#86868b]">{metric.label}</dt>
                <dd className="mt-1 text-[15px] font-semibold tabular-nums text-[#1d1d1f]">
                  {isEnglish ? metric.value.en : metric.value.zh}
                </dd>
              </div>
            ))}
          </dl>

          <a
            href={item.href}
            target="_blank"
            rel="noreferrer"
            data-official-source={item.provider}
            className="w-fit shrink-0 text-sm font-medium text-[#0066cc] underline decoration-[#b8d9ff] underline-offset-4 transition-colors hover:text-[#004f9e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0071e3] active:scale-[0.98]"
          >
            {isEnglish ? 'Official source' : '官方来源'} ↗
          </a>
        </article>
      ))}
    </div>
  )
}

const currentLabRoutes: Record<string, string> = {
  '2d': '/lab/2d',
  '3d': '/lab/3d',
  vision: '/lab/vision',
  aesthetic: '/lab/aesthetic',
}

function CurrentLabResults({
  isEnglish,
  path,
  bundlePath,
}: {
  isEnglish: boolean
  path: (target: string) => string
  bundlePath: (target: string) => string
}) {
  const { data, loading, error } = useCurrentBenchmarks()

  if (loading) {
    return (
      <section
        className="border-t border-[#d2d2d7] py-16 md:py-20"
        aria-labelledby="current-lab-heading"
        aria-busy="true"
        data-current-lab-results
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0071e3]">02 · Current Lab</p>
        <h2 id="current-lab-heading" className="text-3xl font-semibold tracking-[-0.025em] text-[#1d1d1f] md:text-4xl">
          {isEnglish ? 'Loading the latest hands-on results…' : '正在读取最新实测结果…'}
        </h2>
        <div className="mt-10 divide-y divide-[#e5e5e7] border-y border-[#e5e5e7]">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="grid animate-pulse grid-cols-[2.25rem_minmax(0,1fr)_3.5rem] items-center gap-3 py-5">
              <span className="h-3 rounded bg-[#e8e8ed]" />
              <span className="h-4 max-w-44 rounded bg-[#e8e8ed]" />
              <span className="h-5 rounded bg-[#e8e8ed]" />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section
        className="border-t border-[#d2d2d7] py-16 md:py-20"
        aria-labelledby="current-lab-heading"
        data-current-lab-results
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0071e3]">02 · Current Lab</p>
        <h2 id="current-lab-heading" className="text-3xl font-semibold tracking-[-0.025em] text-[#1d1d1f] md:text-4xl">
          {isEnglish ? 'The latest results could not be loaded.' : '最新实测数据暂时没有加载成功。'}
        </h2>
        <p className="mt-4 max-w-[62ch] text-sm leading-relaxed text-[#6e6e73]">
          {isEnglish
            ? 'The API pricing and official-source sections remain available. Open the Lab for the current score pages and submitted builds.'
            : 'API 价格与厂商官方来源仍可正常查看；当前分数页和原作请先从实验室进入。'}
        </p>
        <Link
          to={path('/lab')}
          className="mt-6 inline-flex text-sm font-medium text-[#0066cc] underline decoration-[#b8d9ff] underline-offset-4 hover:text-[#004f9e]"
        >
          {isEnglish ? 'Open the current Lab' : '打开当前实验室'} →
        </Link>
      </section>
    )
  }

  if (!data || data.summary.overall.length === 0) {
    return (
      <section
        className="border-t border-[#d2d2d7] py-16 md:py-20"
        aria-labelledby="current-lab-heading"
        data-current-lab-results
      >
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0071e3]">02 · Current Lab</p>
        <h2 id="current-lab-heading" className="text-3xl font-semibold tracking-[-0.025em] text-[#1d1d1f] md:text-4xl">
          {isEnglish ? 'No frozen results are available yet.' : '当前还没有可公开的冻结结果。'}
        </h2>
      </section>
    )
  }

  const modelsById = new Map(data.metadata.models.map((model) => [model.id, model]))
  const k3Build = data.tasks['2d']?.models.k3?.playHref

  return (
    <section
      className="border-t border-[#d2d2d7] py-16 md:py-20"
      aria-labelledby="current-lab-heading"
      data-current-lab-results
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0071e3]">02 · Current Lab</p>
          <h2 id="current-lab-heading" className="text-3xl font-semibold tracking-[-0.025em] text-[#1d1d1f] md:text-4xl">
            {isEnglish ? 'Eight models, four hands-on tests' : '八模型四项实测'}
          </h2>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-[#6e6e73] md:text-right">
          {isEnglish
            ? `Frozen ${data.metadata.dateRange}. Quality scores only; time and tokens stay separate.`
            : `冻结于 ${data.metadata.dateRange}。这里只排成品质量分，时间与 Token 继续单列。`}
        </p>
      </div>

      <div
        className="mt-10 divide-y divide-[#e5e5e7] border-y border-[#d2d2d7]"
        role="list"
        aria-label={isEnglish ? 'Current hands-on quality ranking across eight models' : '当前八模型实测质量排名'}
      >
        {data.summary.overall.map((row, index) => {
          const model = modelsById.get(row.model)
          if (!model) return null
          return (
            <article
              key={row.model}
              data-current-lab-model={row.model}
              className="grid grid-cols-[2.25rem_minmax(0,1fr)_3.5rem] items-center gap-x-3 gap-y-2 py-4 sm:grid-cols-[2.25rem_minmax(9rem,0.7fr)_minmax(8rem,1fr)_3.5rem] sm:gap-x-5"
              role="listitem"
            >
              <span className="text-xs tabular-nums text-[#86868b]">#{index + 1}</span>
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold text-[#1d1d1f]">{model.label}</h3>
                <p className="mt-0.5 text-[11px] text-[#86868b]">
                  {row.tasksCount === 4
                    ? (isEnglish ? '4 tasks' : '4 项')
                    : (isEnglish ? '3 completed tasks' : '完成 3 项')}
                </p>
              </div>
              <div className="col-span-2 col-start-2 h-2 overflow-hidden rounded-full bg-[#e8e8ed] sm:col-span-1 sm:col-start-auto" aria-hidden="true">
                <span className="block h-full rounded-full" style={{ width: `${row.score}%`, backgroundColor: model.color }} />
              </div>
              <strong className="col-start-3 row-start-1 text-right text-lg font-semibold tabular-nums text-[#1d1d1f] sm:col-start-auto sm:row-start-auto">
                {row.score.toFixed(1)}
              </strong>
            </article>
          )
        })}
      </div>

      <div className="mt-12">
        <h3 className="text-xl font-semibold tracking-[-0.015em] text-[#1d1d1f]">
          {isEnglish ? 'Score pages, prompts, and submitted builds' : '分数、Prompt 与原作入口'}
        </h3>
        <div className="mt-5 divide-y divide-[#e5e5e7] border-y border-[#d2d2d7]">
          {data.metadata.taskOrder.map((taskId) => {
            const task = data.tasks[taskId]
            const route = currentLabRoutes[taskId]
            if (!task || !route) return null
            const topResult = data.metadata.models
              .map((model) => ({ model, score: task.models[model.id]?.score }))
              .filter((item): item is { model: typeof item.model; score: number } => item.score !== null && item.score !== undefined)
              .sort((left, right) => right.score - left.score)[0]
            return (
              <Link
                key={taskId}
                to={path(route)}
                data-current-task-link={taskId}
                className="group grid gap-2 py-5 transition-colors hover:text-[#004f9e] active:scale-[0.99] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6"
              >
                <div>
                  <span className="text-xs text-[#86868b]">{localizeText(task.project, isEnglish)}</span>
                  <h4 className="mt-1 text-[17px] font-semibold text-[#1d1d1f] group-hover:text-[#004f9e]">
                    {localizeText(task.name, isEnglish)}
                  </h4>
                </div>
                <span className="text-sm font-medium text-[#0066cc]">
                  {topResult ? `${topResult.model.shortLabel} ${topResult.score.toFixed(1)} · ` : ''}
                  {isEnglish ? 'Open evidence' : '打开实测'} →
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 border-l-2 border-[#8b6edb] bg-[#f7f5fb] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-[#515154]">
          {isEnglish
            ? 'Kimi K3’s 2D score is 88.3. The Lab now points to the uncapped retest build.'
            : 'Kimi K3 的 2D 得分为 88.3，实验室已切换到撤掉时限后的复测最新版。'}
        </p>
        {k3Build && (
          <a
            href={bundlePath(k3Build)}
            data-k3-latest-build
            className="shrink-0 text-sm font-medium text-[#0066cc] underline decoration-[#b8d9ff] underline-offset-4 hover:text-[#004f9e] active:scale-[0.98]"
          >
            {isEnglish ? 'Open latest K3 build' : '打开 K3 最新原作'} ↗
          </a>
        )}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-[#86868b]">
        {isEnglish
          ? 'These are Kevin AI Lab hands-on results from the same-task workflow. The provider-reported claims below use different test sets and remain a separate evidence layer.'
          : '以上是 Kevin AI Lab 的同题实测；下方厂商自报来自不同测试集，继续作为独立证据层呈现，不与本轮实测混成一个总榜。'}
      </p>
    </section>
  )
}

export default function ModelPriceBenchmark() {
  const { isEnglish, path, bundlePath } = useLocale()

  return (
    <>
      <SEOHead
        title={isEnglish ? 'API Price & Official Benchmarks' : '模型 API 价格与官方评测'}
        description={isEnglish ? 'Compare six model API costs, review the latest four hands-on tests across eight models, and verify provider-reported benchmark claims at their official sources.' : '比较六个模型的 API 成本，同步查看八模型四项最新实测，并回查各厂商公开评测与原始来源。'}
      />
      <section className="min-h-[100dvh] bg-[#ffffff] pb-24 pt-28 text-[#1d1d1f] md:pb-32 md:pt-32" data-model-price-benchmark>
        <div className="mx-auto max-w-[1200px] px-4 md:px-6">
          <Link
            to={path('/lab')}
            className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-[#0066cc] transition-colors hover:text-[#004f9e]"
          >
            <span aria-hidden="true">←</span> {isEnglish ? 'Back to all tests' : '返回全部实测'}
          </Link>

          <header className="grid gap-10 border-b border-[#d2d2d7] pb-14 md:grid-cols-[minmax(0,1.45fr)_minmax(250px,0.55fr)] md:items-end md:gap-16">
            <div>
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#0071e3]">API price · real agent mix</p>
              <h1 className="max-w-[760px] text-4xl font-semibold leading-[1.08] tracking-[-0.035em] text-[#1d1d1f] md:text-6xl">
                {isEnglish ? 'What a high cache-hit rate does to model cost.' : '缓存命中率拉高后，模型成本差多少。'}
              </h1>
              <p className="mt-6 max-w-[66ch] text-base leading-relaxed text-[#6e6e73] md:text-lg">
                {isEnglish
                  ? 'This comparison uses the token mix from our daily agent workflow: 94.7% cached input, 4.8% uncached input, and 0.5% output. It is not a cold-start estimate.'
                  : '这里不用“全部冷启动”的理想化口径，而是按日常 Agent 工作流的真实构成计算：94.7% 缓存输入、4.8% 未缓存输入、0.5% 输出。'}
              </p>
            </div>
            <div className="border-l-2 border-[#0071e3] pl-5">
              <span className="block text-sm text-[#6e6e73]">{isEnglish ? 'Lowest in this mix' : '这套用量中最低'}</span>
              <strong className="mt-2 block text-3xl font-semibold tracking-[-0.03em] text-[#1d1d1f]">DeepSeek V4 Pro</strong>
              <span className="mt-2 block text-sm font-medium text-[#1d7a50]">1.00× · $0.029 / 1M</span>
            </div>
          </header>

          <section className="py-16 md:py-20" aria-labelledby="price-heading">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0071e3]">01 · API cost</p>
                <h2 id="price-heading" className="text-3xl font-semibold tracking-[-0.025em] text-[#1d1d1f] md:text-4xl">DeepSeek V4 Pro = 1×</h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-[#6e6e73] md:text-right">
                {isEnglish ? 'Standard API channels, excluding tool-call fees. Dollar values show the estimated cost per one million total tokens in this mix.' : '按标准 API 通道估算，不含工具调用费；美元金额是这套构成下每 100 万总 Token 的成本。'}
              </p>
            </div>
            <PriceChart isEnglish={isEnglish} />
            <p className="mt-6 text-xs leading-relaxed text-[#86868b]">
              {isEnglish ? 'Pricing snapshot: July 19, 2026. Provider pricing and long-context tiers can change; recalculate before making a purchasing decision.' : '价格快照：2026-07-19。厂商价格及长上下文阶梯可能调整，正式采购前请重新核算。'}
            </p>
            <details className="mt-4 border-t border-[#e5e5e7] pt-4 text-xs text-[#6e6e73]">
              <summary className="w-fit cursor-pointer font-medium text-[#0066cc] marker:text-[#86868b]">
                {isEnglish ? 'Official pricing sources' : '查看六家官方定价来源'}
              </summary>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {pricingSources.map((source) => (
                  <a key={source.label} href={source.href} target="_blank" rel="noreferrer" className="underline decoration-[#b8d9ff] underline-offset-4 hover:text-[#004f9e]">
                    {source.label}
                  </a>
                ))}
              </div>
            </details>
          </section>

          <CurrentLabResults isEnglish={isEnglish} path={path} bundlePath={bundlePath} />

          <section className="border-t border-[#d2d2d7] py-16 md:py-20" aria-labelledby="benchmark-heading">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0071e3]">03 · Official benchmark claims</p>
                <h2 id="benchmark-heading" className="text-3xl font-semibold tracking-[-0.025em] text-[#1d1d1f] md:text-4xl">
                  {isEnglish ? 'Official benchmarks and rankings' : '官方公开评测与排名'}
                </h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-[#6e6e73] md:text-right">
                {isEnglish ? 'All results below are provider-reported. Test sets, harnesses, reasoning effort, and release dates differ, so they do not form one directly comparable leaderboard.' : '以下均为厂商官方自报。测试集、Harness、推理强度和发布时间不同，不能据此直接合成统一总榜。'}
              </p>
            </div>
            <OfficialBenchmarkList isEnglish={isEnglish} />
            <p className="mt-6 text-xs leading-relaxed text-[#86868b]">
              {isEnglish ? 'Sources checked July 20, 2026. Wording is condensed from each provider’s official page; open the source on each row for methodology and full context.' : '来源核查：2026-07-20。这里压缩呈现厂商官方页面口径；评测方法和完整上下文请打开每行的官方来源查看。'}
            </p>
          </section>
        </div>
      </section>
    </>
  )
}
