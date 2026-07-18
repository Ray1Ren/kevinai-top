import { useEffect, useMemo, useState } from 'react'
import { useLocale } from '../hooks/useLocale'

interface CaseResult {
  answer: string
  correct: boolean
  confidence: number | null
}

interface VisionCase {
  id: string
  category: string
  difficulty: string
  question: string
  options: string[]
  correct_answer: string
  image: string
  results: {
    kimi: CaseResult
    codex: CaseResult
    m3: CaseResult
  }
}

interface VisionData {
  not_a_general_model_leaderboard: boolean
  dataset_checks: {
    category_distribution: Record<string, number>
    difficulty_distribution: Record<string, number>
  }
  cases: VisionCase[]
}

type ResultFilter = 'all' | 'disagree' | 'anywrong' | 'allcorrect' | 'wrong:kimi' | 'wrong:m3' | 'wrong:codex'

const systemMeta = [
  { key: 'kimi' as const, label: 'K3', color: '#7256B8' },
  { key: 'codex' as const, label: 'Codex', color: '#2B746D' },
  { key: 'm3' as const, label: 'M3', color: '#F06D2F' },
]

const categoryEnglish: Record<string, string> = {
  'UI 与信息截图': 'UI and information screenshots',
  '图表推断': 'Chart inference',
  '图表读数': 'Chart reading',
  '场景文字': 'Text in scenes',
  '复杂场景计数': 'Counting in complex scenes',
  '工程图与电路图': 'Engineering and circuit diagrams',
  '文档与表格': 'Documents and tables',
  '日常物体': 'Everyday objects',
  '科学示意图': 'Scientific diagrams',
  '细粒度空间关系': 'Fine-grained spatial relations',
}

interface VisionReviewGridProps {
  showHeading?: boolean
}

