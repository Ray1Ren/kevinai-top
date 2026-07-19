import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { localizePath, stripLocalePath, useLocale } from '../hooks/useLocale'

interface SEOHeadProps {
  title?: string
  description?: string
  image?: string
  type?: 'website' | 'article'
  publishedTime?: string
  canonicalPath?: string
  alternateZhPath?: string
  alternateEnPath?: string
}

export default function SEOHead({
  title = 'Kevin AI局',
  description,
  image = 'https://kevinai.top/assets/images/kevin-avatar.png',
  type = 'website',
  publishedTime,
  canonicalPath,
  alternateZhPath,
  alternateEnPath,
}: SEOHeadProps) {
  const { pathname } = useLocation()
  const { isEnglish } = useLocale()
  const brand = isEnglish ? 'Kevin AI Lab' : 'Kevin AI局'
  const resolvedDescription = description ?? (isEnglish
    ? 'Kevin builds independent products with AI and shares the work, mistakes, and tool tests behind them.'
    : 'Kevin 的个人主页，放独立产品、开发日记和 AI 工具实测。')
  const resolvedTitle = title === 'Kevin AI局' ? brand : title
  const fullTitle = resolvedTitle === brand ? brand : `${resolvedTitle} · ${brand}`
  const absolute = (path: string) => path.startsWith('http') ? path : `https://kevinai.top${path === '/' ? '' : path}`
  const url = absolute(canonicalPath ?? pathname)
  const basePath = stripLocalePath(pathname)
  const zhUrl = absolute(alternateZhPath ?? localizePath(basePath, 'zh'))
  const enUrl = absolute(alternateEnPath ?? localizePath(basePath, 'en'))
  return (
    <Helmet>
      <html lang={isEnglish ? 'en' : 'zh-CN'} />
      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content={isEnglish ? 'en_US' : 'zh_CN'} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={image} />
      {publishedTime && <meta property="article:published_time" content={publishedTime} />}
      {type === 'article' && <meta property="article:author" content={brand} />}
      <link rel="canonical" href={url} />
      <link rel="alternate" hrefLang="zh-CN" href={zhUrl} />
      <link rel="alternate" hrefLang="en" href={enUrl} />
      <link rel="alternate" hrefLang="x-default" href={zhUrl} />
    </Helmet>
  )
}
