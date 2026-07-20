import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
import { useBenchmarks } from '../hooks/useBenchmarks'
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

type ModelKey = 'kimi' | 'codex' | 'minimax'

const benchmarkModels: Array<{ key: ModelKey; name: string; dot: string }> = [
  { key: 'kimi', name: 'Kimi K3', dot: 'bg-[#7256b8]' },
  { key: 'codex', name: 'GPT-5.6 Sol', dot: 'bg-[#2b746d]' },
  { key: 'minimax', name: 'MiniMax M3', dot: 'bg-[#f06d2f]' },
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

function BenchmarkTable({ isEnglish }: { isEnglish: boolean }) {
  const { data, loading, error } = useBenchmarks()

  if (loading) {
    return (
      <div className="mt-8 space-y-3" role="status" aria-live="polite" aria-label={isEnglish ? 'Loading benchmark scores' : '正在加载实测评分'}>
        {[0, 1, 2].map((row) => <div key={row} className="h-20 animate-pulse rounded-2xl bg-[#f0f0f2]" />)}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mt-8 rounded-2xl border border-[#ffb4ab] bg-[#fff1f0] p-5 text-sm text-[#9f1c13]" role="alert">
        {isEnglish ? 'The benchmark data could not be loaded.' : '实测评分暂时加载失败。'} {error}
      </div>
    )
  }

  const taskRows = data.summary.table.slice(0, 4)
  const totalRow = data.summary.table[4]

  return (
    <div className="mt-8" role="table" aria-label={isEnglish ? 'Four hands-on quality scores for Kimi K3, GPT-5.6 Sol, and MiniMax M3' : 'Kimi K3、GPT-5.6 Sol 和 MiniMax M3 的四项实测质量评分'}>
      <div className="sr-only md:grid md:grid-cols-[1.25fr_0.65fr_repeat(4,1fr)] md:gap-4 md:border-b md:border-[#d2d2d7] md:px-5 md:pb-3 md:text-[11px] md:font-medium md:uppercase md:tracking-[0.08em] md:text-[#86868b]" role="row">
        <span role="columnheader">{isEnglish ? 'Model' : '模型'}</span>
        <span role="columnheader">{isEnglish ? 'Overall' : '总分'}</span>
        {taskRows.map((row) => <span key={row.task} role="columnheader">{row.task}</span>)}
      </div>

      <div className="space-y-3 pt-3">
        {benchmarkModels.map((model) => {
          const total = totalRow[model.key]
          const winner = model.key === 'codex'
          return (
            <div
              key={model.key}
              data-benchmark-model={model.key}
              className={`grid grid-cols-2 gap-3 rounded-2xl border p-5 md:grid-cols-[1.25fr_0.65fr_repeat(4,1fr)] md:items-center md:gap-4 ${winner ? 'border-[#b8d9ff] bg-[#f1f7ff]' : 'border-[#e5e5e7] bg-[#fafafa]'}`}
              role="row"
            >
              <div className="col-span-2 flex items-center gap-2 text-[15px] font-semibold text-[#1d1d1f] md:col-span-1" role="rowheader">
                <span className={`h-2.5 w-2.5 rounded-full ${model.dot}`} aria-hidden="true" />
                {model.name}
              </div>
              <div role="cell">
                <span className="block text-[10px] font-medium uppercase tracking-[0.08em] text-[#86868b] md:hidden">{isEnglish ? 'Overall' : '总分'}</span>
                <strong className="text-2xl font-semibold tabular-nums tracking-[-0.03em] text-[#1d1d1f]">{total.toFixed(1)}</strong>
                {winner && <span className="ml-2 rounded-full bg-[#dcecff] px-2 py-0.5 text-[10px] font-semibold text-[#0064c8]">{isEnglish ? 'Top' : '最高'}</span>}
              </div>
              {taskRows.map((row) => (
                <div key={row.task} role="cell">
                  <span className="block truncate text-[10px] font-medium uppercase tracking-[0.06em] text-[#86868b] md:hidden">{row.task}</span>
                  <span className="text-[15px] font-semibold tabular-nums text-[#1d1d1f]">{row[model.key].toFixed(1)}</span>
                  <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[#e5e5e7]" aria-hidden="true">
                    <span className={`block h-full rounded-full ${model.dot}`} style={{ width: `${row[model.key]}%` }} />
                  </span>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ModelPriceBenchmark() {
  const { isEnglish, path } = useLocale()

  return (
    <>
      <SEOHead
        title={isEnglish ? 'API Price vs Hands-on Score' : '模型 API 价格与实测评分'}
        description={isEnglish ? 'Compare six model API costs using a real agent token mix, then place the three tested systems beside their four hands-on quality scores.' : '按真实 Agent Token 构成比较六个模型的 API 成本，并对照三套实际完成四项任务的质量评分。'}
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
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#0071e3]">02 · Hands-on benchmark</p>
                <h2 id="benchmark-heading" className="text-3xl font-semibold tracking-[-0.025em] text-[#1d1d1f] md:text-4xl">
                  {isEnglish ? 'Four quality scores' : '四项质量评分'}
                </h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-[#6e6e73] md:text-right">
                {isEnglish ? 'Only the three systems we actually ran are shown here. Each task contributes 25%; speed is reported separately and does not affect quality.' : '这里仅列实际跑完四项任务的三套系统。每项各占 25%，速度单列，不计入质量分。'}
              </p>
            </div>
            <BenchmarkTable isEnglish={isEnglish} />
            <p className="mt-6 text-xs leading-relaxed text-[#86868b]">
              {isEnglish ? 'Hands-on runs: July 17–18, 2026. Scores load from the same published dataset used by the main Lab page.' : '实测时间：2026-07-17 至 2026-07-18。评分直接读取主实验室同一份已发布数据，避免两个页面口径漂移。'}
            </p>
          </section>
        </div>
      </section>
    </>
  )
}
