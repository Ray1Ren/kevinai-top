import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
import { useBenchmarks } from '../hooks/useBenchmarks'
import ScoreTable from '../components/ScoreTable'
import BenchmarkViz from '../components/BenchmarkViz'
import BenchmarkEfficiency from '../components/BenchmarkEfficiency'
import { useLocale } from '../hooks/useLocale'

const taskCardsZh = [
  {
    slug: '2d',
    title: '2D 小游戏',
    project: '弹弓攻城',
    date: '2026-07-17',
    image: '/assets/images/lab-card-2d.webp',
    imageAlt: 'Codex 版《弹弓攻城》发射中的实机画面',
    summary: 'Codex 96.0，操作最稳。K3 80.5，第二、三关会自己漂；MiniMax M3 54.5，正常操作过不了第一关。',
  },
  {
    slug: '3d',
    title: '3D 小游戏',
    project: '破门点',
    date: '2026-07-18',
    image: '/assets/images/lab-card-3d.webp',
    imageAlt: 'Kimi K3 版《破门点》持枪交火的实机画面',
    summary: '三套都能玩完：K3 91.0，画面和手感最好；Codex 89.2，流程最顺；MiniMax M3 83.6。',
  },
  {
    slug: 'promo',
    title: '宣传页 HTML',
    project: '一脚晋级宣传页',
    date: '2026-07-18',
    image: '/assets/images/lab-card-promo.webp',
    imageAlt: 'Codex 版《一脚晋级》宣传页三步破门画面',
    summary: 'Codex 95.0，把品牌和可玩挑战做得最完整；K3 91.0，首屏有些挤；MiniMax M3 85.0，交付最快。',
  },
  {
    slug: 'vision',
    title: '图片识别',
    project: '50 图视觉识别',
    date: '2026-07-18',
    image: '/assets/images/lab-card-vision.webp',
    imageAlt: '50 图识别题集中的生活、文字和文档类题目总览',
    summary: 'K3 答对 49/50，得分 96.7；Codex 90.0；MiniMax M3 88.0。速度另算。',
  },
]

const taskCardsEn = [
  { slug: '2d', title: '2D Web Game', project: 'Sling Siege', date: '2026-07-17', image: '/assets/images/lab-card-2d.webp', imageAlt: 'Codex build of Sling Siege during a launch', summary: 'Codex scored 96.0 and felt the most reliable. K3 scored 80.5 with drifting later levels. MiniMax M3 scored 54.5 and could not clear level one through normal play.' },
  { slug: '3d', title: '3D Web Game', project: 'Breach Point', date: '2026-07-18', image: '/assets/images/lab-card-3d.webp', imageAlt: 'Kimi K3 build of Breach Point during combat', summary: 'All three can be finished. K3 scored 91.0 with the best feel, Codex scored 89.2 with the smoothest flow, and MiniMax M3 scored 83.6.' },
  { slug: 'promo', title: 'Promotion Page', project: 'One Kick', date: '2026-07-18', image: '/assets/images/lab-card-promo.webp', imageAlt: 'Codex promotion page after completing the three-move challenge', summary: 'Codex scored 95.0 and tied the brand and playable challenge together best. K3 scored 91.0 with a crowded opening. MiniMax M3 scored 85.0 and shipped fastest.' },
  { slug: 'vision', title: 'Image Recognition', project: '50-image test', date: '2026-07-18', image: '/assets/images/lab-card-vision.webp', imageAlt: 'Overview of everyday, text, and document items in the 50-image set', summary: 'K3 answered 49/50 and scored 96.7. Codex scored 90.0 and MiniMax M3 scored 88.0. Speed is listed separately.' },
]

