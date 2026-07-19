import { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'

type Score = {
  name: string
  value: number
  tone?: 'accent' | 'light' | 'muted'
}

type Scene = {
  src: string
  label: string
  note: string
}

const ARTICLE_URL = 'https://kevinai.top/en/articles/kimi-k3-review'
const SHARE_URL = `https://twitter.com/intent/tweet?url=${encodeURIComponent(ARTICLE_URL)}&text=${encodeURIComponent('I tested Kimi K3 against Codex and MiniMax across two games, a website, and 50 images.')}`
const zhArticleUrl = 'https://mp.weixin.qq.com/s/EO2wmTxd4vbCi1bjsKWgUw'
const enAsset = (name: string) => `/assets/article-kimi-k3-en/${name}`
const articleAsset = (name: string) => `/assets/article-kimi-k3/${name}`

const scoreRows = [
  ['2D web game', '80.5', '96.0', '54.5'],
  ['3D first-person shooter', '91.0', '89.2', '83.6'],
  ['One Kick promotion page', '91.0', '95.0', '85.0'],
  ['50-image vision test', '96.7', '90.0', '88.0'],
  ['Equal-weight total', '89.8', '92.6', '77.8'],
]

const speedRows = [
  { task: '2D game', kimi: '40:00', codex: '14:45', minimax: '36:56', max: 2400, values: [2400, 885, 2216] },
  { task: '3D game', kimi: '1:16:56', codex: '22:58', minimax: '44:05', max: 4616, values: [4616, 1378, 2645] },
  { task: 'Promotion page', kimi: '45:00', codex: '34:42', minimax: '5:45', max: 2700, values: [2700, 2082, 345] },
]

function Figure({ src, alt, caption, contain = false }: { src: string; alt: string; caption: ReactNode; contain?: boolean }) {
  return (
    <figure className="my-8 overflow-hidden rounded-2xl border border-white/10 bg-graphite-900/45 md:my-10">
      <div className={contain ? 'flex justify-center bg-[#f4f3ef] p-3 md:p-5' : 'bg-graphite-900'}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`h-auto w-full ${contain ? 'max-h-[46rem] object-contain' : 'object-cover'}`}
        />
      </div>
      <figcaption className="border-t border-white/10 px-4 py-3 text-sm leading-relaxed text-graphite-400 md:px-5">{caption}</figcaption>
    </figure>
  )
}

