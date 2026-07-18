import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
import { useLocale } from '../hooks/useLocale'

export default function Notes() {
  const { isEnglish, path } = useLocale()

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
                  ? 'This page will hold posts from Kevin AI局, including build notes, tool tests, mistakes, and fixes.'
                  : '这里以后放 Kevin AI局的公众号文章、开发日记和工具实测。第一批还在核对原文和配图。'}
              </p>
            </div>

            <div className="lg:col-span-7 lg:pt-8">
              <div className="border-y border-white/10 py-8 md:py-10" role="status">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-widest text-graphite-500">
                      {isEnglish ? 'Current status' : '目前进度'}
                    </p>
                    <h2 className="text-2xl font-semibold text-white">
                      {isEnglish ? 'The first batch is still being checked.' : '第一批还在整理。'}
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-graphite-400">
                      {isEnglish
                        ? 'I will add each post after checking its original text, images, and numbers.'
                        : '原文、配图和数据核对好一篇，就上线一篇。'}
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
