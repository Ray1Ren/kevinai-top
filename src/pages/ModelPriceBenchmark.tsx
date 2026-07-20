import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
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

export default function ModelPriceBenchmark() {
  const { isEnglish, path } = useLocale()

  return (
    <>
      <SEOHead
        title={isEnglish ? 'API Price & Official Benchmarks' : '模型 API 价格与官方评测'}
        description={isEnglish ? 'Compare six model API costs using a real agent token mix, then review each provider’s official benchmark claims and source.' : '按真实 Agent Token 构成比较六个模型的 API 成本，并查看各厂商公开的官方评测、排名与原始来源。'}
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

          <section className="border-t border-[#d2d2d7] py-16 md:py-20" aria-labelledby="benchmark-heading">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0071e3]">02 · Official benchmark claims</p>
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
