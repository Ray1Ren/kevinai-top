import { useState } from 'react'
import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
import ParticleOrbit from '../components/ParticleOrbit'
import GameShowcase from '../components/GameShowcase'
import ScrollNarrative from '../components/ScrollNarrative'
import QrDialog from '../components/QrDialog'
import { useLocale } from '../hooks/useLocale'
import { FIRST_ARTICLE_PATH, useFirstArticleRelease } from '../lib/article-release'

export default function Home() {
  const [qrOpen, setQrOpen] = useState(false)
  const { isEnglish, path } = useLocale()
  const kimiArticleReleased = useFirstArticleRelease()
  const articlesPath = isEnglish ? '/en/articles' : '/notes'
  const firstArticlePath = isEnglish ? '/en/articles/ai-game-24-days' : '/notes/ai-game-24-days'
  const kimiArticlePath = isEnglish ? '/en/articles/kimi-k3-review' : FIRST_ARTICLE_PATH

  return (
    <>
      <SEOHead
        description={
          isEnglish
            ? 'Kevin is an Android engineer and independent developer. One Kick, his first mini game, shipped on WeChat after 24 days of work.'
            : 'Kevin 是一名 Android 工程师，也做独立产品。这里放我做过的东西、开发记录和 AI 工具实测。'
        }
      />

      <section className="relative flex min-h-[100dvh] items-center overflow-hidden border-b border-white/5">
        <ParticleOrbit />
        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 pb-10 pt-24 md:px-6 md:pb-14 md:pt-28">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-10">
            <div className="max-w-xl lg:col-span-5">
              <div className="mb-5 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-pitch-500 animate-pulse-slow" />
                <span className="text-xs uppercase tracking-widest text-graphite-400">
                  {isEnglish ? 'Android Engineer · Independent Developer' : 'Android 工程师 · 独立开发者'}
                </span>
              </div>
              <h1 className="mb-5 text-5xl font-semibold tracking-tight text-white sm:text-6xl md:text-7xl">
                {isEnglish ? (
                  <>
                    Kevin <span className="text-pitch-500">AI</span>
                    <span className="block">Lab</span>
                  </>
                ) : (
                  <>Kevin <span className="text-pitch-500">AI</span>局</>
                )}
              </h1>
              <p className="mb-7 max-w-[58ch] text-base leading-relaxed text-graphite-200 md:text-lg">
                {isEnglish
                  ? "I'm Kevin. I work in Android and make my own products. On June 13, 2026, I started my first mini game. One Kick went live on WeChat 24 days later."
                  : '我是 Kevin，做 Android 开发，也做自己的产品。2026 年 6 月 13 日，我从零开始做小游戏。24 天后，《一脚晋级》在微信上线。'}
              </p>
              <p className="mb-8 max-w-[56ch] text-sm leading-relaxed text-graphite-400 md:text-base">
                {isEnglish
                  ? 'I post my work and development notes here. AI tool tests are in the Lab.'
                  : '这里放作品和开发记录。AI 工具实测单独放在实验室。'}
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#work"
                  className="inline-flex items-center justify-center rounded-full bg-pitch-600 px-5 py-2.5 font-medium text-paper transition-colors hover:bg-pitch-500"
                >
                  {isEnglish ? 'See One Kick' : '看看《一脚晋级》'}
                </a>
                <Link
                  to={firstArticlePath}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2.5 font-medium text-white transition-colors hover:border-white/25"
                >
                  {isEnglish ? 'Read the first article' : '读第一篇文章'}
                </Link>
              </div>
            </div>

            <div className="relative lg:col-span-7">
              <div className="relative mx-auto w-full max-w-[44rem] overflow-hidden rounded-[2rem] border border-white/10 bg-graphite-900/55 shadow-2xl shadow-black/30 lg:ml-auto">
                <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-graphite-950 via-transparent to-transparent" aria-hidden="true" />
                <img
                  src="/assets/images/kevin-ai-hero.png"
                  alt={isEnglish ? 'Illustrated portrait of Kevin, an Android engineer and independent developer' : 'Android 工程师、独立开发者 Kevin 的虚拟人物形象'}
                  width={1122}
                  height={1402}
                  fetchPriority="high"
                  className="aspect-[4/5] h-auto w-full object-cover"
                />
                <div className="absolute left-4 top-4 z-20 rounded-full border border-white/10 bg-graphite-950/70 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-graphite-200 backdrop-blur-md md:left-6 md:top-6">
                  {isEnglish ? 'First mini game · 2026' : '第一款小游戏 · 2026'}
                </div>
                <dl className="absolute inset-x-0 bottom-0 z-20 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 bg-graphite-950/80 px-2 py-4 backdrop-blur-md md:px-5 md:py-5">
                  <div className="px-2 md:px-4">
                    <dt className="text-[9px] uppercase tracking-widest text-graphite-500">{isEnglish ? 'Started' : '开始'}</dt>
                    <dd className="mt-1 text-sm font-medium tabular-nums text-white md:text-base">06.13</dd>
                  </div>
                  <div className="px-2 md:px-4">
                    <dt className="text-[9px] uppercase tracking-widest text-graphite-500">{isEnglish ? 'To ship' : '上线'}</dt>
                    <dd className="mt-1 text-sm font-medium tabular-nums text-white md:text-base">24 {isEnglish ? 'days' : '天'}</dd>
                  </div>
                  <div className="px-2 md:px-4">
                    <dt className="text-[9px] uppercase tracking-widest text-graphite-500">{isEnglish ? 'Levels' : '关卡'}</dt>
                    <dd className="mt-1 text-sm font-medium tabular-nums text-pitch-400 md:text-base">500</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ScrollNarrative />

      <section className="border-b border-white/5 py-16 md:py-24">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <span className="mb-3 block text-xs uppercase tracking-widest text-pitch-500">
                {isEnglish ? 'About' : '关于我'}
              </span>
              <h2 className="mb-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                {isEnglish ? 'I had never built a mini game before.' : '我以前没做过小游戏。'}
              </h2>
            </div>
            <div className="space-y-5 leading-relaxed text-graphite-200 md:col-span-8">
              <p>
                {isEnglish
                  ? 'I work in Android. Before June 13, 2026, I had never made a mini game.'
                  : '我是 Android 工程师。2026 年 6 月 13 日，我第一次动手做小游戏，当时几乎什么都不懂。'}
              </p>
              <p>
                {isEnglish
                  ? 'The first playable demo took one day. One Kick went live 24 days later. Most of the time in between went into playtesting and redoing parts that did not work.'
                  : '第一天出了能玩的 Demo。24 天后，《一脚晋级》上线。中间大部分时间都花在试玩和返工上。'}
              </p>
              <p>
                {isEnglish
                  ? 'I post finished work and development notes here. AI tool tests are in the Lab, including the ones that went badly.'
                  : '做好的产品和开发记录都留在这里。AI 工具实测放在实验室，效果不好的也会放出来。'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="work" className="scroll-mt-20 border-b border-white/5 py-16 md:py-24">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="mb-2 block text-xs uppercase tracking-widest text-pitch-500">
                {isEnglish ? 'Shipped work · 01' : '已上线作品 · 01'}
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">《一脚晋级》</h2>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-graphite-300">
              <span>{isEnglish ? 'Playable in 1 day' : '1 天可玩'}</span>
              <span>{isEnglish ? 'Shipped in 24 days' : '24 天上线'}</span>
              <span>{isEnglish ? '500 levels' : '500 关'}</span>
            </div>
          </div>

          <p className="mb-8 max-w-[65ch] leading-relaxed text-graphite-200">
            {isEnglish
              ? 'Move players and obstacles to clear a route from the ball to the goal. Offside, teammates, keepers, yellow cards, and portals gradually change how each move works. Every level is checked by code to make sure a solution exists.'
              : '移动球员和障碍，给足球让出一条通往球门的路。越位、队友、守门员、黄牌、传送门会逐层加入，改变每一步的判断。每一关都经过程序验证，保证存在可行解。'}
          </p>

          <GameShowcase />

          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="mt-10 flex w-full flex-col items-start gap-5 rounded-2xl border border-white/5 bg-graphite-900/30 p-5 text-left transition-colors hover:border-pitch-500/30 sm:flex-row sm:items-center"
            aria-haspopup="dialog"
            aria-expanded={qrOpen}
          >
            <img
              src="/assets/images/qr-code.png"
              alt={isEnglish ? 'One Kick WeChat mini program code' : '《一脚晋级》小程序码'}
              className="h-24 w-24 rounded-lg bg-paper p-1"
            />
            <div>
              <p className="mb-1 font-medium text-white">
                {isEnglish ? 'Play One Kick inside WeChat' : '打开《一脚晋级》小程序码'}
              </p>
              <p className="text-sm text-graphite-400">
                {isEnglish
                  ? 'Open WeChat, tap Scan, and point it at this code. The game opens inside WeChat, so there is nothing else to install.'
                  : '点击放大后，用微信扫一扫就能玩。卡关了，可以把关卡号发给我。'}
              </p>
            </div>
          </button>
        </div>
      </section>

      <section className="border-b border-white/5 py-16 md:py-24">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <span className="mb-2 block text-xs uppercase tracking-widest text-pitch-500">
                {isEnglish ? 'On this site' : '网站内容'}
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                {isEnglish ? 'One Kick is on the homepage. Articles and tool tests have their own pages.' : '《一脚晋级》在首页，文章和实测各有一页。'}
              </h2>
            </div>
            <div className="divide-y divide-white/10 border-y border-white/10 lg:col-span-8">
              <div className="grid gap-3 py-6 sm:grid-cols-[7rem_1fr]">
                <span className="text-xs uppercase tracking-widest text-graphite-500">01 · Products</span>
                <div>
                  <h3 className="font-medium text-white">{isEnglish ? 'One Kick' : '《一脚晋级》'}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-graphite-400">
                    {isEnglish ? 'A playable build, real screenshots, and notes from development.' : '能玩的版本、实机截图，还有开发过程。'}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 py-6 sm:grid-cols-[7rem_1fr]">
                <span className="text-xs uppercase tracking-widest text-graphite-500">02 · Notes</span>
                <div>
                  <h3 className="font-medium text-white">
                    {kimiArticleReleased
                      ? (isEnglish ? 'Is Kimi K3 worth paying for?' : 'Kimi K3 到底值不值得订阅？')
                      : (isEnglish ? 'The next article goes live at 08:00' : '下一篇文章，早上 8 点见')}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-graphite-400">
                    {kimiArticleReleased
                      ? (isEnglish ? 'I spent two days running the same four tasks with Kimi K3, GPT-5.6 Sol, and MiniMax M3.' : '我用两天时间，让 Kimi K3、GPT-5.6 Sol 和 MiniMax M3 做了同样的四项任务。')
                      : (isEnglish ? 'The Chinese and English versions will go live together on July 19.' : '7 月 19 日，中英文版同时开放。')}
                  </p>
                  {kimiArticleReleased ? (
                    <Link to={kimiArticlePath} className="mt-3 inline-flex text-sm text-pitch-500 hover:text-pitch-400">
                      {isEnglish ? 'Read the full test' : '阅读全文'} <span className="ml-1">→</span>
                    </Link>
                  ) : (
                    <Link to={articlesPath} className="mt-3 inline-flex text-sm text-graphite-400 hover:text-white">
                      {isEnglish ? 'Open notes' : '去文章页'} <span className="ml-1">→</span>
                    </Link>
                  )}
                </div>
              </div>
              <div className="grid gap-3 py-6 sm:grid-cols-[7rem_1fr]">
                <span className="text-xs uppercase tracking-widest text-graphite-500">03 · Lab</span>
                <div>
                  <h3 className="font-medium text-white">{isEnglish ? 'AI tool tests' : 'AI 工具实测'}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-graphite-400">
                    {isEnglish ? 'The 2D and 3D games are playable. The promotion pages and all 50 image-test answers are open as well.' : '2D、3D 小游戏能直接玩。宣传页可以打开，50 道识图结果也全部展开。'}
                  </p>
                  <Link to={path('/lab')} className="mt-3 inline-flex text-sm text-pitch-500 hover:text-pitch-400">
                    {isEnglish ? 'See all four tests' : '查看四项实测'} <span className="ml-1">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <QrDialog open={qrOpen} onClose={() => setQrOpen(false)} />
    </>
  )
}
