import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import ArticleLightbox from '../components/ArticleLightbox'
import SEOHead from '../components/SEOHead'
import { useLocale } from '../hooks/useLocale'
import { useFirstArticleRelease } from '../lib/article-release'

type FigureProps = {
  src: string
  alt: string
  caption: ReactNode
  contain?: boolean
}

const articleAsset = (name: string, english: boolean) =>
  `/assets/${english ? 'article-kimi-k3-en' : 'article-kimi-k3'}/${name}`
const gameplayAsset = (name: string, english: boolean) =>
  `/assets/${english ? 'gifs-en' : 'gifs'}/${name}`

function ArticleFigure({ src, alt, caption, contain = false }: FigureProps) {
  return (
    <figure className="my-7 md:my-9">
      <div className={`overflow-hidden rounded-xl border border-white/10 ${contain ? 'flex justify-center bg-[#f7f4ed] p-2 md:p-3' : 'bg-graphite-900/45'}`}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`h-auto w-full ${contain ? 'max-h-[46rem] object-contain' : 'object-cover'}`}
        />
      </div>
      <figcaption className="px-1 pt-3 text-[13px] leading-6 text-graphite-400 md:text-sm">
        {caption}
      </figcaption>
    </figure>
  )
}

function PromptList({ title, items }: { title: string; items: string[] }) {
  return (
    <aside className="my-8 rounded-2xl border border-white/10 bg-graphite-900/40 p-5 md:p-7">
      <p className="mb-4 text-xs uppercase tracking-widest text-pitch-500">{title}</p>
      <ul className="space-y-3 text-sm leading-relaxed text-graphite-200 md:text-base">
        {items.map((item) => (
          <li key={item} className="grid grid-cols-[0.65rem_1fr] gap-3">
            <span className="mt-[0.58rem] h-1.5 w-1.5 rounded-full bg-pitch-500" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

function LabLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="my-8 inline-flex items-center rounded-full border border-pitch-500/35 bg-pitch-500/10 px-5 py-2.5 text-sm font-medium text-pitch-300 transition-colors hover:border-pitch-400 hover:bg-pitch-500/15"
    >
      {children}<span className="ml-2" aria-hidden="true">→</span>
    </Link>
  )
}

function ScheduledArticle() {
  const { isEnglish, path } = useLocale()
  return (
    <>
      <SEOHead
        title={isEnglish ? 'Next article publishes at 08:00' : '下一篇文章 08:00 发布'}
        description={isEnglish ? 'The next Kevin AI局 article will be published at 08:00 on July 19.' : 'Kevin AI局下一篇文章将于 7 月 19 日 08:00 发布。'}
      />
      <section className="flex min-h-[78dvh] items-center pb-20 pt-28">
        <div className="mx-auto w-full max-w-3xl px-4 md:px-6">
          <span className="mb-4 block text-xs uppercase tracking-widest text-pitch-500">
            {isEnglish ? 'Scheduled · July 19' : '定时发布 · 7 月 19 日'}
          </span>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-white md:text-6xl">
            {isEnglish ? 'The next article goes live at 08:00.' : '下一篇文章，早上 8 点见。'}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-graphite-300 md:text-lg">
            {isEnglish
              ? 'Two games, one promotion page, and 50 image-recognition questions. The Chinese and English versions will go live together.'
              : '两个游戏、一个宣传页，再加 50 道看图题。中英文版会同时开放。'}
          </p>
          <Link to={path('/notes')} className="mt-8 inline-flex text-sm text-pitch-400 hover:text-pitch-300">
            {isEnglish ? 'Back to notes' : '返回文章列表'} <span className="ml-1">→</span>
          </Link>
        </div>
      </section>
    </>
  )
}

export default function KimiK3Review() {
  const released = useFirstArticleRelease()
  const { isEnglish, path } = useLocale()

  if (!released) return <ScheduledArticle />

  const t = (zh: string, en: string) => (isEnglish ? en : zh)
  const asset = (name: string) => articleAsset(name, isEnglish)
  const gameplay = (name: string) => gameplayAsset(name, isEnglish)
  const toc = [
    ['result', t('先看结论', 'The result')],
    ['2d', t('2D 小游戏', '2D web game')],
    ['3d', t('3D 射击游戏', '3D shooter')],
    ['web', t('宣传网页', 'Promotion page')],
    ['vision', t('50 图识别', '50-image vision test')],
    ['choice', t('怎么选', 'What I would choose')],
    ['tokens', t('额度与 Token', 'Quotas and tokens')],
  ]

  return (
    <>
      <SEOHead
        title={t('国产之光！Kimi K3 到底值不值得订阅？6000 字真实大评测', 'Is Kimi K3 Worth Paying For? Two Games, One Web Page, and 50 Images')}
        description={t(
          '我用同一套题实测 Kimi K3、GPT-5.6 Sol 和 MiniMax M3：两个游戏、一个宣传页、50 道图片题，以及真实额度记录。',
          'A hands-on comparison of Kimi K3, GPT-5.6 Sol, and MiniMax M3 across two games, one promotion page, 50 image questions, and real quota records.',
        )}
        image={isEnglish
          ? 'https://kevinai.top/assets/article-kimi-k3-en/og-kimi-k3-review.png'
          : 'https://kevinai.top/assets/images/kevin-avatar.png'}
        type="article"
        publishedTime="2026-07-19T00:00:00.000Z"
        canonicalPath={isEnglish ? '/en/articles/kimi-k3-review' : '/notes/kimi-k3-subscription-review'}
        alternateZhPath="/notes/kimi-k3-subscription-review"
        alternateEnPath="/en/articles/kimi-k3-review"
      />

      <article className="pb-24 pt-24 md:pb-32 md:pt-32">
        <header className="mx-auto max-w-[70rem] px-4 md:px-6">
          <div className="flex flex-wrap items-center gap-5">
            <Link to={path('/notes')} className="inline-flex text-sm text-graphite-400 transition-colors hover:text-white">
              <span className="mr-2" aria-hidden="true">←</span>{t('返回文章列表', 'Back to notes')}
            </Link>
            <a href="https://mp.weixin.qq.com/s/EO2wmTxd4vbCi1bjsKWgUw" target="_blank" rel="noreferrer" className="inline-flex text-sm text-pitch-500 transition-colors hover:text-pitch-400">
              {t('公众号原文', 'Original post in Chinese')} <span className="ml-1" aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-10 border-b border-white/10 pb-12 lg:grid-cols-12 lg:items-end md:pb-16">
            <div className="lg:col-span-8">
              <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs uppercase tracking-widest text-graphite-500">
                <span className="text-pitch-500">{t('AI 工具实测', 'AI tool test')}</span>
                <span>{t('2026 年 7 月 19 日', 'July 19, 2026')}</span>
                <span>{t('约 20 分钟', 'About 20 min')}</span>
              </div>
              <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
                {t('国产之光！Kimi K3 到底值不值得订阅？6000 字真实大评测', 'Is Kimi K3 worth paying for? Two games, one web page, and 50 images')}
              </h1>
              <p className="mt-6 max-w-[65ch] text-lg leading-relaxed text-graphite-200 md:text-xl">
                {t(
                  '我把三个 Agent 放在同一套题上连续跑了两天。K3 确实能打，也确实能让人等到没脾气。',
                  'I put three coding agents through the same set of tasks over two days. K3 is genuinely capable. It also tested my patience.',
                )}
              </p>
            </div>

            <dl className="grid grid-cols-3 gap-3 lg:col-span-4 lg:grid-cols-1 lg:justify-self-end">
              <div className="border-t border-white/10 pt-3 lg:min-w-[15rem]">
                <dt className="text-xs text-graphite-500">GPT-5.6 Sol</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-pitch-400">92.6</dd>
              </div>
              <div className="border-t border-white/10 pt-3 lg:min-w-[15rem]">
                <dt className="text-xs text-graphite-500">Kimi K3</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">89.8</dd>
              </div>
              <div className="border-t border-white/10 pt-3 lg:min-w-[15rem]">
                <dt className="text-xs text-graphite-500">MiniMax M3</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums text-graphite-300">77.8</dd>
              </div>
            </dl>
          </div>
        </header>

        <div className="mx-auto mt-10 grid max-w-[70rem] grid-cols-1 gap-12 px-4 md:mt-14 md:px-6 lg:grid-cols-[12rem_minmax(0,43rem)] lg:justify-center lg:gap-12 xl:gap-20">
          <aside className="hidden lg:block">
            <nav className="sticky top-28 border-l border-white/10 pl-5" aria-label={t('文章目录', 'Article contents')}>
              <p className="mb-4 text-xs uppercase tracking-widest text-graphite-500">{t('目录', 'Contents')}</p>
              <ol className="space-y-3 text-sm text-graphite-400">
                {toc.map(([id, label], index) => (
                  <li key={id}>
                    <a href={`#${id}`} className="transition-colors hover:text-pitch-400">
                      <span className="mr-2 tabular-nums text-graphite-600">{String(index + 1).padStart(2, '0')}</span>{label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <ArticleLightbox className="article-body min-w-0">
            <section id="result" className="scroll-mt-24">
              <h2>{t('先把最有用的三句话放这儿', 'The three things I would want to know first')}</h2>
              <ol className="my-8 space-y-5 border-y border-white/10 py-7">
                <li className="grid grid-cols-[2rem_1fr] gap-3">
                  <span className="text-sm tabular-nums text-pitch-500">01</span>
                  <p>{t('只看任务处理能力，我会把 Kimi K3 放进当前 SOTA 前三。国产模型这么快追到这个位置，确实让我惊喜。', 'On task capability alone, I would put Kimi K3 in the current top three. Seeing a Chinese model reach this level this quickly was a real surprise.')}</p>
                </li>
                <li className="grid grid-cols-[2rem_1fr] gap-3">
                  <span className="text-sm tabular-nums text-pitch-500">02</span>
                  <p>{t('K3 的短板很直接：慢。同样是订阅会员，这次它的平均等待时间大约是 GPT-5.6 Sol 的 3 倍。', 'K3 has one obvious weakness: speed. Across these tests, I waited roughly three times as long as I did for GPT-5.6 Sol.')}</p>
                </li>
                <li className="grid grid-cols-[2rem_1fr] gap-3">
                  <span className="text-sm tabular-nums text-pitch-500">03</span>
                  <p>{t('Kimi 最高档的额度不算大方。按我自己的用量估，100 美元档一周大约能用 1 亿+ token；Codex 的 200 美元档大约能到 30 亿+。', 'Kimi’s highest subscription tier is not especially generous. Based on my own usage, the US$100 plan works out to roughly 100 million-plus tokens a week, while the US$200 Codex plan reaches roughly 3 billion-plus.')}</p>
                </li>
              </ol>
              <p className="article-note">{t('额度是我按这两天的用量做的粗估，不是官方承诺。套餐后面也可能调整。', 'Those quota figures are rough estimates from my own usage, not official promises. The plans may change.')}</p>

              <p>{t('Kimi K3 发布后，官方在 Coding Benchmark 里给出的成绩很有信心。榜单上的数字很好看，但我更想知道：真把完整任务扔过去，它能不能自己做完、自己找 Bug，最后交出一个能玩的东西。', 'Kimi launched K3 with strong coding benchmark results. The leaderboard looked good, but I cared about a more practical question: if I handed it a complete task, could it finish the work, find its own bugs, and leave me with something I could actually use?')}</p>
              <ArticleFigure
                src={asset('k3-official-benchmark.png')}
                alt={t('Kimi K3 官方 Coding Benchmark', 'Official Kimi K3 coding benchmark')}
                contain
                caption={<>{t('蓝色是 Kimi K3。图片来自 ', 'Kimi K3 is shown in blue. Image from the ')}<a href="https://www.kimi.com/blog/kimi-k3" target="_blank" rel="noreferrer" className="text-pitch-400 hover:text-pitch-300">{t('Kimi K3 技术博客', 'Kimi K3 technical blog')}</a>{t('。', '.')}</>}
              />

              <p>{t('这次 Kimi 用的是 699 元/月的 Kimi Code Allegro，约 100 美元。Codex 是我一直在续的约 200 美元/月方案。MiniMax 则是 469 元/月的 Ultra，平时写代码和做音频我也会用。选这三个没有什么高深理由，因为我都已经订了。GLM-5.2 原本也想测，但订阅一直没抢到，只能先缺席。', 'For this test, Kimi ran on the RMB 699-per-month Kimi Code Allegro plan, roughly US$100. Codex was the roughly US$200 plan I already use, and MiniMax was the RMB 469 Ultra plan I also use for coding and audio work. The selection method was simple: I was already paying for all three. I also wanted to test GLM-5.2, but I could not get a subscription, so it had to sit this one out.')}</p>
              <p>{t('三家也没有硬塞进同一个 CLI。Kimi K3 用 Kimi Code CLI，GPT-5.6 Sol 用 Codex CLI，MiniMax M3 用 mmx CLI。额外 Skills 全部关闭，三边拿到同一道题和同一批素材，计时从开始干活一直算到它们自己停手。', 'I did not force the models through one shared CLI. Kimi K3 used Kimi Code CLI, GPT-5.6 Sol used Codex CLI, and MiniMax M3 used mmx CLI. Extra skills were disabled. Each agent received the same task and the same local assets, and the clock ran until the agent stopped working on its own.')}</p>
              <p>{t('分数是我的实际使用判断。游戏和网页难免带主观成分，所以速度单独列，不往质量分里塞。四项各按 100 分算，最后各占 25%。', 'The scores reflect my hands-on judgment, and visual quality and game feel inevitably involve some subjectivity. Speed is reported separately and does not inflate or reduce the quality score. Each of the four tasks is scored out of 100 and contributes 25 percent to the total.')}</p>

              <ArticleFigure src={asset('overall-total.png')} alt={t('四项实测最终总分', 'Final scores across all four tasks')} contain caption={t('四项各占 25%，速度不计入总分。', 'Each task contributes 25 percent. Time is excluded from the total.')} />
              <ArticleFigure src={asset('overall-detail.png')} alt={t('四项实测单项成绩', 'Scores for each of the four tasks')} contain caption={t('每项都按 100 分计算，蓝色标出该项最高分。', 'Each task is scored out of 100; blue marks the highest score.')} />
              <p className="sr-only">{t(
                '四项成绩：2D 小游戏，Kimi K3 80.5、GPT-5.6 Sol 96.0、MiniMax M3 54.5；3D 第一人称射击，91.0、89.2、83.6；《一脚晋级》宣传页，91.0、95.0、85.0；50 图识别，96.7、90.0、88.0；四项等权总分，89.8、92.6、77.8。',
                'Four-task scores: 2D game, Kimi K3 80.5, GPT-5.6 Sol 96.0, MiniMax M3 54.5; 3D shooter, 91.0, 89.2, 83.6; One Kick promotion page, 91.0, 95.0, 85.0; 50-image recognition, 96.7, 90.0, 88.0; equal-weight total, 89.8, 92.6, 77.8.',
              )}</p>
              <ArticleFigure src={asset('duration.png')} alt={t('四项任务完成时长', 'Completion time for the four tasks')} contain caption={t('横条越短，用时越少。速度只单列展示。', 'Shorter bars mean less time. Timing is shown separately from quality.')} />
              <p>{t('四项跑完后，K3 给我的感觉很统一：东西做得完整，3D 和图片识别尤其亮眼；问题也很统一，就是慢。三个需要写代码的任务，它都是最后一个交。', 'After all four tasks, my view of K3 was remarkably consistent. Its work was complete, and its 3D and vision results stood out. It was also slow every time. On all three coding tasks, it was the last to finish.')}</p>
            </section>

            <section id="2d" className="scroll-mt-24">
              <h2>{t('第一题：做一个原创弹弓物理游戏', 'Test one: build an original slingshot physics game')}</h2>
              <ArticleFigure src={asset('2d-total.png')} alt={t('2D 小游戏总分', '2D web game totals')} contain caption={t('2D 小游戏质量分。', 'Quality scores for the 2D game.')} />
              <ArticleFigure src={asset('2d-detail.png')} alt={t('2D 小游戏评分细节', '2D game score details')} contain caption={t('这项限时 40 分钟。', 'This task had a 40-minute limit.')} />
              <p className="article-note">{t('K3 到点时还没跑完最后一轮测试，只能带着没调完的 Bug 交卷。不限时的话，它的分数大概率会更高。', 'K3 was still running its final test when the 40-minute limit expired, so the submitted build kept an unfinished physics bug. With more time, it would probably have scored higher.')}</p>
              <PromptList
                title={t('三边拿到的主要要求', 'Core requirements given to all three agents')}
                items={isEnglish ? [
                  'Build an original slingshot game called Slingshot Siege. Drag to charge, release to fire, and let structures collapse on impact.',
                  'Include at least three distinct levels with win, loss, retry, score, ammunition, pause, sound, and hit feedback.',
                  'A full run must work with both mouse and touch using only local, native web technology.',
                ] : [
                  '做原创弹弓物理游戏《弹弓攻城》：拖拽蓄力、松手发射，建筑能被撞倒，不能照搬《愤怒的小鸟》的素材。',
                  '至少 3 个不同关卡，能过关、失败和重玩；有分数、弹药、暂停、音效和命中反馈。',
                  '鼠标和触摸都能走完一局，只用本地原生网页技术。',
                ]}
              />

              <h3>Kimi K3 · 80.5</h3>
              <p>{t('K3 的第一眼最唬人。碰撞、粒子、音效全自己写，还塞进了紫色暮景、机器人守卫、暂停、重开和存档，看着最像一款完整游戏。', 'K3 made the strongest first impression. It implemented its own collision, particles, and sound, then added a purple dusk setting, robot guards, pause, restart, and saved progress. It looked most like a complete game.')}</p>
              <p>{t('真正拖起弹弓后，问题跟着出来了。40 分钟到点时，第二、三关的物理还没调稳。建筑放着不动，3 秒后也会自己移位，有时直接塌掉。装修、灯光、音效全安排上了，地基先开始自由活动。', 'The problem appeared as soon as I played it. At the deadline, the physics in levels two and three were still unstable. Even if I did nothing, structures shifted after a few seconds and sometimes collapsed on their own. K3 had finished the decoration, lighting, and audio before the foundations stopped moving.')}</p>
              <ArticleFigure src={asset('2d-k3-physics-fail.gif')} alt={t('Kimi K3 2D 游戏的物理 Bug', 'Physics bug in Kimi K3’s 2D game')} caption={t('我没有碰弹弓，第二关的右塔和第三关的石塔仍然自己塌了。', 'I never touched the slingshot, yet the right tower in level two and the stone tower in level three collapsed on their own.')} />
              <ArticleFigure src={gameplay('2d-k3.gif')} alt={t('K3 2D 游戏演示', 'K3 2D gameplay')} caption={t('Kimi K3：东西做得最多，画面也最完整，最后被物理 Bug 拖住。', 'Kimi K3 built the most and looked the most complete, but the physics bug held it back.')} />

              <h3>GPT-5.6 Sol · 96.0</h3>
              <p>{t('GPT-5.6 Sol 明显稳得多。首屏信息清楚，手机不用左右滑；我实际拉了两次弹弓，都能正常发射，三关的建筑静置 3 秒也不会乱动。', 'GPT-5.6 Sol was much more stable. The first screen was easy to read, the mobile layout did not require horizontal scrolling, two real drag-and-release attempts both worked, and structures in all three levels stayed still when left alone.')}</p>
              <p>{t('它还自己玩出了第一关射程不够，调大发射力度后又跑了一遍。画面没有 K3 那么花，但我真上手时，反而是它最省心。', 'It also discovered that the first level’s range was too short, increased the launch force, and tested again. It looked less elaborate than K3, but it was the build I trusted most when I actually played.')}</p>
              <ArticleFigure src={gameplay('2d-codex.gif')} alt={t('Codex 2D 游戏演示', 'Codex 2D gameplay')} caption={t('GPT-5.6 Sol：画面不复杂，但轨迹、命中和操作都很清楚。', 'GPT-5.6 Sol looked simpler, but its trajectory, hits, and controls were clear.')} />

              <h3>MiniMax M3 · 54.5</h3>
              <p>{t('M3 的卖相不差。首屏、弹道拖尾和空中技能都有，鼠标和触摸也都能发射。可上下瞄准是反的，根本发不出向上的弧线。第一关的石头还没碰到敌人就先落地，正常操作过不了关，刷新后进度也不会保存。', 'M3 looked respectable. It had a finished start screen, projectile trails, an airborne ability, and working mouse and touch input. But vertical aiming was inverted, so I could not launch an upward arc. The stone dropped before reaching the enemy in level one, making the level impossible through normal play, and progress disappeared after refresh.')}</p>
              <ArticleFigure src={gameplay('2d-m3.gif')} alt={t('MiniMax 2D 游戏演示', 'MiniMax 2D gameplay')} caption={t('MiniMax M3：看着挺完整，但正常操作连第一关都过不了。', 'MiniMax M3 looked complete, but normal play could not clear the first level.')} />
              <LabLink to={path('/lab/2d')}>{t('直接玩三款 2D 游戏', 'Play all three 2D builds')}</LabLink>
            </section>

            <section id="3d" className="scroll-mt-24">
              <h2>{t('第二题：直接上 3D 第一人称射击', 'Test two: build a 3D first-person shooter')}</h2>
              <ArticleFigure src={asset('3d-total.png')} alt={t('3D 第一人称射击总分', '3D first-person shooter totals')} contain caption={t('Kimi K3 以 91.0 分拿下这一项。', 'Kimi K3 won this task with 91.0 points.')} />
              <PromptList
                title={t('三边拿到的主要要求', 'Core requirements given to all three agents')}
                items={isEnglish ? [
                  'Build an original first-person shooter called Breach Point in a harbor warehouse with cover, corridors, and changes in elevation.',
                  'Support movement, aiming, shooting, and reloading. At least four enemies must patrol and return fire.',
                  'Clear the enemies within 75 seconds, then hold the device for 1.5 seconds to win. Desktop and mobile must both work with a local copy of Three.js.',
                ] : [
                  '做原创 3D 第一人称射击游戏《破门点》，场景是有掩体、通道和高低差的海港仓库。',
                  '能移动、瞄准、射击和换弹；至少 4 个敌人会巡逻和还击。',
                  '75 秒内清场并长按装置 1.5 秒获胜；电脑和手机都能完整游玩，只用本地 Three.js。',
                ]}
              />

              <h3>Kimi K3 · 91.0</h3>
              <p>{t('这一题，K3 把长板打出来了。港口、吊机、黄色引导线、拆除装置和手机按键都做得最清楚，画面和手感也是三家第一。', 'This was K3’s best coding task. The harbor, crane, yellow guidance line, device, and mobile controls were all easy to understand, and its visuals and feel were the best of the three.')}</p>
              <p>{t('它做完后又测了桌面和手机，回头检查真实截图，发现一个黑块不对，再自己修掉。最后一共用了 1 小时 16 分 55.95 秒，是 GPT-5.6 Sol 的 3.35 倍。K3 慢归慢，确实没有在原地发呆。', 'After finishing, it tested both desktop and mobile, inspected real screenshots, noticed an incorrect black block, and fixed it. Total time was 1 hour 16 minutes 55.95 seconds, 3.35 times as long as GPT-5.6 Sol. K3 was slow, but it was doing real work during that time.')}</p>
              <ArticleFigure src={gameplay('3d-k3.gif')} alt={t('K3 3D 游戏演示', 'K3 3D gameplay')} caption={t('Kimi K3：三家里完成度最好，也是等得最久的一家。', 'Kimi K3 was the most complete build and the one that took the longest.')} />

              <h3>GPT-5.6 Sol · 89.2</h3>
              <p>{t('Codex 的港口没有 K3 那么有记忆点，但开始、移动、射击、换弹、受击、拆除和结算全部能走通，暂停和存档也正常。它只用了 22 分 57.51 秒。', 'Codex’s harbor was less memorable, but start, movement, shooting, reload, damage, defusal, results, pause, and saved progress all worked. It finished in only 22 minutes 57.51 seconds.')}</p>
              <p>{t('主要短板是第一人称武器占画面太大，最后的拆除装置也几乎没有有效引导。清场后，HUD 只写着前往北侧黄色脉冲装置，没有箭头、距离或屏幕方位标记，我绕了一圈才找到。', 'Its first-person weapon took up too much of the screen, and the final device had almost no useful guidance. After the enemies were cleared, the HUD only told me to find a yellow pulsing device to the north. With no arrow, distance, or on-screen direction, I wandered around before finding it.')}</p>
              <ArticleFigure src={gameplay('3d-codex.gif')} alt={t('Codex 3D 游戏演示', 'Codex 3D gameplay')} caption={t('GPT-5.6 Sol：画面普通一点，但整套流程跑得很顺。', 'GPT-5.6 Sol looked plainer, but the complete flow worked smoothly.')} />

              <h3>MiniMax M3 · 83.6</h3>
              <p>{t('M3 把清场、拆除、胜利结算、重开和手机按键都做了出来，但实际多玩几分钟后，两个问题很扎眼。敌人每开一枪，场景里都会多留一根不消失的黄色竖条。更严重的是，另外两名敌人藏在仓库里，仓库入口却被画成了一整面实墙。', 'M3 implemented the complete clear-defuse-win loop, restart, and mobile controls, but a few extra minutes of play exposed two obvious problems. Every enemy shot left a permanent yellow vertical tracer. More seriously, two enemies spawned inside the warehouse while its entrance looked like a solid wall.')}</p>
              <p>{t('我最后才试出来：正对灰墙一直往前走，角色会直接穿进去，里面左右各站着一名敌人。不主动穿墙，永远清不完四个人。左下角的存活敌人还一直显示 4，打死两个也不更新。', 'Eventually I discovered that walking straight into the gray wall let the player pass through it, revealing one enemy on each side. A normal player would never clear all four enemies without deliberately walking through what looked like a wall. The enemy counter also stayed at four even after two kills.')}</p>
              <ArticleFigure src={asset('3d-m3-hidden-enemies.gif')} alt={t('MiniMax M3 把仓库入口画成实墙', 'MiniMax M3 rendered the warehouse entrance as a solid wall')} caption={t('画面看着是实墙，却必须穿进去才能找到另外两名敌人。', 'The entrance looks solid, but the player must walk through it to find the other two enemies.')} />
              <ArticleFigure src={gameplay('3d-m3.gif')} alt={t('MiniMax 3D 游戏演示', 'MiniMax 3D gameplay')} caption={t('MiniMax M3：完整流程能靠穿墙走通，但正常玩家很容易卡在清敌阶段。', 'MiniMax M3 could be completed by walking through the wall, but normal players were likely to get stuck.')} />
              <LabLink to={path('/lab/3d')}>{t('直接玩三款 3D 游戏', 'Play all three 3D builds')}</LabLink>
            </section>

            <section id="web" className="scroll-mt-24">
              <h2>{t('第三题：网页审美也得过一遍', 'Test three: build a promotion page')}</h2>
              <ArticleFigure src={asset('web-total.png')} alt={t('宣传页总分', 'Promotion page totals')} contain caption={t('Codex 在这一项拿下第一。', 'Codex took first place on this task.')} />
              <ArticleFigure src={asset('web-detail.png')} alt={t('宣传页评分细节', 'Promotion page score details')} contain caption={t('三家的基础功能检查都是 13/13。', 'All three builds passed all 13 functional checks.')} />
              <p>{t('第三题和游戏没关系。我把《一脚晋级》的 10 个本地素材给它们，让三家各做一个中文交互网页，不许联网，限时 45 分钟。', 'For the third test, I gave each agent ten local assets from One Kick and asked for an interactive Chinese promotion page. They could not use the network and had 45 minutes.')}</p>
              <PromptList
                title={t('三边拿到的主要要求', 'Core requirements given to all three agents')}
                items={isEnglish ? [
                  'Use the logo, stadium background, character, three gameplay screenshots, and mini-program code to build the page.',
                  'Put a playable 6×6 football route challenge above the fold. The winning sequence is right, up, right, and it must work with mouse and touch.',
                  'Explain the 500-level game, show all real screenshots and the QR code, add scroll motion, and avoid overflow on both desktop and mobile.',
                ] : [
                  '用 Logo、球场背景、角色、三张实机截图和小程序码做《一脚晋级》中文宣传页。',
                  '首屏放一个 6×6 足球路线挑战，正确路线是右、上、右，鼠标和手指都能滑动。',
                  '讲清 500 关玩法，三张截图和小程序码都要出现；滚动有动画，电脑和手机都不能溢出。',
                ]}
              />

              <h3>Kimi K3 · 91.0</h3>
              <p>{t('做这题之前，我看过 Kimi 的官方帖子，也看了几篇其他人的评测，对 K3 的前端能力期待很高。结果页面一打开，我没有被惊到，反而有点失望。这个 case 不能把它的前端能力说死，但这次确实没有超过我的预期。', 'K3 was the model I expected to win here. I had seen Moonshot’s own front-end examples and several positive reviews. The result was good, but it did not exceed my expectations. One task cannot settle its front-end ability.')}</p>
              <p>{t('K3 的功能最齐。路径格高亮、规则列表、实机叠卡、提示和重置都很好找，45 分钟用满后也没有缺东西。可首屏文案偏长，Logo、角色和球场没有完全融到一起。单看不差，和 Codex 放在一起时，第一眼还是弱了一点。', 'K3 delivered the fullest feature set. Route highlighting, rules, layered gameplay shots, hints, and reset were all easy to find, and nothing was missing when the 45 minutes expired. Its first screen carried too much copy, though, and the logo, character, and stadium did not feel fully integrated. It looked fine alone, but weaker beside the Codex page.')}</p>
              <ArticleFigure src={gameplay('promo-k3.gif')} alt={t('K3 宣传页演示', 'K3 promotion page')} caption={t('Kimi K3：规则、实机截图和二维码都做齐了，视觉整合还差一点。', 'Kimi K3 included the rules, real screenshots, and QR code, but the visual integration was weaker.')} />

              <h3>GPT-5.6 Sol · 95.0</h3>
              <p>{t('Codex 是这一题最好看的。Logo、球场背景、角色和可玩挑战都放进了同一场对局里，桌面和手机都比较完整。从滑动到晋级，路径线、落点、步数和再来一次都很清楚。', 'Codex produced the best-looking page. The logo, stadium background, character, and playable challenge belonged to the same visual scene, and both desktop and mobile felt complete. The path, landing point, move count, win state, and retry were all easy to understand.')}</p>
              <ArticleFigure src={gameplay('promo-codex.gif')} alt={t('Codex 宣传页演示', 'Codex promotion page')} caption={t('GPT-5.6 Sol：视觉最完整，首屏互动也最清楚。', 'GPT-5.6 Sol produced the strongest visual result and the clearest first-screen interaction.')} />

              <h3>MiniMax M3 · 85.0</h3>
              <p>{t('M3 只用了 5 分 45 秒，是真的快。三步挑战、真实截图和扫码入口也都做出来了。但首屏元素太大，三张真实截图直接铺上去有点粗，背景和滚动动效也比 K3 弱一个档次。', 'M3 finished in only 5 minutes 45 seconds. It included the three-step challenge, real screenshots, and the QR code, but the first-screen elements were oversized, the screenshots felt pasted on, and the background and scroll motion were visibly weaker than K3’s.')}</p>
              <ArticleFigure src={gameplay('promo-m3.gif')} alt={t('MiniMax 宣传页演示', 'MiniMax promotion page')} caption={t('MiniMax M3：功能出得最快，但画面和滚动动效更粗。', 'MiniMax M3 finished fastest, but its visuals and scroll motion were rougher.')} />
              <LabLink to={path('/lab/promo')}>{t('打开三款完整宣传页', 'Open all three promotion pages')}</LabLink>
            </section>

            <section id="vision" className="scroll-mt-24">
              <h2>{t('第四题：50 张图，它们到底看懂了多少', 'Test four: what did they really see in 50 images?')}</h2>
              <ArticleFigure src={asset('vision-total.png')} alt={t('图片识别总分', 'Image-recognition totals')} contain caption={t('K3 答对 49/50，拿下这一项。', 'K3 answered 49 out of 50 correctly and won this task.')} />
              <ArticleFigure src={asset('vision-detail.png')} alt={t('图片识别评分细节', 'Image-recognition score details')} contain caption={t('单题中位耗时：K3 28.93 秒，约为另外两家的 3 倍。', 'K3’s median time was 28.93 seconds per image, roughly three times the other two.')} />
              <p>{t('我平时让 Agent 改游戏和网页，经常会直接把截图、设计稿和报错界面丢过去。图一旦看错，后面的分析和改动很容易一路跑偏。所以最后一题专门测识图：既要认物体和小字，也要数人、读图表、看懂界面。', 'When I ask an agent to change a game or a website, I often send screenshots, designs, and error dialogs directly. One visual mistake can send all later reasoning in the wrong direction. The final test therefore covered objects, small text, counting, charts, technical diagrams, and user interfaces.')}</p>
              <p>{t('我做了 50 道图片选择题。每道题单独发送一张图，配一道题和 A 到 D 四个选项。模型只能看随附图片，不能联网或读其他文件，只返回题号、答案和置信度。', 'I created 50 image multiple-choice questions. Each request contained one image, one question, and four options from A to D. The model could only use the attached image, with no network or other local files, and returned only the question number, answer, and confidence.')}</p>
              <ArticleFigure src="/assets/images/image-recognition-dataset-1.jpg" alt={t('生活和文档类识图题', 'Everyday and document image questions')} caption={t('生活、文字和文档类，也有密集计数和长文档找信息。', 'Everyday scenes, text, documents, dense counting, and finding information in a long page.')} />
              <ArticleFigure src="/assets/images/image-recognition-dataset-2.jpg" alt={t('图表和专业类识图题', 'Chart and technical image questions')} caption={t('图表、专业图和界面题，有些要顺着画面再推一两步。', 'Charts, technical diagrams, and interface questions, some requiring an extra reasoning step.')} />

              <h3>{t('错题比总分更有意思', 'The mistakes were more useful than the total')}</h3>
              <p>{t('有时模型只漏掉一个小人，或者看反一个箭头，回答时却一个比一个笃定。下面四张图最能说明问题。', 'Sometimes a model missed one tiny person or reversed one arrow while answering with complete confidence. These four examples show the pattern best.')}</p>
              <ArticleFigure src={asset('vision-count-snow.png')} alt={t('雪地人数计数题', 'Counting people in a snowy scene')} caption={t('正确答案是 8 人。MiniMax M3 和 GPT-5.6 Sol 三次都答 7；K3 三次是 8、8、7。最左边的小人最容易漏。', 'The correct answer is eight. MiniMax M3 and GPT-5.6 Sol answered seven in all three runs; K3 answered eight, eight, and seven. The tiny person on the far left was easy to miss.')} />
              <ArticleFigure src={asset('vision-count-party.png')} alt={t('聚会人数计数题', 'Counting people at a party')} caption={t('正确答案也是 8。K3 和 GPT-5.6 Sol 都答 9，M3 反而答对。GPT-5.6 Sol 当时给了 97% 的置信度。', 'The correct answer is also eight. K3 and GPT-5.6 Sol both answered nine, while M3 was correct. GPT-5.6 Sol reported 97 percent confidence.')} />
              <ArticleFigure src={asset('vision-arrow.png')} alt={t('远处箭头方向题', 'Reading the direction of a distant arrow')} caption={t('正确答案是向上。K3 三次都看对；M3 三次都答向左；GPT-5.6 Sol 三次是向右、向左、向右。', 'The arrow points up. K3 was correct in all three runs; M3 answered left three times; GPT-5.6 Sol answered right, left, and right.')} />
              <ArticleFigure src={asset('vision-ocr.png')} alt={t('大小写字符串识别题', 'Reading a case-sensitive string')} contain caption={t('原图写的是 idUnte。M3 第一遍答对，后两遍改成更像变量名的 idUnit；K3 和 GPT-5.6 Sol 三次都答对。', 'The image says idUnte. M3 was correct once, then “fixed” it to the more plausible variable name idUnit twice. K3 and GPT-5.6 Sol were correct in all three runs.')} />
              <div className="my-8 grid grid-cols-3 gap-3 border-y border-white/10 py-6 text-center">
                <div><p className="text-2xl font-semibold text-white md:text-4xl">49/50</p><p className="mt-2 text-xs text-graphite-500">Kimi K3</p></div>
                <div><p className="text-2xl font-semibold text-pitch-400 md:text-4xl">47/50</p><p className="mt-2 text-xs text-graphite-500">GPT-5.6 Sol</p></div>
                <div><p className="text-2xl font-semibold text-white md:text-4xl">46/50</p><p className="mt-2 text-xs text-graphite-500">MiniMax M3</p></div>
              </div>
              <p>{t('这只是我自己题库的一次结果，不能当成通用模型排行榜。但至少在这 50 道题里，K3 的看图能力确实最强。密集计数、小目标方向和奇怪字符串，都是把截图交给 Agent 时容易埋雷的地方。', 'This is one run on my own dataset, not a universal model leaderboard. Within these 50 questions, however, K3 was clearly the strongest visual reader. Dense counting, tiny directional cues, and unusual strings remain risky inputs for any agent.')}</p>
              <p className="article-note">{t('相关研究也提醒过这件事：回答听起来流畅，不代表模型真的用到了图片。参考 ', 'Recent research raises the same warning: a fluent answer does not prove the image actually informed it. See ')}<a href="https://arxiv.org/abs/2605.10893" target="_blank" rel="noreferrer">Grounded or Guessing?</a>{t(' 和 ', ' and ')}<a href="https://arxiv.org/abs/2606.02357" target="_blank" rel="noreferrer">Do Multimodal Agents Really Benefit from Tool Use?</a>{t('。', '.')}</p>
              <LabLink to={path('/lab/vision')}>{t('展开查看全部 50 题结果', 'Inspect all 50 answers')}</LabLink>
            </section>

            <section id="choice" className="scroll-mt-24">
              <h2>{t('真要自己续费，我会这么选', 'What I would renew with my own money')}</h2>
              <p>{t('分数只是一部分。真到掏钱续订时，我更在意平时到底让 Agent 干什么：任务多不多、能不能等，成品是不是马上就要拿去用。', 'Scores are only part of the decision. When it is my own subscription money, I care more about the work I do every day: how many tasks I run, whether I can wait, and how quickly the result needs to be usable.')}</p>
              <div className="my-8 divide-y divide-white/10 border-y border-white/10">
                <div className="py-6">
                  <p className="text-xs uppercase tracking-widest text-pitch-500">01 · Codex</p>
                  <h3 className="mt-2">{t('任务多、代码跑得勤，我会留 Codex', 'For frequent coding work, I would keep Codex')}</h3>
                  <p>{t('GPT-5.6 Sol 这次四项都在 89 分以上，速度也明显领先。最高档约 200 美元/月，但按这次用量估，周额度大约能到 30 亿+ token。对高频用户来说，它目前最省心。', 'GPT-5.6 Sol scored above 89 on all four tasks and was much faster. Its highest plan costs about US$200 a month, but my usage suggests a weekly quota of roughly 3 billion-plus tokens. For a heavy user, it currently creates the least friction.')}</p>
                </div>
                <div className="py-6">
                  <p className="text-xs uppercase tracking-widest text-pitch-500">02 · Kimi K3</p>
                  <h3 className="mt-2">{t('截图、图表和 3D 很多，结果比速度重要，我会让 K3 上', 'For image-heavy or 3D work where quality matters more than speed, I would use K3')}</h3>
                  <p>{t('50 道图片题，它答对 49 道；3D 游戏也是三家完成度最高的。任务不赶时间时，它值得多等一会儿。', 'It answered 49 of 50 image questions correctly, and its 3D game was the most complete of the three. When the deadline is flexible, the extra wait can be worthwhile.')}</p>
                </div>
                <div className="py-6">
                  <p className="text-xs uppercase tracking-widest text-pitch-500">03 · MiniMax M3</p>
                  <h3 className="mt-2">{t('比较吃 token 的日常工作和音频制作，我会交给 M3', 'For token-heavy routine work and audio production, I would use M3')}</h3>
                  <p>{t('它整体代码能力还可以，速度也快。我这段时间还会继续用，也依然推荐它，只是这四道题里的成品质量排在第三。', 'Its overall coding ability is useful and it is fast. I will keep using and recommending it for the right jobs, even though its finished quality ranked third on these four tasks.')}</p>
                </div>
              </div>
              <p>{t('如果只能留一个订阅，我现在会留 Codex。遇到图片、图表、3D 这类更看重完成度的任务，我愿意多等 K3 一会儿。', 'If I could keep only one subscription today, I would keep Codex. For image, chart, and 3D tasks where finished quality matters more, I would still be willing to wait longer for K3.')}</p>
              <p className="article-note">{t('这些选择只来自这两天、这台 Mac 和这四道题。模型和额度都会继续变，过一段时间再测，答案也可能不同。', 'These choices come from two days, one Mac, and four tasks. Models and quotas change quickly, and a later retest may produce a different answer.')}</p>
            </section>

            <section id="tokens" className="scroll-mt-24">
              <h2>{t('最后看看，Token 都烧哪儿了', 'Where the tokens went')}</h2>
              <p>{t('这两天前后，我实际花在评测上的时间差不多有一整天。跑模型、等结果、录屏、查 Bug、整理分数，基本没闲着。订阅费就不算了，反正三个我本来都在用。只算三项编码任务，新增 token 一共约 218 万。缓存读取单独列，不和新增 token 混成一个数。', 'Across the two days, the benchmark consumed roughly a full working day: running models, waiting, recording, finding bugs, and checking scores. I excluded subscription fees because I already used all three plans. The three coding tasks produced about 2.18 million new tokens. Cache reads are reported separately rather than being mixed into that number.')}</p>

              <ArticleFigure src={asset('token-total.png')} alt={t('三项编码任务新增 Token 合计', 'Total new tokens across three coding tasks')} contain caption={t('横条只看新增 Token，灰字是缓存读取，两者没有相加。', 'Bars show new tokens only. Gray text shows cache reads; the two are not added together.')} />
              <ArticleFigure src={asset('token-detail.png')} alt={t('三项编码任务分项 Token', 'Tokens by coding task')} contain caption={t('单位为万 Token；图片识别的记录不完整，没有硬算进去。', 'Values are in ten-thousands of tokens. Image-recognition usage was incomplete and is excluded.')} />
              <p className="sr-only">{t(
                '三项编码任务新增 Token 合计：Kimi K3 56.4 万，GPT-5.6 Sol 82.5 万，MiniMax M3 79.1 万；缓存读取分别为 1091.2 万、842.5 万和 3105.8 万。',
                'Total new tokens across the three coding tasks: Kimi K3 564,000, GPT-5.6 Sol 825,000, and MiniMax M3 791,000. Cache reads were 10.912 million, 8.425 million, and 31.058 million respectively.',
              )}</p>

              <h3>{t('月费差一倍，我估出来的周额度接近 30 倍', 'Twice the monthly price, but roughly thirty times my estimated weekly quota')}</h3>
              <p>{t('7 月 18 日，GPT-5.6 Sol 的本地统计是 30.2 亿 token，其中 28.6 亿是缓存读取。当时周额度还剩 6%。照这次用量粗估，跑满一周大约是 30 亿+ token。', 'On July 18, my local GPT-5.6 Sol record showed 3.02 billion tokens, including 2.86 billion cache reads, while six percent of the weekly quota remained. Based on that pattern, a full week works out to roughly 3 billion-plus tokens.')}</p>
              <ArticleFigure src={asset('codex-token-usage.png')} alt={t('Codex 单日 token 构成', 'One-day Codex token breakdown')} contain caption={t('图里的美元是 ccusage 按 API 价格估算，不是订阅账单。', 'The dollar amount is an API-price estimate from ccusage, not my subscription bill.')} />
              <ArticleFigure src={asset('codex-week-quota.png')} alt={t('Codex 周额度剩余 6%', 'Six percent of the Codex weekly quota remaining')} contain caption={t('当时周额度还剩 6%。', 'Six percent of the weekly quota remained.')} />
              <p>{t('Kimi 这边，我大约 34 小时跑了 600 次调用，后台周用量到了 50%，5 小时频限也到了 100%。本地记录最后约 5530 万 token，照自己的用量估，一周大约是 1 亿+。', 'On Kimi, I made about 600 agent calls over 34 hours. The dashboard reached 50 percent of the weekly allowance and 100 percent of the five-hour limit. My local record ended around 55.3 million tokens, suggesting roughly 100 million-plus for a full week at my usage pattern.')}</p>
              <ArticleFigure src={asset('kimi-token-ledger.png')} alt={t('Kimi 本地 token 记录', 'Local Kimi token record')} contain caption={t('本地先记到 4844 万 token，其中大部分是缓存读取。', 'The local ledger first recorded 48.44 million tokens, mostly cache reads.')} />
              <ArticleFigure src={asset('kimi-week-quota.png')} alt={t('Kimi Allegro 周用量 50%', 'Kimi Allegro at 50 percent weekly usage')} contain caption={t('周用量到 50%，5 小时频限到 100%。', 'Weekly usage reached 50 percent and the five-hour limit reached 100 percent.')} />
              <p>{t('两张统计都包含大量缓存读取，两边跑的任务也不完全一样，所以只能当作个人粗略参考。Codex 月费约为 Kimi 的 2 倍，我估出来的周额度却接近 30 倍。经常跑长任务的话，Kimi 最高档确实有点抠。', 'Both records include large cache reads, and the workloads were not identical, so this is only a personal estimate. Codex costs about twice as much per month, while my estimated weekly quota was nearly thirty times larger. For frequent long-running work, Kimi’s top plan feels tight.')}</p>
              <p>{t('M3 的 3D 缓存数字很夸张，是因为它一共走了 220 次 Agent 调用，平均每次读取约 13.1 万缓存 token。那不是 2924.4 万全新的内容，更像同一段上下文被反复读取的总流量。', 'M3’s 3D cache figure looks extreme because it made 220 agent calls, reading about 131,000 cached tokens per call on average. The resulting 29.244 million total is not all new content; it is repeated traffic through the same context.')}</p>
            </section>

            <section className="mt-16 border-t border-white/10 pt-10 md:mt-20">
              <div className="grid items-center gap-8 rounded-2xl border border-white/10 bg-graphite-900/45 p-5 sm:grid-cols-[9rem_1fr] md:p-8">
                <img src="/assets/images/qr-code.png" alt={t('《一脚晋级》小程序码', 'One Kick WeChat mini-program code')} loading="lazy" className="h-36 w-36 rounded-xl bg-paper p-1" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-pitch-500">{t('我做的第一款小游戏', 'My first shipped mini game')}</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{t('《一脚晋级》', 'One Kick')}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-graphite-300 md:text-base">{t('这篇评测里的三个宣传页，都围绕这款 500 关足球解谜游戏制作。微信扫码可以直接玩。', 'All three promotion pages in this test were built around this 500-level football puzzle game. Scan the code in WeChat to play.')}</p>
                </div>
              </div>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-sm leading-relaxed text-graphite-400">{t('四项实测的完整网页、可玩版本和 50 道题，都放在实验室。', 'The complete pages, playable builds, and all 50 image questions are available in the lab.')}</p>
                <Link to={path('/lab')} className="inline-flex shrink-0 text-sm font-medium text-pitch-400 hover:text-pitch-300">{t('进入实验室', 'Open the lab')}<span className="ml-2">→</span></Link>
              </div>
            </section>

            <footer className="mt-12 border-t border-white/10 pt-8 text-sm text-graphite-500">
              <p>Kevin AI局 · 2026.07.19</p>
              <Link to={path('/notes')} className="mt-3 inline-flex text-graphite-400 hover:text-white">{t('返回文章列表', 'Back to notes')}<span className="ml-2">→</span></Link>
            </footer>
          </ArticleLightbox>
        </div>
      </article>
    </>
  )
}
