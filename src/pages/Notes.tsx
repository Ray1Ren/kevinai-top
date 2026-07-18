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
            ? 'Field notes from Kevin on shipping AI-assisted products, independent game development, and practical tool use.'
            : 'Kevin 关于 AI 协作开发、独立产品和真实工具使用过程的文章与动态。'
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
                {isEnglish ? 'Work in public, without pretending it was easy.' : '把真实过程，慢慢写下来。'}
              </h1>
              <p className="max-w-[60ch] text-base leading-relaxed text-graphite-200 md:text-lg">
                {isEnglish
                  ? 'This will become the permanent home for posts first shared through Kevin AI局: project journals, tool evaluations, mistakes, and lessons learned.'
                  : '这里会逐步同步 Kevin AI局发布过的内容：项目开发日记、工具实测、踩过的坑，以及真正留下来的方法。'}
              </p>
            </div>

            <div className="lg:col-span-7 lg:pt-8">
              <div className="border-y border-white/10 py-8 md:py-10" role="status">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-widest text-graphite-500">
                      {isEnglish ? 'Archive status' : '归档状态'}
                    </p>
                    <h2 className="text-2xl font-semibold text-white">
                      {isEnglish ? 'The first batch is being prepared.' : '首批内容正在整理。'}
                    </h2>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-graphite-400">
                      {isEnglish
                        ? 'No placeholder articles and no invented publication dates. Posts will appear here only after the original copy and media have been checked.'
                        : '这里不放占位文章，也不编造发布日期。等原文、配图和数据口径核对完成后，再逐篇上线。'}
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
