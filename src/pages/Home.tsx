import { useState } from 'react'
import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
import ParticleOrbit from '../components/ParticleOrbit'
import GameShowcase from '../components/GameShowcase'
import ScrollNarrative from '../components/ScrollNarrative'
import QrDialog from '../components/QrDialog'
import { useLocale } from '../hooks/useLocale'

export default function Home() {
  const [qrOpen, setQrOpen] = useState(false)
  const { isEnglish, path } = useLocale()

  return (
    <>
      <SEOHead
        description={
          isEnglish
            ? 'Kevin is an Android engineer and independent maker. This is where I share what I build with AI, along with the mistakes and lessons behind it.'
            : 'Kevin 是一名 Android 工程师，也做独立产品。这里放我做过的东西、开发记录和 AI 工具实测。'
        }
      />

      <section className="relative flex min-h-[88dvh] items-center overflow-hidden border-b border-white/5 md:min-h-[100dvh]">
        <ParticleOrbit />
        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-4 pb-12 pt-20 md:px-6 md:pb-16 md:pt-24">
          <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-6">
            <div className="max-w-xl lg:col-span-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-pitch-500 animate-pulse-slow" />
                <span className="text-xs uppercase tracking-widest text-graphite-400">
                  {isEnglish ? 'Android Engineer · Independent Maker' : 'Android 工程师 · 独立开发者'}
                </span>
              </div>
              <h1 className="mb-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-7xl">
                Kevin <span className="text-pitch-500">AI</span>局
              </h1>
              <p className="mb-6 text-base leading-relaxed text-graphite-200 md:text-xl">
                {isEnglish
                  ? 'I build independent products with AI and write down what worked, what failed, and what finally shipped.'
                  : '我用 AI 做独立产品，也把做成了什么、踩过什么坑，如实记在这里。'}
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href="#work"
                  className="inline-flex items-center justify-center rounded-full bg-pitch-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-pitch-500"
                >
                  {isEnglish ? 'See what I am building' : '看我正在做什么'}
                </a>
                <Link
                  to={path('/notes')}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 px-5 py-2.5 font-medium text-white transition-colors hover:border-white/25"
                >
                  {isEnglish ? 'Notes & updates' : '文章与动态'}
                </Link>
              </div>
            </div>

            <div className="relative flex items-center justify-center lg:col-span-6 lg:justify-end">
              <div className="relative h-64 w-64 md:h-80 md:w-80 lg:h-[28rem] lg:w-[28rem]">
                <div className="absolute inset-0 rounded-full border border-pitch-500/10" />
                <div className="absolute inset-4 rotate-[15deg] rounded-full border border-pitch-500/10" />
                <div className="absolute inset-0 scale-110 rounded-full bg-pitch-500/5 blur-3xl" />
                <img
                  src="/assets/images/kevin-avatar.png"
                  alt={isEnglish ? 'Portrait of Kevin' : 'Kevin 头像'}
                  className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-graphite-800 object-cover shadow-2xl md:h-40 md:w-40 lg:h-48 lg:w-48"
                />
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
                {isEnglish ? 'Build it first. Then talk about the method.' : '先做出来，再谈方法。'}
              </h2>
            </div>
            <div className="space-y-5 leading-relaxed text-graphite-200 md:col-span-8">
              <p>
                {isEnglish
                  ? 'I am Kevin, an Android engineer. On June 13, 2026, I knew almost nothing about mini games and decided to build one from scratch with AI.'
                  : '我是 Kevin，做 Android 开发。2026 年 6 月 13 日，我对小游戏几乎一窍不通，却决定用 AI 从零做一款能上线、有人玩的游戏。'}
              </p>
              <p>
                {isEnglish
                  ? 'The first demo took one day. The game shipped on day twenty-four. Most of that time went into playing, cutting, fixing, and trying again.'
                  : '第一天出了能玩的 Demo，第 24 天才上线。中间大部分时间都花在试玩、删改和返工上。'}
              </p>
              <p className="font-medium text-pitch-400">
                {isEnglish ? 'AI makes more. I decide what stays.' : 'AI 负责多做，人负责挑对。'}
              </p>
              <p>
                {isEnglish
                  ? 'I keep the whole process here: products, build notes, tool tests, and the mistakes I only understood after redoing the work.'
                  : '我把这些过程留在「Kevin AI局」：做过的产品、开发日记、工具实测，还有那些返工后才明白的事。'}
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
              ? 'Move players and obstacles to clear a route from the ball to the goal. Offside, teammates, keepers, yellow cards, and portals gradually change how each move works. Every level is programmatically verified to have a solution.'
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
              className="h-24 w-24 rounded-lg bg-white p-1"
            />
            <div>
              <p className="mb-1 font-medium text-white">
                {isEnglish ? 'Play in WeChat · open the code' : '扫码直接试玩 · 点击放大'}
              </p>
              <p className="text-sm text-graphite-400">
                {isEnglish ? 'Send me the level number if you get stuck.' : '不好玩的地方直接说，卡关也可以把关卡号留给我。'}
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
                {isEnglish ? 'What is here' : '这里有什么'}
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                {isEnglish ? 'Everything I make, in one place.' : '慢慢把做过的事放进来。'}
              </h2>
            </div>
            <div className="divide-y divide-white/10 border-y border-white/10 lg:col-span-8">
              <div className="grid gap-3 py-6 sm:grid-cols-[7rem_1fr]">
                <span className="text-xs uppercase tracking-widest text-graphite-500">01 · Products</span>
                <div>
                  <h3 className="font-medium text-white">{isEnglish ? 'Products I have shipped' : '已经上线的产品'}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-graphite-400">
                    {isEnglish ? 'Playable builds, real screenshots, and why I made the choices I did.' : '能玩的版本、实机截图，以及我为什么这样做。'}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 py-6 sm:grid-cols-[7rem_1fr]">
                <span className="text-xs uppercase tracking-widest text-graphite-500">02 · Notes</span>
                <div>
                  <h3 className="font-medium text-white">{isEnglish ? 'Posts and build notes' : '公众号文章和开发日记'}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-graphite-400">
                    {isEnglish ? 'I am checking the original text and images now. Posts will move here as they are ready.' : '原文和配图核对好后，会陆续搬过来。'}
                  </p>
                  <Link to={path('/notes')} className="mt-3 inline-flex text-sm text-pitch-500 hover:text-pitch-400">
                    {isEnglish ? 'Go to notes' : '去文章页'} <span className="ml-1">→</span>
                  </Link>
                </div>
              </div>
              <div className="grid gap-3 py-6 sm:grid-cols-[7rem_1fr]">
                <span className="text-xs uppercase tracking-widest text-graphite-500">03 · Lab</span>
                <div>
                  <h3 className="font-medium text-white">{isEnglish ? 'Hands-on AI tests' : 'AI 工具实测'}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-graphite-400">
                    {isEnglish ? 'Play the 2D and 3D games, open the promotion pages, and inspect all 50 image answers.' : '2D、3D 小游戏能直接玩，宣传页能直接看，50 道识图结果也全部展开。'}
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

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="rounded-2xl border border-white/5 bg-graphite-900/30 p-8 md:p-12">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {isEnglish ? 'Find me elsewhere' : '还可以在这些地方找到我'}
            </h2>
            <p className="mb-6 max-w-[60ch] text-sm leading-relaxed text-graphite-400">
              {isEnglish ? 'The code is on GitHub. Everything else is collected on the links page.' : '代码放在 GitHub，其他入口都在链接页。'}
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com/Ray1Ren"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-graphite-200 transition-colors hover:border-white/25 hover:text-white"
              >
                GitHub
              </a>
              <Link
                to={path('/links')}
                className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-graphite-200 transition-colors hover:border-white/25 hover:text-white"
              >
                {isEnglish ? 'All links' : '全部链接'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <QrDialog open={qrOpen} onClose={() => setQrOpen(false)} />
    </>
  )
}
