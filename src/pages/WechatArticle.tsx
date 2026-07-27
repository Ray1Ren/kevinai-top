import { useMemo } from 'react'
import { marked } from 'marked'
import { Link } from 'react-router-dom'
import ArticleLightbox from '../components/ArticleLightbox'
import SEOHead from '../components/SEOHead'
import { getWechatArticle, WechatArticleId } from '../data/wechatArticles'
import { useLocale } from '../hooks/useLocale'
import { useArticleRelease } from '../lib/article-release'

type Props = {
  articleId: WechatArticleId
}

type Heading = {
  id: string
  label: string
  level: 2 | 3
}

const stripInlineMarkdown = (value: string) =>
  value
    .replace(/<[^>]+>/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim()

function getHeadings(markdown: string): Heading[] {
  const headings: Heading[] = []
  for (const line of markdown.split('\n')) {
    const match = line.match(/^(##|###)\s+(.+)$/)
    if (!match) continue
    headings.push({
      id: `section-${String(headings.length + 1).padStart(2, '0')}`,
      label: stripInlineMarkdown(match[2]),
      level: match[1].length as 2 | 3,
    })
  }
  return headings
}

function renderMarkdown(markdown: string, headings: Heading[]) {
  if (/<script[\s>]/i.test(markdown)) {
    throw new Error('Article Markdown must not contain scripts')
  }

  let html = marked.parse(markdown, {
    async: false,
    gfm: true,
  }) as string

  let headingIndex = 0
  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_match, level, body) => {
    const heading = headings[headingIndex]
    headingIndex += 1
    return `<h${level} id="${heading?.id ?? `section-${headingIndex}`}">${body}</h${level}>`
  })

  html = html.replace(
    /<a href="(https?:\/\/[^"]+)">/g,
    '<a href="$1" target="_blank" rel="noreferrer">',
  )

  return html
}

export default function WechatArticle({ articleId }: Props) {
  const { isEnglish } = useLocale()
  const article = getWechatArticle(articleId)
  const locale = isEnglish ? 'en' : 'zh'
  const markdown = article.content[locale]
  const headings = useMemo(() => getHeadings(markdown), [markdown])
  const html = useMemo(() => renderMarkdown(markdown, headings), [headings, markdown])
  const released = useArticleRelease(article.publishedTime)
  const articleIndexPath = isEnglish ? '/en/articles' : '/notes'
  const alternatePath = isEnglish ? article.path.zh : article.path.en

  if (!released) {
    return (
      <section className="mx-auto max-w-3xl px-4 pb-24 pt-32 text-center md:px-6 md:pb-32 md:pt-40">
        <p className="text-xs uppercase tracking-[0.18em] text-pitch-500">
          {isEnglish ? 'Scheduled article' : '文章待发布'}
        </p>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white md:text-5xl">
          {isEnglish ? 'This article is not live yet.' : '这篇文章还没到发布时间。'}
        </h1>
        <Link
          to={articleIndexPath}
          className="mt-8 inline-flex rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-graphite-200 transition-colors hover:border-white/25 hover:text-white"
        >
          {isEnglish ? 'Back to all articles' : '返回文章列表'}
        </Link>
      </section>
    )
  }

  return (
    <>
      <SEOHead
        title={article.title[locale]}
        description={article.description[locale]}
        image={article.image[locale]}
        type="article"
        publishedTime={article.publishedTime}
        canonicalPath={article.path[locale]}
        alternateZhPath={article.path.zh}
        alternateEnPath={article.path.en}
      />

      <article className="pb-24 pt-24 md:pb-32 md:pt-32">
        <header className="mx-auto max-w-[70rem] px-4 md:px-6">
          <Link
            to={articleIndexPath}
            className="inline-flex text-sm text-graphite-400 transition-colors hover:text-white"
          >
            <span className="mr-2" aria-hidden="true">←</span>
            {isEnglish ? 'All articles' : '返回文章列表'}
          </Link>

          <div className="mt-10 grid gap-10 border-b border-white/10 pb-12 md:pb-16 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs uppercase tracking-[0.16em] text-graphite-500">
                <span className="text-pitch-500">{article.category[locale]}</span>
                <span>{article.date[locale]}</span>
                <span>{article.readingTime[locale]}</span>
              </div>
              <h1 className="max-w-5xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl md:text-6xl">
                {article.title[locale]}
              </h1>
              <p className="mt-7 max-w-[65ch] text-lg leading-relaxed text-graphite-200 md:text-xl">
                {article.description[locale]}
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to={alternatePath}
                  className="inline-flex rounded-full bg-pitch-600 px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-pitch-500"
                  lang={isEnglish ? 'zh-CN' : 'en'}
                >
                  {isEnglish ? '阅读中文版' : 'Read in English'}
                </Link>
                <Link
                  to={isEnglish ? '/en/lab' : '/lab'}
                  className="inline-flex rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-graphite-200 transition-colors hover:border-white/25 hover:text-white"
                >
                  {isEnglish ? 'Open the test lab' : '查看完整实测'}
                </Link>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-3 lg:col-span-4 lg:grid-cols-1 lg:justify-self-end">
              {article.facts.map((fact) => (
                <div key={fact.label.en} className="border-t border-white/10 pt-3 lg:min-w-[15rem]">
                  <dt className="text-xs text-graphite-500">{fact.label[locale]}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">{fact.value[locale]}</dd>
                </div>
              ))}
            </dl>
          </div>
        </header>

        <div className="mx-auto mt-10 grid max-w-[70rem] grid-cols-1 gap-12 px-4 md:mt-14 md:px-6 lg:grid-cols-[12rem_minmax(0,43rem)] lg:justify-center lg:gap-12 xl:gap-20">
          <aside className="hidden lg:block">
            <nav className="sticky top-28 border-l border-white/10 pl-5" aria-label={isEnglish ? 'Article contents' : '文章目录'}>
              <p className="mb-4 text-xs uppercase tracking-[0.18em] text-graphite-500">
                {isEnglish ? 'Contents' : '目录'}
              </p>
              <ol className="space-y-3 text-sm text-graphite-400">
                {headings.filter((heading) => heading.level === 2).map((heading, index) => (
                  <li key={heading.id}>
                    <a href={`#${heading.id}`} className="transition-colors hover:text-pitch-400">
                      <span className="mr-2 tabular-nums text-graphite-600">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      {heading.label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <ArticleLightbox className="article-body markdown-article-body min-w-0">
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </ArticleLightbox>
        </div>
      </article>
    </>
  )
}
