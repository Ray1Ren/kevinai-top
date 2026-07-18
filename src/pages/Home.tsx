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
            ? 'Kevin is an Android engineer and independent maker documenting real AI-assisted products, experiments, and lessons learned.'
            : 'Kevin 是一名 Android 研发与独立创作者，记录 AI 协作开发、真实产品、实验与踩坑。'
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
                  {isEnglish ? 'Engineer · Independent Maker' : '研发工程师 · 独立创作者'}
                </span>
              </div>
              <h1 className="mb-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-7xl">
                Kevin <span className="text-pitch-500">AI</span>局
              </h1>
              <p className="mb-6 text-base leading-relaxed text-graphite-200 md:text-xl">
                {isEnglish
                  ? 'A long-term home for the products I ship, the experiments I can reproduce, and the lessons that survived real use.'
                  : '一个长期更新的个人主页：放真正上线的作品、能复现的实验，以及经得住真实使用的方法。'}
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
                <div className="absolute bottom-6 right-6 rounded-full border border-white/10 bg-graphite-900/90 px-3 py-1.5 text-xs text-graphite-200 backdrop-blur-sm md:bottom-10 md:right-10">
                  {isEnglish ? 'Human judgment at the core' : '人类判断核心'}
                </div>
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
                {isEnglish ? 'Build first. Explain with evidence.' : '先把东西做出来，再用证据说话。'}
              </h2>
            </div>
            <div className="space-y-5 leading-relaxed text-graphite-200 md:col-span-8">
              <p>
                {isEnglish
                  ? 'I am Kevin, an Android engineer. On June 13, 2026, I knew almost nothing about mini games. I decided to use AI to build one that real people could actually play.'
                  : '我是 Kevin，一名 Android 研发。2026 年 6 月 13 日之前，我对小游戏基本不了解。那天我决定试试：用 AI 做一款真的能让别人玩的独立游戏。'}
              </p>
              <p>
                {isEnglish
                  ? 'The first demo took one day. Shipping took twenty-four. AI made generation fast; usability, taste, trade-offs, and acceptance still required repeated human judgment.'
                  : '第一天就有了能玩的 Demo，真正上线却用了二十四天。AI 让生成变快，但好不好玩、看不看得懂、该删什么，仍要靠人一遍遍判断。'}
              </p>
              <p className="font-medium text-pitch-400">
                {isEnglish ? 'AI scales generation. People remain responsible for judgment.' : 'AI 最擅长批量生成，人最值钱的是判断。'}
              </p>
              <p>
                {isEnglish
                  ? 'Kevin AI局 is where I keep that process: shipped products, development journals, honest tool evaluations, and the mistakes behind the final result.'
                  : '所以有了「Kevin AI局」：这里会长期记录上线作品、开发日记、工具实测，以及最终结果背后那些不太体面的返工。'}
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
                {isEnglish ? 'What lives here' : '这个网站会放什么'}
              </span>
              <h2 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                {isEnglish ? 'A growing body of work.' : '一个会持续生长的作品档案。'}
              </h2>
            </div>
            <div className="divide-y divide-white/10 border-y border-white/10 lg:col-span-8">
              <div className="grid gap-3 py-6 sm:grid-cols-[7rem_1fr]">
                <span className="text-xs uppercase tracking-widest text-graphite-500">01 · Products</span>
                <div>
                  <h3 className="font-medium text-white">{isEnglish ? 'Products that shipped' : '真正上线的产品'}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-graphite-400">
                    {isEnglish ? 'Playable builds, real screenshots, and the decisions behind them.' : '可玩的版本、真实截图，以及它们背后的取舍。'}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 py-6 sm:grid-cols-[7rem_1fr]">
                <span className="text-xs uppercase tracking-widest text-graphite-500">02 · Notes</span>
                <div>
                  <h3 className="font-medium text-white">{isEnglish ? 'Posts and project journals' : '公众号文章与项目日记'}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-graphite-400">
                    {isEnglish ? 'The archive is being prepared. Nothing will be published here until the original copy and media are checked.' : '归档结构已经准备好，原文与配图核对完成后再逐篇同步。'}
                  </p>
                  <Link to={path('/notes')} className="mt-3 inline-flex text-sm text-pitch-500 hover:text-pitch-400">
                    {isEnglish ? 'Open the notes archive' : '查看文章归档状态'} <span className="ml-1">→</span>
                  </Link>
                </div>
              </div>
              <div className="grid gap-3 py-6 sm:grid-cols-[7rem_1fr]">
                <span className="text-xs uppercase tracking-widest text-graphite-500">03 · Lab</span>
                <div>
                  <h3 className="font-medium text-white">{isEnglish ? 'Reproducible evaluations' : '能复核的工具评测'}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-graphite-400">
                    {isEnglish ? 'Play the original 2D and 3D builds directly, then inspect final scores and all 50 vision results.' : '直接试玩 2D、3D 原作，并查看最终评分与全部 50 题视觉识别结果。'}
                  </p>
                  <Link to={path('/lab')} className="mt-3 inline-flex text-sm text-pitch-500 hover:text-pitch-400">
                    {isEnglish ? 'Enter the evaluation lab' : '进入评测实验室'} <span className="ml-1">→</span>
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
              {isEnglish ? 'Find the rest of my work' : '找到我，也找到其他作品'}
            </h2>
            <p className="mb-6 max-w-[60ch] text-sm leading-relaxed text-graphite-400">
              {isEnglish ? 'This site is the index. GitHub holds the code; the links page keeps the current public entry points together.' : '这里是总索引；代码在 GitHub，其他公开入口集中放在链接页。'}
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