export default function VisionReviewGrid({ showHeading = true }: VisionReviewGridProps) {
  const { isEnglish } = useLocale()
  const [data, setData] = useState<VisionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all')
  const [category, setCategory] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [lightbox, setLightbox] = useState<VisionCase | null>(null)

  useEffect(() => {
    fetch('/data/vision-cases.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((json: VisionData) => {
        setData(json)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err))
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!lightbox) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [lightbox])

  const categories = useMemo(
    () => (data ? Object.keys(data.dataset_checks.category_distribution) : []),
    [data],
  )
  const difficulties = useMemo(
    () => (data ? Object.keys(data.dataset_checks.difficulty_distribution) : []),
    [data],
  )

  const filtered = useMemo(() => {
    if (!data) return []
    return data.cases.filter((item) => {
      const results = Object.values(item.results)
      const answers = new Set(results.map((result) => result.answer))
      const resultOk =
        resultFilter === 'all' ||
        (resultFilter === 'disagree' && answers.size > 1) ||
        (resultFilter === 'anywrong' && results.some((result) => !result.correct)) ||
        (resultFilter === 'allcorrect' && results.every((result) => result.correct)) ||
        (resultFilter === 'wrong:kimi' && !item.results.kimi.correct) ||
        (resultFilter === 'wrong:m3' && !item.results.m3.correct) ||
        (resultFilter === 'wrong:codex' && !item.results.codex.correct)
      const categoryOk = category === 'all' || item.category === category
      const difficultyOk = difficulty === 'all' || item.difficulty === difficulty
      return resultOk && categoryOk && difficultyOk
    })
  }, [data, resultFilter, category, difficulty])

  const filterOptions: Array<{ value: ResultFilter; zh: string; en: string }> = [
    { value: 'all', zh: '全部 50 题', en: 'All 50' },
    { value: 'disagree', zh: '三家分歧', en: 'Disagreement' },
    { value: 'anywrong', zh: '至少一家错', en: 'Any miss' },
    { value: 'allcorrect', zh: '三家全对', en: 'All correct' },
    { value: 'wrong:kimi', zh: 'K3 失分', en: 'K3 misses' },
    { value: 'wrong:m3', zh: 'M3 失分', en: 'M3 misses' },
    { value: 'wrong:codex', zh: 'Codex 失分', en: 'Codex misses' },
  ]

  return (
    <div>
      {showHeading && (
        <div className="mb-8 max-w-3xl">
          <span className="mb-2 block text-xs uppercase tracking-widest text-pitch-500">Vision Review</span>
          <h2 className="mb-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            {isEnglish ? 'See every answer' : '直接看 50 题结果'}
          </h2>
          <p className="text-sm leading-relaxed text-graphite-300">
            {isEnglish
              ? 'Every image, option, correct answer, and response from the three systems is shown below. Filter them by result, category, or difficulty.'
              : '每道题的图片、选项、标准答案和三家回答都在下面，可以按结果、类别和难度筛选。'}
          </p>
        </div>
      )}

      {data && (
        <div className="sticky top-16 z-20 -mx-4 mb-6 border-y border-white/10 bg-graphite-950/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-xl md:border md:px-3">
          <div className="flex gap-2 overflow-x-auto pb-2 md:flex-wrap md:overflow-visible md:pb-0" role="group" aria-label={isEnglish ? 'Filter by result' : '按答题结果筛选'}>
            {filterOptions.map((option) => {
              const active = resultFilter === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  data-result-filter={option.value}
                  aria-pressed={active}
                  onClick={() => setResultFilter(option.value)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.98] ${
                    active
                      ? 'border-pitch-500 bg-pitch-600 text-white'
                      : 'border-white/10 bg-graphite-900 text-graphite-300 hover:border-white/25 hover:text-white'
                  }`}
                >
                  {isEnglish ? option.en : option.zh}
                </button>
              )
            })}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 md:flex md:items-center">
            <label className="flex flex-col gap-1 text-[11px] text-graphite-500 md:flex-row md:items-center md:text-xs">
              <span>{isEnglish ? 'Category' : '类别'}</span>
              <select
                id="category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="min-w-0 rounded-lg border border-white/10 bg-graphite-900 px-2.5 py-2 text-xs text-white"
              >
                <option value="all">{isEnglish ? 'All categories' : '全部类别'}</option>
                {categories.map((item) => (
                  <option key={item} value={item}>{isEnglish ? categoryEnglish[item] ?? item : item}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-graphite-500 md:flex-row md:items-center md:text-xs">
              <span>{isEnglish ? 'Difficulty' : '难度'}</span>
              <select
                id="difficulty"
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                className="min-w-0 rounded-lg border border-white/10 bg-graphite-900 px-2.5 py-2 text-xs text-white"
              >
                <option value="all">{isEnglish ? 'All levels' : '全部难度'}</option>
                {difficulties.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <p className="col-span-2 text-xs font-medium text-pitch-400 md:ml-auto" role="status" aria-live="polite">
              {isEnglish ? `${filtered.length} of ${data.cases.length}` : `显示 ${filtered.length} / ${data.cases.length} 题`}
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" role="status" aria-live="polite">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-[520px] animate-pulse rounded-2xl bg-white/[0.04]" />)}
        </div>
      )}
      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300" role="alert">{isEnglish ? 'Unable to load results' : '结果加载失败'}：{error}</p>}

      {data && filtered.length === 0 && (
        <div className="rounded-xl border border-white/10 py-16 text-center text-sm text-graphite-400">
          {isEnglish ? 'No items match these filters.' : '当前筛选条件下没有题目。'}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {filtered.map((item) => {
            const hasMiss = Object.values(item.results).some((result) => !result.correct)
            return (
              <article
                key={item.id}
                data-case-id={item.id}
                className={`self-start overflow-hidden rounded-2xl border bg-graphite-900/35 ${hasMiss ? 'border-red-400/25' : 'border-white/10'}`}
              >
                <button
                  type="button"
                  onClick={() => setLightbox(item)}
                  className="group relative block h-56 w-full overflow-hidden border-b border-white/10 bg-graphite-950/70 p-3 text-left md:h-64"
                  aria-label={`${isEnglish ? 'Enlarge image for' : '放大题图'} ${item.id}`}
                >
                  <img src={item.image} alt={`${isEnglish ? 'Item' : '题目'} ${item.id}`} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.015]" />
                  <span className="absolute bottom-3 right-3 rounded-full border border-white/10 bg-graphite-950/85 px-2.5 py-1 text-[10px] text-graphite-300">
                    {isEnglish ? 'Enlarge' : '放大'}
                  </span>
                </button>

                <div className="p-4 md:p-5">
                  <div className="mb-3 flex items-center justify-between gap-3 text-xs text-graphite-500">
                    <span className="font-mono">{item.id} · {isEnglish ? categoryEnglish[item.category] ?? item.category : item.category}</span>
                    <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5">{item.difficulty}</span>
                  </div>
                  <h3 className="mb-3 text-base font-semibold leading-relaxed text-white">{item.question}</h3>
                  <ol className="mb-4 grid gap-1.5 text-sm sm:grid-cols-2">
                    {item.options.map((option, index) => {
                      const letter = ['A', 'B', 'C', 'D'][index]
                      const correct = letter === item.correct_answer
                      return (
                        <li key={option} className={`rounded-lg border px-3 py-2 ${correct ? 'border-pitch-500/40 bg-pitch-600/10 font-medium text-pitch-300' : 'border-white/5 bg-graphite-950/30 text-graphite-300'}`}>
                          {letter}. {option}
                        </li>
                      )
                    })}
                  </ol>

                  <div className="grid grid-cols-3 gap-2">
                    {systemMeta.map((system) => {
                      const result = item.results[system.key]
                      return (
                        <div key={system.key} className={`rounded-xl border p-2.5 text-center ${result.correct ? 'border-white/10 bg-graphite-950/40' : 'border-red-400/40 bg-red-500/10'}`} style={{ borderTopColor: system.color }}>
                          <p className="mb-1 truncate text-[11px] text-graphite-400">{system.label}</p>
                          <p className={`text-lg font-semibold ${result.correct ? 'text-pitch-400' : 'text-red-400'}`}>{result.answer}</p>
                          <p className="text-[10px] text-graphite-500">{result.correct ? (isEnglish ? 'Correct' : '正确') : (isEnglish ? 'Miss' : '失分')}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {data?.not_a_general_model_leaderboard && (
        <p className="mt-8 text-xs leading-relaxed text-graphite-500">
          {isEnglish
            ? 'This is a reproducible result from three local tool chains on July 18, 2026, not a universal vision-model leaderboard.'
            : '结果范围仅限 2026 年 7 月 18 日测试的这 50 道题和三套本地工具。'}
        </p>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label={`${isEnglish ? 'Expanded item' : '题图放大'} ${lightbox.id}`} onClick={() => setLightbox(null)}>
          <button type="button" onClick={() => setLightbox(null)} className="absolute right-5 top-5 h-10 w-10 rounded-full border border-white/15 bg-graphite-900/90 text-white" aria-label={isEnglish ? 'Close preview' : '关闭预览'}>×</button>
          <div className="max-h-[92dvh] max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <img src={lightbox.image} alt={`${isEnglish ? 'Expanded item' : '题图'} ${lightbox.id}`} className="max-h-[82dvh] max-w-full rounded-lg object-contain" />
            <p className="mt-3 text-center text-sm text-white">{lightbox.id} · {lightbox.question}</p>
          </div>
        </div>
      )}
    </div>
  )
}
