import { useEffect, useMemo, useState } from 'react'
import SEOHead from '../components/SEOHead'
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
  title: string
  generated_at: string
  not_a_general_model_leaderboard: boolean
  labels: Record<string, string>
  dataset_checks: {
    category_distribution: Record<string, number>
    difficulty_distribution: Record<string, number>
  }
  cases: VisionCase[]
  public_note: string
}

const systemMeta = [
  { key: 'kimi', label: 'Kimi K3', color: '#7256B8' },
  { key: 'codex', label: 'Codex', color: '#2B746D' },
  { key: 'm3', label: 'MiniMax M3', color: '#F06D2F' },
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

export default function LabVisionReview() {
  const { isEnglish } = useLocale()
  const [data, setData] = useState<VisionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState('all')
  const [difficulty, setDifficulty] = useState('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

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
    return data.cases.filter((c) => {
      const catOk = category === 'all' || c.category === category
      const difOk = difficulty === 'all' || c.difficulty === difficulty
      return catOk && difOk
    })
  }, [data, category, difficulty])

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <>
      <SEOHead title={isEnglish ? '50-Image Public Review' : '50 图视觉识别公开审阅'} />
      <section className="pt-24 pb-20 md:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="max-w-3xl mb-10">
            <span className="text-xs uppercase tracking-widest text-pitch-500 mb-2 block">Vision Review</span>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
              {isEnglish ? '50-image public review' : '50 图视觉识别公开审阅'}
            </h1>
            <p className="text-graphite-200 leading-relaxed">
              {isEnglish
                ? 'Fifty strictly valid items: 10 categories with 5 items each, split into 15 easy, 20 medium, and 15 hard. Filter the frozen images by category and difficulty, then inspect ground truth and all three answers.'
                : '严格有效 50 题，10 类 × 5 题，easy 15 / medium 20 / hard 15。可按类别和难度筛选，查看冻结图片、题面、真值与三家答案。'}
            </p>
            {data?.not_a_general_model_leaderboard && (
              <p className="mt-3 text-sm text-pitch-400">
                {isEnglish ? 'This is not a universal vision-model leaderboard. It is a reproducible result from three local tool chains on July 18, 2026.' : '这不是通用视觉模型排行榜，只是 2026-07-18 三条本地调用链的可复核结果。'}
              </p>
            )}
            {isEnglish && (
              <p className="mt-3 text-sm text-graphite-400">
                Question wording, answer options, and frozen ground truth remain in the original Chinese so the public evidence is not silently rewritten in translation.
              </p>
            )}
          </div>

          {data && (
            <div className="flex flex-wrap gap-4 mb-8">
              <div className="flex items-center gap-2">
                <label htmlFor="category" className="text-sm text-graphite-400">
                  {isEnglish ? 'Category' : '类别'}
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-graphite-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="all">{isEnglish ? 'All' : '全部'}</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {isEnglish ? categoryEnglish[c] ?? c : c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="difficulty" className="text-sm text-graphite-400">
                  {isEnglish ? 'Difficulty' : '难度'}
                </label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="bg-graphite-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="all">{isEnglish ? 'All' : '全部'}</option>
                  {difficulties.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-graphite-500 self-center">
                {isEnglish ? `Showing ${filtered.length} of ${data.cases.length}` : `显示 ${filtered.length} / ${data.cases.length} 题`}
              </p>
            </div>
          )}

          {loading && <p className="text-graphite-400" role="status" aria-live="polite">{isEnglish ? 'Loading public data…' : '数据加载中…'}</p>}
          {error && <p className="text-red-400" role="alert">{isEnglish ? 'Unable to load data' : '数据加载失败'}：{error}</p>}

          {data && (
            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => {
                const isExpanded = expanded.has(c.id)
                return (
                  <div
                    key={c.id}
                    className="self-start rounded-xl border border-white/5 bg-graphite-900/30 overflow-hidden flex flex-col"
                  >
                    <button
                      onClick={() => toggle(c.id)}
                      data-case-id={c.id}
                      className="text-left p-4 flex-1 hover:bg-white/[0.02] transition-colors"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-graphite-400">{c.id}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-graphite-300">
                          {c.difficulty}
                        </span>
                      </div>
                      <p className="text-sm text-graphite-200 line-clamp-2 mb-2">{c.question}</p>
                      <img
                        src={c.image}
                        alt={`${isEnglish ? 'Item' : '题目'} ${c.id}`}
                        loading="lazy"
                        className="w-full h-32 object-contain rounded-lg bg-graphite-950/50"
                      />
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-white/5 pt-3">
                        <p className="text-xs text-graphite-500 mb-2">{isEnglish ? categoryEnglish[c.category] ?? c.category : c.category}</p>
                        <ul className="space-y-1 mb-3">
                          {c.options.map((opt, idx) => {
                            const letter = ['A', 'B', 'C', 'D'][idx]
                            const isCorrect = letter === c.correct_answer
                            return (
                              <li
                                key={idx}
                                className={`text-sm ${isCorrect ? 'text-pitch-400 font-medium' : 'text-graphite-300'}`}
                              >
                                {letter}. {opt}
                              </li>
                            )
                          })}
                        </ul>
                        <div className="grid grid-cols-3 gap-2">
                          {systemMeta.map((sys) => {
                            const r = c.results[sys.key as keyof typeof c.results]
                            return (
                              <div
                                key={sys.key}
                                className="rounded-lg bg-graphite-950/50 p-2 text-center"
                                style={{ borderTop: `2px solid ${sys.color}` }}
                              >
                                <p className="text-xs text-graphite-400">{sys.label}</p>
                                <p
                                  className={`text-sm font-medium ${
                                    r.correct ? 'text-pitch-400' : 'text-red-400'
                                  }`}
                                >
                                  {r.answer}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {data && <p className="mt-8 text-xs text-graphite-500">{isEnglish ? 'Only final answers, correctness, and filtered evidence are public. Raw stdout, stderr, local paths, and private manifests are excluded.' : data.public_note}</p>}
        </div>
      </section>
    </>
  )
}
