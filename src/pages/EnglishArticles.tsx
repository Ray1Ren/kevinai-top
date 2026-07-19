import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'

const ARTICLE_PATH = '/en/articles/kimi-k3-review'
const BUILD_ARTICLE_PATH = '/en/articles/ai-game-24-days'

export default function EnglishArticles() {
  return (
    <>
      <SEOHead
        title="Articles"
        description="Kevin writes about products he ships and AI tools he tests, with the builds and numbers alongside the articles."
        canonicalPath="/en/articles"
        alternateZhPath="/notes"
        alternateEnPath="/en/articles"
      />

      <section className="min-h-[78dvh] pb-24 pt-28 md:pb-32 md:pt-36">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <header className="lg:col-span-4">
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-pitch-500">Notes from Kevin</p>
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">I write after I have something to show.</h1>
              <p className="mt-6 max-w-[48ch] text-base leading-relaxed text-graphite-300 md:text-lg">
                I write about products I have shipped and AI tools I have used. Before I publish, I check the build, screenshots, and figures again.
              </p>
            </header>

            <div className="lg:col-span-8 lg:pt-8">
              <article className="border-y border-white/10 py-7 md:py-10">
                <Link to={ARTICLE_PATH} className="group grid gap-7 md:grid-cols-[1fr_12rem] md:items-end">
                  <div>
                    <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs uppercase tracking-[0.16em] text-graphite-500">
                      <span className="text-pitch-500">Hands-on AI test</span>
                      <span>July 19, 2026</span>
                      <span>18 min</span>
                    </div>
                    <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-white transition-colors group-hover:text-pitch-300 md:text-5xl">
                      I paid $100 for Kimi K3. Then I gave it two games, a website, and 50 images.
                    </h2>
                    <p className="mt-5 max-w-[62ch] text-sm leading-relaxed text-graphite-300 md:text-base">
                      I spent two days comparing K3 with GPT-5.6 Sol and MiniMax M3. The playable builds, failures, timings, and quota records are all in the article.
                    </p>
                    <span className="mt-6 inline-flex text-sm font-medium text-pitch-400">
                      Read the full review <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                    </span>
                  </div>

                  <dl className="grid grid-cols-3 gap-3 md:grid-cols-1">
                    <div className="border-t border-white/10 pt-3">
                      <dt className="text-[10px] uppercase tracking-widest text-graphite-500">GPT-5.6 Sol</dt>
                      <dd className="mt-1 text-2xl font-semibold tabular-nums text-pitch-400">92.6</dd>
                    </div>
                    <div className="border-t border-white/10 pt-3">
                      <dt className="text-[10px] uppercase tracking-widest text-graphite-500">Kimi K3</dt>
                      <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">89.8</dd>
                    </div>
                    <div className="border-t border-white/10 pt-3">
                      <dt className="text-[10px] uppercase tracking-widest text-graphite-500">MiniMax M3</dt>
                      <dd className="mt-1 text-2xl font-semibold tabular-nums text-graphite-300">77.8</dd>
                    </div>
                  </dl>
                </Link>
              </article>

              <article className="border-b border-white/10 py-7 md:py-10">
                <Link to={BUILD_ARTICLE_PATH} className="group grid gap-7 md:grid-cols-[1fr_12rem] md:items-end">
                  <div>
                    <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs uppercase tracking-[0.16em] text-graphite-500">
                      <span className="text-pitch-500">Independent build notes</span>
                      <span>July 15, 2026</span>
                      <span>9 min</span>
                    </div>
                    <h2 className="max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-white transition-colors group-hover:text-pitch-300 md:text-5xl">
                      AI made my first game playable in a day. Shipping it took 24.
                    </h2>
                    <p className="mt-5 max-w-[62ch] text-sm leading-relaxed text-graphite-300 md:text-base">
                      The first build worked on day two. The real work was onboarding, difficulty, voice, small screens, package size, privacy, and review.
                    </p>
                    <span className="mt-6 inline-flex text-sm font-medium text-pitch-400">
                      Read the build story <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                    </span>
                  </div>

                  <dl className="grid grid-cols-3 gap-3 md:grid-cols-1">
                    <div className="border-t border-white/10 pt-3"><dt className="text-[10px] uppercase tracking-widest text-graphite-500">Playable</dt><dd className="mt-1 text-2xl font-semibold text-white">1 day</dd></div>
                    <div className="border-t border-white/10 pt-3"><dt className="text-[10px] uppercase tracking-widest text-graphite-500">Released</dt><dd className="mt-1 text-2xl font-semibold text-pitch-400">24 days</dd></div>
                    <div className="border-t border-white/10 pt-3"><dt className="text-[10px] uppercase tracking-widest text-graphite-500">Current</dt><dd className="mt-1 text-2xl font-semibold text-white">500 levels</dd></div>
                  </dl>
                </Link>
              </article>

              <p className="mt-8 max-w-[60ch] text-sm leading-relaxed text-graphite-500">
                I am translating the rest one by one. I check the copy, screenshots, and figures before each one goes live.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