function ScoreBars({ title, scores, note = 'Quality score out of 100; speed is separate' }: { title: string; scores: Score[]; note?: string }) {
  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-graphite-900/35 p-5 md:p-7">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <h3 className="!m-0 text-xl font-semibold text-white md:text-2xl">{title}</h3>
        <p className="!m-0 text-xs text-graphite-500">{note}</p>
      </div>
      <div className="space-y-5">
        {scores.map((score) => (
          <div key={score.name} className="grid grid-cols-[6.6rem_1fr_3rem] items-center gap-3 text-sm">
            <span className={score.tone === 'accent' ? 'font-medium text-white' : 'text-graphite-300'}>{score.name}</span>
            <span className="h-2 overflow-hidden rounded-full bg-white/5">
              <span
                className={`block h-full rounded-full ${score.tone === 'accent' ? 'bg-pitch-500' : score.tone === 'muted' ? 'bg-graphite-700' : 'bg-graphite-500'}`}
                style={{ width: `${score.value}%` }}
              />
            </span>
            <span className={`text-right tabular-nums ${score.tone === 'accent' ? 'font-semibold text-pitch-400' : 'text-graphite-200'}`}>{score.value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SceneStrip({ scenes }: { scenes: Scene[] }) {
  return (
    <div className="my-8 grid gap-4 md:grid-cols-3">
      {scenes.map((scene) => (
        <figure key={scene.label} className="overflow-hidden rounded-xl border border-white/10 bg-graphite-900/45">
          <img src={scene.src} alt={`${scene.label} game scene`} loading="lazy" className="aspect-[16/7] w-full object-cover" />
          <figcaption className="p-4">
            <p className="!m-0 text-xs uppercase tracking-widest text-pitch-500">{scene.label}</p>
            <p className="!mt-2 text-sm !leading-relaxed text-graphite-400">{scene.note}</p>
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

function ResultsTable() {
  return (
    <div className="my-8 overflow-hidden rounded-2xl border border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <thead className="bg-graphite-900/70 text-xs uppercase tracking-wider text-graphite-500">
            <tr>
              <th className="px-4 py-4 font-medium">Task</th>
              <th className="px-4 py-4 font-medium">Kimi K3</th>
              <th className="px-4 py-4 font-medium">GPT-5.6 Sol</th>
              <th className="px-4 py-4 font-medium">MiniMax M3</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {scoreRows.map((row, index) => (
              <tr key={row[0]} className={index === scoreRows.length - 1 ? 'bg-white/[0.025]' : ''}>
                <th className="px-4 py-4 font-medium text-white">{row[0]}</th>
                <td className="px-4 py-4 tabular-nums text-graphite-200">{row[1]}</td>
                <td className="px-4 py-4 tabular-nums text-pitch-400">{row[2]}</td>
                <td className="px-4 py-4 tabular-nums text-graphite-300">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SpeedComparison() {
  return (
    <div className="my-8 rounded-2xl border border-white/10 bg-graphite-900/35 p-5 md:p-7">
      <div className="mb-7">
        <p className="text-xs uppercase tracking-[0.18em] text-pitch-500">Elapsed time</p>
        <h3 className="!mb-0 !mt-2">K3 was last to finish all three coding tasks</h3>
      </div>
      <div className="space-y-8">
        {speedRows.map((row) => (
          <div key={row.task}>
            <p className="!m-0 mb-3 text-sm font-medium text-white">{row.task}</p>
            <div className="space-y-2 text-xs">
              {[
                ['Kimi K3', row.kimi, row.values[0], 'bg-graphite-400'],
                ['GPT-5.6', row.codex, row.values[1], 'bg-pitch-500'],
                ['MiniMax', row.minimax, row.values[2], 'bg-graphite-700'],
              ].map(([name, time, value, color]) => (
                <div key={String(name)} className="grid grid-cols-[4.7rem_1fr_3.5rem] items-center gap-3">
                  <span className="text-graphite-400">{name}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-white/5">
                    <span className={`block h-full rounded-full ${color}`} style={{ width: `${(Number(value) / row.max) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums text-graphite-300">{time}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="article-note !mb-0">The 2D task and promotion page had fixed time limits. K3 was still working when both limits expired.</p>
    </div>
  )
}

function Brief({ children }: { children: ReactNode }) {
  return (
    <aside className="my-8 border-y border-white/10 py-6">
      <p className="mb-4 text-xs uppercase tracking-[0.18em] text-pitch-500">The brief, shortened</p>
      <div className="text-sm leading-relaxed text-graphite-300 md:text-base">{children}</div>
    </aside>
  )
}

function EvidenceCard({ label, value, detail, ratio }: { label: string; value: string; detail: string; ratio: number }) {
  return (
    <div className="border-t border-white/10 py-5">
      <p className="!m-0 text-xs uppercase tracking-widest text-graphite-500">{label}</p>
      <p className="!mt-2 text-3xl font-semibold tabular-nums text-white">{value}</p>
      <span className="mt-4 block h-1.5 overflow-hidden rounded-full bg-white/5">
        <span className="block h-full rounded-full bg-pitch-500" style={{ width: `${ratio}%` }} />
      </span>
      <p className="!mt-3 text-sm !leading-relaxed text-graphite-400">{detail}</p>
    </div>
  )
}

export default function KimiK3ReviewEn() {
  const toc = [
    ['answer', 'My answer after two days'],
    ['method', 'How I ran the test'],
    ['2d', 'A slingshot game'],
    ['3d', 'A harder 3D shooter'],
    ['web', 'The page I expected K3 to win'],
    ['vision', '50 image questions'],
    ['choice', 'Which subscription I would keep'],
    ['quota', 'Tokens and quota'],
  ]

  return (
    <>
      <SEOHead
        title="I tested Kimi K3 with two games, a website, and 50 images"
        description="I spent two days comparing Kimi K3 with GPT-5.6 Sol and MiniMax M3 using two browser games, a promotion page, and 50 image questions."
        image="https://kevinai.top/assets/article-kimi-k3-en/og-kimi-k3-review.png"
        type="article"
        publishedTime="2026-07-19T00:00:00.000Z"
        canonicalPath="/en/articles/kimi-k3-review"
        alternateZhPath="/notes/kimi-k3-subscription-review"
        alternateEnPath="/en/articles/kimi-k3-review"
      />

      <article className="pb-24 pt-24 md:pb-32 md:pt-32">
        <header className="mx-auto max-w-[1400px] px-4 md:px-6">
          <Link to="/en/articles" className="inline-flex text-sm text-graphite-400 transition-colors hover:text-white">
            <span className="mr-2" aria-hidden="true">←</span>All English articles
          </Link>

          <div className="mt-10 grid gap-10 border-b border-white/10 pb-12 md:pb-16 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs uppercase tracking-[0.16em] text-graphite-500">
                <span className="text-pitch-500">Hands-on AI test</span>
                <span>July 19, 2026</span>
                <span>18 min read</span>
              </div>
              <h1 className="max-w-5xl text-4xl font-semibold leading-[1.03] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
                I paid $100 for Kimi K3. Then I gave it two games, a website, and 50 images.
              </h1>
              <p className="mt-7 max-w-[65ch] text-lg leading-relaxed text-graphite-200 md:text-xl">
                Over two days, I gave Kimi K3, GPT-5.6 Sol, and MiniMax M3 the same four jobs. K3 did especially well on the 3D game and the image questions. Waiting for it was another story.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href={SHARE_URL} target="_blank" rel="noreferrer" className="inline-flex rounded-full bg-pitch-600 px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-pitch-500">
                  Share on X / Twitter
                </a>
                <a href={zhArticleUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-graphite-200 transition-colors hover:border-white/25 hover:text-white">
                  Read the Chinese original
                </a>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-3 lg:col-span-4 lg:grid-cols-1 lg:justify-self-end">
              {[
                ['GPT-5.6 Sol', '92.6', 'text-pitch-400'],
                ['Kimi K3', '89.8', 'text-white'],
                ['MiniMax M3', '77.8', 'text-graphite-300'],
              ].map(([name, value, color]) => (
                <div key={name} className="border-t border-white/10 pt-3 lg:min-w-[15rem]">
                  <dt className="text-xs text-graphite-500">{name}</dt>
                  <dd className={`mt-1 text-2xl font-semibold tabular-nums ${color}`}>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </header>

        <div className="mx-auto mt-10 grid max-w-[1400px] grid-cols-1 gap-12 px-4 md:mt-16 md:px-6 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block">
            <nav className="sticky top-28 border-l border-white/10 pl-5" aria-label="Article contents">
              <p className="mb-4 text-xs uppercase tracking-[0.18em] text-graphite-500">Contents</p>
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

          <div className="article-body min-w-0 lg:col-span-8 lg:col-start-5">
            <section id="answer" className="scroll-mt-24">
              <h2>My answer after two days</h2>
              <div className="my-8 divide-y divide-white/10 border-y border-white/10">
                <div className="grid gap-3 py-6 sm:grid-cols-[2rem_1fr]">
                  <span className="text-sm tabular-nums text-pitch-500">01</span>
                  <p className="!m-0">On task quality alone, I would put Kimi K3 among the top three coding agents I can use today. It finished second overall at 89.8, with the best scores on 3D and vision.</p>
                </div>
                <div className="grid gap-3 py-6 sm:grid-cols-[2rem_1fr]">
                  <span className="text-sm tabular-nums text-pitch-500">02</span>
                  <p className="!m-0">Its weak spot is easy to name: speed. Across the three coding jobs, I waited about three times as long as I did for GPT-5.6 Sol.</p>
                </div>
                <div className="grid gap-3 py-6 sm:grid-cols-[2rem_1fr]">
                  <span className="text-sm tabular-nums text-pitch-500">03</span>
                  <p className="!m-0">Kimi Code's highest tier also felt tighter than I expected on long agent jobs. The quota figures below are estimates from my own two days, not Moonshot's published limits.</p>
                </div>
              </div>

              <p>Each model ran in its own agent tool: K3 in Kimi Code CLI, GPT-5.6 Sol in Codex CLI, and MiniMax M3 in mmx.</p>
              <p>I picked those three for a practical reason: I was already paying for all of them. Kimi Code Allegro cost me RMB 699 a month, or about US$100. Codex was roughly US$200, and MiniMax Ultra was RMB 469.</p>

              <Figure
                src={articleAsset('k3-official-benchmark.png')}
                alt="Official Kimi K3 coding benchmark chart"
                contain
                caption={<>Kimi K3 is highlighted in blue. Source: <a href="https://www.kimi.com/blog/kimi-k3" target="_blank" rel="noreferrer" className="text-pitch-400 hover:text-pitch-300">Moonshot AI's Kimi K3 technical post</a>.</>}
              />
            </section>

            <section id="method" className="scroll-mt-24">
              <h2>How I ran the test</h2>
              <p>All three agents ran on the same Mac. Each got the same brief and local assets, with extra skills disabled. I started the clock when a run began and stopped it when the agent stopped on its own.</p>
              <p>I set time limits for the 2D game and promotion page. The 3D game ran until completion. For vision, I sent one image and one multiple-choice question in each request.</p>
              <p>I kept speed out of the quality score. Each task made up a quarter of the final result. I scored visual quality and game feel myself.</p>

              <ResultsTable />
              <SpeedComparison />
              <p className="article-note">These results cover three products in these local setups. They are not a general model leaderboard.</p>
            </section>

            <section id="2d" className="scroll-mt-24">
              <h2>I started with a slingshot game</h2>
              <ScoreBars
                title="2D web game"
                scores={[
                  { name: 'Kimi K3', value: 80.5, tone: 'light' },
                  { name: 'GPT-5.6', value: 96.0, tone: 'accent' },
                  { name: 'MiniMax', value: 54.5, tone: 'muted' },
                ]}
              />
              <Brief>Build a three-level browser game with drag-to-charge, release-to-fire, destructible structures, touch support, sound, scoring, pause, retry, win, and loss states. Use only local web technology. Time limit: 40 minutes.</Brief>

              <h3>Kimi K3 · 80.5</h3>
              <p>K3's first build looked the most ambitious. It wrote its own collision system, particles, and audio, then added a purple dusk scene, robot guards, pause, restart, and saved progress.</p>
              <p>The 40-minute limit expired before K3 finished tuning the physics. In levels two and three, structures moved after a few idle seconds and sometimes collapsed without a shot. More time might have helped, but I scored the build that was on screen at the deadline.</p>

              <h3>GPT-5.6 Sol · 96.0</h3>
              <p>Codex's version was the one that simply worked. I pulled and released the slingshot twice, and both shots behaved normally. All three levels stayed still while idle, and the mobile layout did not need horizontal scrolling. The agent also noticed that level one needed more launch force, changed it, and tested again.</p>

              <h3>MiniMax M3 · 54.5</h3>
              <p>M3 had a polished opening, projectile trails, an airborne ability, and working mouse and touch input. Then I tried to aim upward. The controls were reversed, so I could not fire a useful arc. The stone in level one fell short of the enemy, making the level impossible through normal play. A refresh also wiped the progress.</p>

              <SceneStrip scenes={[
                { src: enAsset('2d-kimi-scene.png'), label: 'Kimi K3', note: 'The best-looking build, but its structures moved on their own.' },
                { src: enAsset('2d-codex-scene.png'), label: 'GPT-5.6 Sol', note: 'Less ornate; the controls worked and all three levels stayed stable.' },
                { src: enAsset('2d-minimax-scene.png'), label: 'MiniMax M3', note: 'It looked finished until I tried to aim upward.' },
              ]} />
              <Link to="/en/lab/2d" className="inline-flex rounded-full border border-pitch-500/35 bg-pitch-500/10 px-5 py-2.5 text-sm font-medium text-pitch-300 hover:border-pitch-400">Play all three 2D builds <span className="ml-2">→</span></Link>
            </section>

            <section id="3d" className="scroll-mt-24">
              <h2>Next came a harder 3D shooter</h2>
              <ScoreBars
                title="3D first-person shooter"
                scores={[
                  { name: 'Kimi K3', value: 91.0, tone: 'accent' },
                  { name: 'GPT-5.6', value: 89.2, tone: 'light' },
                  { name: 'MiniMax', value: 83.6, tone: 'muted' },
                ]}
              />
              <Brief>Build a first-person game in a harbor warehouse. The player must move, aim, shoot, reload, defeat at least four enemies within 75 seconds, and hold a device for 1.5 seconds to win. Desktop and mobile must both work using a local copy of Three.js.</Brief>

              <h3>Kimi K3 · 91.0</h3>
              <p>The 3D game was K3's best coding result. Its harbor, crane, route line, defusal device, and mobile controls were the clearest at a glance. It was also my favorite to look at and play.</p>
              <p>After the game worked, K3 tested desktop and mobile, checked real screenshots, spotted a black block that should not have been there, and fixed it. The run took 1 hour 16 minutes 55.95 seconds, 3.35 times as long as Codex.</p>

              <h3>GPT-5.6 Sol · 89.2</h3>
              <p>Codex's harbor was less memorable, but movement, combat, reload, damage, defusal, results, pause, and saved progress all worked. It finished in 22 minutes 57.51 seconds.</p>
              <p>The weapon occupied too much of the view, and the final device needed better guidance. After clearing the enemies, I had to wander around before I found it.</p>

              <h3>MiniMax M3 · 83.6</h3>
              <p>M3 reached the win screen and included mobile controls. After a few more minutes, I found two problems. Enemy shots left permanent yellow tracers, and two enemies spawned inside a warehouse whose entrance looked like a solid wall.</p>
              <p>The only way I found those two enemies was to walk straight through the gray wall. Without that trick, I could not finish the match. The enemy counter also stayed at four after I killed two.</p>

              <SceneStrip scenes={[
                { src: enAsset('3d-kimi-scene.png'), label: 'Kimi K3', note: 'The clearest harbor and the version I most enjoyed playing.' },
                { src: enAsset('3d-codex-scene.png'), label: 'GPT-5.6 Sol', note: 'The full combat loop worked in a run under 23 minutes.' },
                { src: enAsset('3d-minimax-scene.png'), label: 'MiniMax M3', note: 'Playable, but a solid-looking wall hid the last two enemies.' },
              ]} />
              <Link to="/en/lab/3d" className="inline-flex rounded-full border border-pitch-500/35 bg-pitch-500/10 px-5 py-2.5 text-sm font-medium text-pitch-300 hover:border-pitch-400">Play all three 3D builds <span className="ml-2">→</span></Link>
            </section>

            <section id="web" className="scroll-mt-24">
              <h2>The page I expected K3 to win</h2>
              <ScoreBars
                title="One Kick promotion page"
                scores={[
                  { name: 'Kimi K3', value: 91.0, tone: 'light' },
                  { name: 'GPT-5.6', value: 95.0, tone: 'accent' },
                  { name: 'MiniMax', value: 85.0, tone: 'muted' },
                ]}
              />
              <Brief>Use ten local assets from One Kick to build a Chinese promotion page. The first screen must include a playable 6×6 route puzzle. The page must explain the 500-level game, show three real screenshots and the mini-program code, animate on scroll, and avoid overflow. Time limit: 45 minutes.</Brief>

              <p>One Kick is my 500-level football route puzzle for WeChat. The three agents received the same logo, stadium background, characters, gameplay screenshots, and mini-program code.</p>

              <div className="my-8 divide-y divide-white/10 border-y border-white/10">
                {[
                  ['Kimi K3', '91.0', '45:00', 'All 13 checks passed, but the opening copy ran long and the logo, character, and pitch never quite looked like they belonged in the same scene.'],
                  ['GPT-5.6 Sol', '95.0', '34:42', 'The opening composition was strongest, and the three-move puzzle was clear on desktop and mobile.'],
                  ['MiniMax M3', '85.0', '5:45', 'Every required piece arrived in 5:45, but the oversized opening and simple motion placed third.'],
                ].map(([name, score, time, note]) => (
                  <div key={name} className="grid gap-4 py-6 sm:grid-cols-[7.5rem_4rem_4rem_1fr] sm:items-start">
                    <p className="!m-0 font-medium text-white">{name}</p>
                    <p className="!m-0 tabular-nums text-pitch-400">{score}</p>
                    <p className="!m-0 tabular-nums text-graphite-500">{time}</p>
                    <p className="!m-0 text-sm !leading-relaxed text-graphite-300">{note}</p>
                  </div>
                ))}
              </div>

              <p>I expected K3 to win this one. Moonshot's front-end demos looked good, and so did several reviews I had read. The page I got was solid, but GPT-5.6 Sol looked better. One page is not enough to judge all of K3's front-end work. This one still disappointed me.</p>
              <Link to="/en/lab/promo" className="inline-flex rounded-full border border-pitch-500/35 bg-pitch-500/10 px-5 py-2.5 text-sm font-medium text-pitch-300 hover:border-pitch-400">Open the three original pages <span className="ml-2">→</span></Link>
              <p className="article-note">The original pages were built in Chinese because that was part of the brief. I have not reused their Chinese screenshots in this English article.</p>
            </section>

            <section id="vision" className="scroll-mt-24">
              <h2>I finished with 50 image questions</h2>
              <ScoreBars
                title="Image recognition"
                scores={[
                  { name: 'Kimi K3', value: 96.7, tone: 'accent' },
                  { name: 'GPT-5.6', value: 90.0, tone: 'light' },
                  { name: 'MiniMax', value: 88.0, tone: 'muted' },
                ]}
              />
              <p>I often hand coding agents screenshots, design mockups, and error dialogs. If one small detail is misread, everything after it can go wrong. I wrote 50 questions covering objects, counting, spatial relations, text, documents, charts, scientific diagrams, circuit diagrams, and interfaces.</p>
              <p>Each request had one image, one question, and four answer choices. The model could use only the attached image, with no network access or other local files.</p>

              <div className="my-8 grid gap-5 md:grid-cols-2">
                <Figure src={articleAsset('vision-count-snow.png')} alt="Eight people in a snowy scene" caption="Correct answer: eight. MiniMax M3 and GPT-5.6 Sol answered seven in all three runs. K3 answered eight, eight, and seven." />
                <Figure src={articleAsset('vision-count-party.png')} alt="Eight people at a party" caption="Correct answer: eight. K3 and GPT-5.6 Sol answered nine; M3 was correct. GPT-5.6 Sol reported 97 percent confidence." />
                <Figure src={enAsset('vision-arrow-crop.png')} alt="A cropped traffic sign with an arrow pointing up" caption="Cropped from the full street photo used in the test; the models saw the original. The arrow points up. K3 was correct three times. M3 answered left three times. GPT-5.6 Sol answered right, left, and right." />
                <Figure src={articleAsset('vision-ocr.png')} alt="The case-sensitive text idUnte" contain caption="The image says idUnte. M3 read it correctly once, then changed it to the more plausible idUnit twice. K3 and GPT-5.6 Sol were correct in all three runs." />
              </div>

              <div className="my-8 grid grid-cols-3 gap-3 border-y border-white/10 py-6 text-center">
                <div><p className="!m-0 text-2xl font-semibold text-white md:text-4xl">49/50</p><p className="!mt-2 text-xs text-graphite-500">Kimi K3</p></div>
                <div><p className="!m-0 text-2xl font-semibold text-pitch-400 md:text-4xl">47/50</p><p className="!mt-2 text-xs text-graphite-500">GPT-5.6 Sol</p></div>
                <div><p className="!m-0 text-2xl font-semibold text-white md:text-4xl">46/50</p><p className="!mt-2 text-xs text-graphite-500">MiniMax M3</p></div>
              </div>

              <p>In these 50 questions, K3 was the best at reading the images. It was also the slowest: the median response took 28.93 seconds, versus 8.84 seconds for GPT-5.6 Sol and 8.61 seconds for M3.</p>
              <p className="article-note">A confident answer can still be a guess. For background, see <a href="https://arxiv.org/abs/2605.10893" target="_blank" rel="noreferrer">Grounded or Guessing?</a> and <a href="https://arxiv.org/abs/2606.02357" target="_blank" rel="noreferrer">Do Multimodal Agents Really Benefit from Tool Use?</a>.</p>
              <Link to="/en/lab/vision" className="inline-flex rounded-full border border-pitch-500/35 bg-pitch-500/10 px-5 py-2.5 text-sm font-medium text-pitch-300 hover:border-pitch-400">Inspect all 50 results <span className="ml-2">→</span></Link>
            </section>

            <section id="choice" className="scroll-mt-24">
              <h2>Which subscription I would keep</h2>
              <p>When I pay for a subscription, the score is only part of it. Day to day, I care about how often I run agents, how long I can wait, and whether I need the result immediately.</p>
              <div className="my-8 divide-y divide-white/10 border-y border-white/10">
                <div className="py-6">
                  <p className="!m-0 text-xs uppercase tracking-widest text-pitch-500">01 · Codex</p>
                  <h3 className="!mt-2">For frequent coding work</h3>
                  <p>GPT-5.6 Sol scored above 89 on all four tasks and finished much sooner. In this test, it kept me waiting the least and gave me the fewest problems to work around.</p>
                </div>
                <div className="py-6">
                  <p className="!m-0 text-xs uppercase tracking-widest text-pitch-500">02 · Kimi K3</p>
                  <h3 className="!mt-2">For image-heavy and 3D work that can wait</h3>
                  <p>K3 answered 49 of 50 image questions correctly and produced the most complete 3D game. If I do not need the result quickly, I am willing to wait for it.</p>
                </div>
                <div className="py-6">
                  <p className="!m-0 text-xs uppercase tracking-widest text-pitch-500">03 · MiniMax M3</p>
                  <h3 className="!mt-2">For token-heavy routine work and audio production</h3>
                  <p>M3 is fast, and I still use it for routine coding and audio. Its finished work ranked third here, but those are not the only jobs I use it for.</p>
                </div>
              </div>
              <p>If I could keep only one subscription today, I would keep Codex. For images, charts, or 3D work where the finished result matters more, I would still wait longer for K3.</p>
              <p className="article-note">This choice comes from two days, one Mac, and four tasks. Models, tools, and subscription plans can change quickly.</p>
            </section>

            <section id="quota" className="scroll-mt-24">
              <h2>Where the tokens went</h2>
              <p>The test took me roughly a full working day once I counted model runs, waiting, recording, bug checks, and scoring. Across the three coding jobs, the agents generated about 2.18 million new tokens. Cache reads are listed separately.</p>

              <div className="my-8 overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
                  <thead className="bg-graphite-900/60 text-xs text-graphite-400">
                    <tr>
                      <th className="px-4 py-4 font-medium">Task</th>
                      <th className="px-4 py-4 font-medium">Kimi K3</th>
                      <th className="px-4 py-4 font-medium">GPT-5.6 Sol</th>
                      <th className="px-4 py-4 font-medium">MiniMax M3</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-graphite-200">
                    {[
                      ['2D', '174k / 2.703m', '219k / 1.796m', '244k / 2.167m'],
                      ['3D', '220k / 5.594m', '223k / 2.001m', '480k / 28.764m'],
                      ['Web', '170k / 2.615m', '383k / 4.628m', '67k / 128k'],
                      ['Total', '564k / 10.912m', '825k / 8.425m', '791k / 31.058m'],
                    ].map((row) => (
                      <tr key={row[0]}>
                        {row.map((cell, index) => <td key={cell} className={`px-4 py-4 tabular-nums ${index === 0 ? 'font-medium text-white' : ''}`}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="article-note">Each cell shows new tokens first and cache reads second. Vision usage was incomplete and is excluded.</p>

              <h3>My weekly estimate was close to 30:1</h3>
              <p>On July 18, my local Codex record showed 3.02 billion tokens, including 2.86 billion cache reads, with six percent of the weekly allowance remaining. At that pace, a full week would be roughly 3 billion-plus tokens.</p>
              <p>For Kimi, I made about 600 agent calls over 34 hours. The dashboard reached 50 percent of the weekly allowance and 100 percent of the five-hour limit. My local record ended around 55.3 million tokens. At roughly the same pace, a full week would be about 100 million-plus.</p>

              <div className="my-8 grid gap-5 md:grid-cols-2">
                <EvidenceCard label="Codex plan · about $200/month" value="~3B+ / week" detail="Personal estimate from 3.02B recorded tokens with 6% of the weekly allowance left." ratio={94} />
                <EvidenceCard label="Kimi Allegro · about $100/month" value="~100M+ / week" detail="Personal estimate after 600 calls, 50% weekly usage, and a fully used five-hour window." ratio={50} />
              </div>

              <p>The workloads were not identical, and both totals include large cache reads. These are my usage records, not company promises. If you run long agent jobs every day, the gap is hard to ignore.</p>
              <p>M3's 3D cache number looks unusually large because the run made 220 agent calls and repeatedly read the same context. It should not be treated as 29.244 million tokens of new output.</p>
            </section>

            <section className="mt-16 border-t border-white/10 pt-10 md:mt-20">
              <div className="grid items-center gap-8 rounded-2xl border border-white/10 bg-graphite-900/45 p-5 sm:grid-cols-[9rem_1fr] md:p-8">
                <img src="/assets/images/qr-code.png" alt="One Kick WeChat mini-program code" loading="lazy" className="h-36 w-36 rounded-xl bg-paper p-1" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-pitch-500">My first shipped mini game</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">One Kick</h2>
                  <p className="mt-3 text-sm leading-relaxed text-graphite-300 md:text-base">One Kick is a 500-level football route puzzle released as a WeChat mini game. The code opens only inside WeChat: use Scan and point the camera at it.</p>
                </div>
              </div>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-xl text-sm leading-relaxed text-graphite-400">The playable builds, promotion pages, and all 50 image answers are available in the lab.</p>
                <Link to="/en/lab" className="inline-flex shrink-0 text-sm font-medium text-pitch-400 hover:text-pitch-300">Open the lab <span className="ml-2">→</span></Link>
              </div>
            </section>

            <footer className="mt-12 border-t border-white/10 pt-8 text-sm text-graphite-500">
              <p>Kevin AI Observatory · July 19, 2026</p>
              <div className="mt-3 flex flex-wrap gap-5">
                <Link to="/en/articles" className="text-graphite-400 hover:text-white">All English articles <span className="ml-1">→</span></Link>
                <a href={zhArticleUrl} target="_blank" rel="noreferrer" className="text-graphite-400 hover:text-white">Chinese original <span className="ml-1">↗</span></a>
              </div>
            </footer>
          </div>
        </div>
      </article>
    </>
  )
}