export default function Lab() {
  const { data, loading, error } = useBenchmarks()
  const { isEnglish, path } = useLocale()
  const taskCards = isEnglish ? taskCardsEn : taskCardsZh

  return (
    <>
      <SEOHead
        title={isEnglish ? 'Four AI Tests' : '四项 AI 实测'}
        description={isEnglish ? 'Play the submitted 2D and 3D games, view the promotion pages, and inspect all 50 image-recognition answers.' : '直接玩三家提交的 2D、3D 小游戏，查看宣传页和全部 50 题识图结果。'}
      />
      <section className="pt-24 pb-20 md:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="max-w-2xl mb-16">
            <span className="text-xs uppercase tracking-widest text-pitch-500 mb-2 block">Lab</span>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
              {isEnglish ? 'Four AI tests' : '四项 AI 实测'}
            </h1>
            <p className="text-graphite-200 leading-relaxed">
              {isEnglish
                ? 'I ran these four tests on July 17 and 18, 2026. For each task, all three systems received the same brief and inputs on the same computer. The image test used the same 50 pictures. I tried every build in Chrome and recorded the runs. Speed is listed separately from quality.'
                : '这四项测试都在 2026 年 7 月 17 至 18 日完成。每一项里，三家拿到同样的要求和素材，也都在同一台电脑上完成；识图用的是同一批 50 张图。我用 Chrome 逐个试玩并录屏，质量和速度分开算。'}
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

          {data && <BenchmarkEfficiency data={data} />}

          <Link
            to={path('/lab/model-price-benchmark')}
            className="group mb-8 block overflow-hidden rounded-2xl border border-[#b8d9ff] bg-paper p-5 text-[#1d1d1f] transition-[border-color,transform] hover:border-[#0071e3] active:scale-[0.99] md:p-7"
          >
            <span className="mb-2 block text-xs font-semibold uppercase tracking-widest text-[#0071e3]">API price · real agent mix</span>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">
                  {isEnglish ? 'API price vs hands-on score' : '模型 API 价格与实测评分'}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6e6e73]">
                  {isEnglish
                    ? 'Use a 94.7% cache-hit agent workload to compare six model prices, then place the three tested systems beside their four quality scores.'
                    : '按 94.7% 缓存命中的 Agent 用量比较六个模型价格，再对照三套实测系统的四项质量分。'}
                </p>
              </div>
              <span className="shrink-0 text-sm font-medium text-[#0066cc] transition-transform group-hover:translate-x-1">
                {isEnglish ? 'Open comparison' : '打开对比'} →
              </span>
            </div>
          </Link>

          {!isEnglish && (
            <a
              href="/recording-desk/"
              className="group mb-8 block overflow-hidden rounded-2xl border border-pitch-500/25 bg-graphite-900/45 p-5 transition-colors hover:border-pitch-500/50 active:scale-[0.99] md:p-7"
            >
              <span className="mb-2 block text-xs uppercase tracking-widest text-pitch-500">Long-form recording desk</span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">四类评测实机录制台</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-graphite-300">
                    在同一页面切换 2D、3D、宣传页和 50 图识别，直接试玩三家成品，并查看 Prompt、公开结果与现场录屏。
                  </p>
                </div>
                <span className="shrink-0 text-sm text-pitch-400 transition-transform group-hover:translate-x-1">打开录制台 →</span>
              </div>
            </a>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {taskCards.map((card) => (
              <Link
                key={card.slug}
                to={path(`/lab/${card.slug}`)}
                className="group overflow-hidden rounded-2xl border border-white/5 bg-graphite-900/30 transition-colors hover:border-pitch-500/30 active:scale-[0.99]"
              >
                <div className="aspect-video overflow-hidden border-b border-white/5 bg-graphite-950/70">
                  <img
                    src={card.image}
                    alt={card.imageAlt}
                    loading="lazy"
                    width="960"
                    height={card.slug === 'vision' ? '1088' : '540'}
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.015]"
                  />
                </div>
                <div className="p-5 md:p-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-graphite-400">{card.project}</span>
                    <span className="shrink-0 text-xs text-graphite-500">{card.date}</span>
                  </div>
                  <h2 className="mb-2 text-xl font-semibold text-white transition-colors group-hover:text-pitch-500">
                    {card.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-graphite-300">{card.summary}</p>
                  <span className="mt-4 inline-flex items-center text-sm text-pitch-500 transition-colors group-hover:text-pitch-400">
                    {isEnglish ? 'Open test' : '查看详情'} <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
