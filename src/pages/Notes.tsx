import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
import { useLocale } from '../hooks/useLocale'
import { FIRST_ARTICLE_PATH, useFirstArticleRelease } from '../lib/article-release'

export default function Notes() {
  const { isEnglish, path } = useLocale()
  const released = useFirstArticleRelease()

  return (
    <>
      <SEOHead
        title={isEnglish ? 'Notes & Updates' : '文章与动态'}
        description={
          isEnglish
            ? 'Kevin\'s build notes, AI tool tests, and independent product updates.'
            : 'Kevin 的开发日记、AI 工具实测和独立产品更新。'
        }
      />
      <section className="min-h-[75dvh] pb-24 pt-28 md:pb-32 md:pt-36">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <span className="mb-3 block text-xs uppercase tracking-widest text-pitch-500">
                {isEnglish ? 'Field Notes' : '文章 / 动态'}
              </span>
              <h1 className="mb-5 text-4xl font-semibold tracking-tight text-white md:text-6xl">
                {isEnglish ? 'Notes from the work, as it happened.' : '把做东西的过程写下来。'}
              </h1>
              <p className="max-w-[60ch] text-base leading-relaxed text-graphite-200 md:text-lg">
                {isEnglish
                  ? 'Long-form tests, build notes, mistakes, and the fixes that survived real use.'
                  : '公众号长文、开发日记和工具实测，核对好一篇，就放上来一篇。'}
              </p>
            </div>

            <div className="lg:col-span-7 lg:pt-8">
              {released ? (
                <article className="overflow-hidden rounded-2xl border border-white/10 bg-graphite-900/35">
                  <Link to={path(FIRST_ARTICLE_PATH)} className="group block">
                    <div className="relative overflow-hidden border-b border-white/10 bg-graphite-950 p-5 md:p-7">
                      <div className="absolute -right-12 -top-20 h-56 w-56 rounded-full border border-pitch-500/15 transition-transform duration-500 group-hover:scale-105" aria-hidden="true" />
                      <div className="relative grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-pitch-500">2D · 3D · WEB · VISION</p>
                          <p className="mt-3 max-w-sm text-xl font-semibold leading-snug text-white md:text-2xl">
                            {isEnglish ? 'Same tasks. Same assets. Four finished results.' : '同一套题，同一批素材，最后看成品。'}
                          </p>
                        </div>
                        <dl className="grid grid-cols-3 gap-4 text-right">
                          <div><dt className="text-[10px] text-graphite-500">GPT</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-pitch-400">92.6</dd></div>
                          <div><dt className="text-[10px] text-graphite-500">K3</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-white">89.8</dd></div>
                          <div><dt className="text-[10px] text-graphite-500">M3</dt><dd className="mt-1 text-xl font-semibold tabular-nums text-graphite-300">77.8</dd></div>
                        </dl>
                      </div>
                    </div>
                    <div className="p-5 md:p-8">
                      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs uppercase tracking-widest text-graphite-500">
                        <span className="text-pitch-500">{isEnglish ? 'AI tool test' : 'AI 工具实测'}</span>
                        <span>{isEnglish ? 'July 19, 2026' : '2026 年 7 月 19 日'}</span>
                        <span>{isEnglish ? '20 min' : '约 20 分钟'}</span>
                      </div>
                      <h2 className="text-2xl font-semibold tracking-tight text-white transition-colors group-hover:text-pitch-300 md:text-3xl">
                        {isEnglish
                          ? 'Is Kimi K3 worth paying for? Two games, one web page, and 50 images'
                          : 'Kimi K3 到底值不值得订阅？6000 字真实大评测'}
                      </h2>
                      <p className="mt-4 text-sm leading-relaxed text-graphite-300 md:text-base">
                        {isEnglish
                          ? 'The same tasks, the same assets, and two days of hands-on testing against GPT-5.6 Sol and MiniMax M3.'
                          : '同一套题、同一批素材，连续两天实测 GPT-5.6 Sol、Kimi K3 和 MiniMax M3。'}
                      </p>
                      <span className="mt-6 inline-flex text-sm font-medium text-pitch-400">
                        {isEnglish ? 'Read the full test' : '阅读全文'} <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
                      </span>
                    </div>
                  </Link>
                </article>
              ) : (
                <div className="border-y border-white/10 py-8 md:py-10" role="status" aria-live="polite">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-widest text-pitch-500">
                        {isEnglish ? 'Scheduled · July 19' : '定时发布 · 7 月 19 日'}
                      </p>
                      <h2 className="text-2xl font-semibold text-white">
                        {isEnglish ? 'The first article goes live at 08:00.' : '第一篇文章，早上 8 点见。'}
                      </h2>
                      <p className="mt-3 max-w-xl text-sm leading-relaxed text-graphite-400">
                        {isEnglish
                          ? 'The Chinese and English editions will unlock together.'
                          : '中英文版会同时开放。'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 border-t border-white/10 pt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm leading-relaxed text-graphite-500">
                      {isEnglish ? 'More posts will move here after their text, images, and figures are checked.' : '后面的公众号文章会继续搬过来，原文、图片和数字都核对后再上线。'}
                    </p>
                  </div>
                  <Link
                    to={path('/')}
                    className="inline-flex shrink-0 items-center text-sm text-pitch-500 transition-colors hover:text-pitch-400"
                  >
                    {isEnglish ? 'Return to the shipped work' : '先看已经上线的作品'} <span className="ml-1">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
