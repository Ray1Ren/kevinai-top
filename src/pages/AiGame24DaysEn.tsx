import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
import {
  ArticleFigure,
  ArticleQrCta,
  AudioSample,
  GameScreenshotGrid,
} from '../components/FirstArticleMedia'

const wechatOriginal = 'https://mp.weixin.qq.com/s/t3BFROP2PcSpKNHW6vN6zA'
const enAsset = (name: string) => `/assets/first-article/en/${name}`
const audioAsset = (name: string) => `/assets/first-article/shared/${name}`

export default function AiGame24DaysEn() {
  const toc = [
    ['playable', 'Playable was just the start'],
    ['seven-demos', 'I built seven demos and cut one'],
    ['judgment', 'Then I had to decide what stayed'],
    ['voice', 'Three early voice tests'],
    ['why-write', 'Why I started writing'],
    ['release-build', 'The current release'],
  ]

  return (
    <>
      <SEOHead
        title="AI made my first game playable in a day. Shipping it took 24."
        description="I am an Android engineer. My first WeChat mini game was playable on day two, but it took 23 more days to ship."
        image="https://kevinai.top/assets/first-article/en/og-ai-game-24-days-en.png"
        type="article"
        publishedTime="2026-07-15T13:22:00.000Z"
        canonicalPath="/en/articles/ai-game-24-days"
        alternateZhPath="/notes/ai-game-24-days"
        alternateEnPath="/en/articles/ai-game-24-days"
      />

      <article className="pb-24 pt-24 md:pb-32 md:pt-32">
        <header className="mx-auto max-w-[1400px] px-4 md:px-6">
          <Link to="/en/articles" className="inline-flex text-sm text-graphite-400 transition-colors hover:text-white">
            <span className="mr-2" aria-hidden="true">←</span>All English articles
          </Link>

          <div className="mt-10 grid gap-10 border-b border-white/10 pb-12 md:pb-16 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs uppercase tracking-[0.16em] text-graphite-500">
                <span className="text-pitch-500">Independent build notes</span>
                <span>July 15, 2026</span>
                <span>9 min read</span>
              </div>
              <h1 className="max-w-5xl text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
                AI made my first game playable in a day. Shipping it took 24.
              </h1>
              <p className="mt-7 max-w-[65ch] text-lg leading-relaxed text-graphite-200 md:text-xl">
                I am an Android engineer. On June 13, I started my first serious attempt at a mini game. By the next day, the first build was playable. I assumed a few small fixes would be enough. The game actually went live on July 7.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={wechatOriginal}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-graphite-200 transition-colors hover:border-white/25 hover:text-white"
                >
                  Chinese post on WeChat
                </a>
                <Link
                  to="/notes/ai-game-24-days"
                  className="inline-flex rounded-full bg-pitch-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-pitch-500"
                >
                  Read in Chinese
                </Link>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-3 lg:col-span-4 lg:grid-cols-1 lg:justify-self-end">
              {[
                ['First playable build', '1 day'],
                ['Release', '24 days'],
                ['Current build', '500 levels'],
              ].map(([label, value]) => (
                <div key={label} className="border-t border-white/10 pt-3 lg:min-w-[15rem]">
                  <dt className="text-xs text-graphite-500">{label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</dd>
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
            <section id="playable">
              <p>I needed another 23 days between “it works” and “I can let other people play this.”</p>

              <ArticleFigure
                src={enAsset('timeline-en.png')}
                alt="Timeline from the first day of development to release"
                caption="Work started June 13. The first build was playable June 14, platform review began June 29, and the game went live July 7."
              />

              <h2>Playable was just the start</h2>
              <p>AI gave me a working demo quickly. The missing work became obvious as soon as I tried it on a real phone.</p>
              <p>On a real phone, I still had to check the touch controls, small-screen readability, competing hints, package size, privacy copy, and platform rules. Working code answered none of that.</p>

              <ArticleFigure
                src={enAsset('comparison-en.png')}
                alt="Comparison between a one-day demo and twenty-three days of release work"
                caption="The demo proved the idea. The next 23 days made it work on a real phone and pass review."
              />
            </section>

            <section id="seven-demos">
              <h2>I built seven demos and cut one</h2>
              <p>On June 15, I built seven new mechanic demos in one day. After playing them the next day, I deleted one called Moving Defense.</p>
              <p>The code worked. The mechanic did not make the game better; it made a first play session harder to understand. AI had turned the idea into a demo. I still had to decide whether the idea belonged in the game.</p>

              <ArticleFigure
                src={enAsset('seven-demos-en.png')}
                alt="Six game mechanics kept and Moving Defense removed"
                caption="Moving Defense worked. It still made the game worse."
              />

              <p>I then watched new players get stuck on the first move. My first reaction was to add arrows, pop-ups, and voice prompts. Once I added enough of them, the hints started competing with one another.</p>
              <p>I rebuilt the first ten levels so each one teaches a single idea. Route hints now wait until the player is stuck.</p>
              <p>I also reordered the full difficulty curve. Roughly every ten levels, a new rule arrives: mud, turn arrows, offside, teammates, opponents, goalkeepers, yellow cards, and portals.</p>
              <p>The current version has 500 levels. A solver checks every level for at least one valid route.</p>

              <ArticleFigure
                src={enAsset('levels-en.png')}
                alt="Five hundred levels with mechanics added along the way"
                caption="The rules stack gradually. The 500 levels are not copies of the same board."
              />
            </section>

            <section id="judgment">
              <h2>Then I had to decide what stayed</h2>
              <p>AI helped most with research and quick experiments. I could generate batches of rule ideas, code, images, and voices. Demos arrived fast.</p>
              <p>I still had to choose which mechanics to cut, which image to keep, which voice suited the character, when a feature was doing more harm than good, and how to get through review. I deleted or rebuilt more than I shipped.</p>

              <ArticleFigure
                src={enAsset('ai-judgment-en.png')}
                alt="AI output followed by human choices, real checks, and a shipped build"
                caption="AI produced plenty of options. I chose the direction, cut what did not work, tested the game, and decided when it was ready."
              />
            </section>

            <section id="voice">
              <h2>Three early voice tests</h2>
              <p>These three clips came from the same session on June 27. They use original AI-generated voices, not a clone of a real person. All three read the same line. I kept the files exactly as they were.</p>
              <p>Headphones help. Listen before reading which ones I kept.</p>

              <div className="my-8 border-y border-white/10">
                <AudioSample label="Voice test A" src={audioAsset('voice-a.mp3')} description="The same early line, unchanged" />
                <AudioSample label="Voice test B" src={audioAsset('voice-b.mp3')} description="The same early line, unchanged" />
                <AudioSample label="Voice test C" src={audioAsset('voice-c.mp3')} description="The same early line, unchanged" />
              </div>

              <p>A had the strongest personality, but it spoke slowly enough to become tiring after repeated triggers. B was short and direct, so it worked better while the match was moving. C was softer and suited a message after failure. I ended up keeping more than one.</p>
              <p>The original Chinese line called the player gege—literally “older brother,” but too familiar for this character. I removed it later and made the sideline character a coach throughout the game. Picking a voice was not enough. I also rewrote the line and changed when it played.</p>
              <p>For the final pass, I put each voice back in the game and triggered it about ten times. If it was already annoying by the tenth, it did not stay.</p>

              <blockquote className="my-10 border-l-2 border-pitch-500 pl-5 text-xl leading-relaxed text-white md:text-2xl">
                AI got me from zero to a first build quickly. Getting from “it runs” to “I can let someone else play it” still meant repeated testing and rework.
              </blockquote>
            </section>

            <section id="why-write">
              <h2>Why I started writing</h2>
              <p>I love both AAA and indie games, and I have long wanted to make a good indie game myself. One Kick is my first attempt.</p>
              <p>It was also my first time going through the whole process: idea, demo, testing, voice, assets, cloud services, platform review, and release.</p>
              <p>I decided to write the process down. It felt more useful than posting another summary of a new AI feature. I plan to write about:</p>
              <ul className="mt-5 list-disc space-y-3 pl-5 text-base leading-relaxed text-graphite-200 md:text-lg">
                <li>AI tools and workflows I have actually used</li>
                <li>How an idea moves from demo to release</li>
                <li>What these projects cost, including money I wasted</li>
                <li>Development notes from One Kick and whatever I build next</li>
              </ul>
              <p className="mt-6">These are notes from my own build, so they will not be the right answer for every project. If you have shipped a game before and spot something I got wrong, tell me.</p>
            </section>

            <section id="release-build">
              <h2>The current release</h2>
              <p>One Kick is a football route puzzle. Move the players and obstacles to clear a path from the ball to the goal. Later levels add more rules to the board.</p>
              <p>The home screen, route hints, leaderboards, animal events, and reward collection have all changed since the first demo.</p>
              <p className="article-note">The live WeChat build currently uses a Chinese interface. These are unedited screenshots from that release.</p>

              <GameScreenshotGrid english />

              <ArticleQrCta english />

              <p>If something is not fun, tell me. If a level stops you, send me the level number.</p>
            </section>
          </div>
        </div>
      </article>
    </>
  )
}
