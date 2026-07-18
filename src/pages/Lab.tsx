import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
import { useBenchmarks } from '../hooks/useBenchmarks'
import ScoreTable from '../components/ScoreTable'
import BenchmarkViz from '../components/BenchmarkViz'
import { useLocale } from '../hooks/useLocale'

const taskCardsZh = [
  {
    slug: '2d',
    title: '2D 小游戏',
    project: '弹弓攻城',
    date: '2026-07-17',
    summary: 'Codex 95.0 最稳；K3 79.4 完成度高但二三关漂移；MiniMax M3 68.1 纵向瞄准约束反了，高处目标难命中。',
  },
  {
    slug: '3d',
    title: '3D 小游戏',
    project: '破门点',
    date: '2026-07-18',
    summary: '纯质量分 K3 88.8 第一，画面与体感盲评第一；Codex 86.5 最均衡；MiniMax M3 79.5 完整通过 QA。',
  },
  {
    slug: 'promo',
    title: '宣传页 HTML',
    project: '一脚晋级宣传页',
    date: '2026-07-18',
    summary: 'Codex 94.4 成品质感第一；MiniMax M3 93.3 信息层级最均衡；K3 90.0 完整但首屏密度可优化。',
  },
  {
    slug: 'vision',
    title: '图片识别',
    project: '50 图视觉识别',
    date: '2026-07-18',
    summary: 'K3 97.5 领先，49/50；Codex 92.6；MiniMax M3 90.8。速度不计入本榜。',
  },
]

const taskCardsEn = [
  { slug: '2d', title: '2D Web Game', project: 'Sling Siege', date: '2026-07-17', summary: 'Codex led at 95.0 for stability. K3 reached 79.4 with strong completion but physics drift. MiniMax M3 scored 68.1 after a reversed vertical aiming constraint made high targets difficult.' },
  { slug: '3d', title: '3D Web Game', project: 'Breach Point', date: '2026-07-18', summary: 'K3 ranked first on pure quality at 88.8. Codex was the most balanced at 86.5. MiniMax M3 scored 79.5 and passed the complete QA route.' },
  { slug: 'promo', title: 'Promotion Page', project: 'One Kick', date: '2026-07-18', summary: 'Codex led on finished quality at 94.4. MiniMax M3 reached 93.3 with the clearest hierarchy. K3 scored 90.0 with a complete but denser opening.' },
  { slug: 'vision', title: 'Image Recognition', project: '50 frozen images', date: '2026-07-18', summary: 'K3 led this local tool-chain test at 97.5 and 49/50. Codex scored 92.6 and MiniMax M3 90.8. Speed did not affect the ranking.' },
]

export default function Lab() {
  const { data, loading, error } = useBenchmarks()
  const { isEnglish, path } = useLocale()
  const taskCards = isEnglish ? taskCardsEn : taskCardsZh

  return (
    <>
      <SEOHead
        title={isEnglish ? 'Evaluation Lab' : '四类评测总控实验室'}
        description={isEnglish ? 'Reproducible AI coding evaluations with directly playable builds, final scores, and filterable visual evidence.' : '可复核的 AI 编码评测：直接试玩原作、查看最终分数与可筛选视觉证据。'}
      />
      <section className="pt-24 pb-20 md:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="max-w-2xl mb-16">
            <span className="text-xs uppercase tracking-widest text-pitch-500 mb-2 block">Lab</span>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
              {isEnglish ? 'Evaluation lab' : '四类评测总控实验室'}
            </h1>
            <p className="text-graphite-200 leading-relaxed">
              {isEnglish
                ? 'Run from July 17 to July 18, 2026 on the same machine with consistent Chrome QA and real screen recordings. Within each of the 2D, 3D, and promotion-page tasks, every system received the same brief, empty directory, and inputs. Vision used one frozen, strictly valid 50-image set. Speed and quality remain separate.'
                : '2026-07-17 至 2026-07-18，在同一台机器上运行，统一 Chrome QA 和真实录屏。2D、3D、宣传页三类各自在本类内部使用同题任务书、空目录与一致输入；图片识别使用同一套冻结的严格有效 50 图。速度分与质量分严格区分。'}
            </p>
          </div>

          {loading && <p className="text-graphite-400" role="status" aria-live="polite">{isEnglish ? 'Loading evaluation results…' : '评测结果加载中…'}</p>}
          {error && <p className="text-red-400" role="alert">{isEnglish ? 'Unable to load data' : '数据加载失败'}：{error}</p>}

          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
              <BenchmarkViz data={data} />
              <ScoreTable data={data} />
            </div>
          )}

          {data && (
            <p className="text-xs text-graphite-500 mb-16 -mt-8">{data.metadata.scoringNote}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {taskCards.map((card) => (
              <Link
                key={card.slug}
                to={path(`/lab/${card.slug}`)}
                className="group p-6 rounded-2xl border border-white/5 bg-graphite-900/30 hover:border-pitch-500/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-graphite-400">{card.project}</span>
                  <span className="text-xs text-graphite-500">{card.date}</span>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-pitch-500 transition-colors">
                  {card.title}
                </h2>
                <p className="text-sm text-graphite-300 leading-relaxed">{card.summary}</p>
                <span className="inline-flex items-center mt-4 text-sm text-pitch-500 group-hover:text-pitch-400 transition-colors">
                  {isEnglish ? 'View evidence' : '查看详情'} <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
