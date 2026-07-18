import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { localizePath, stripLocalePath, useLocale } from '../hooks/useLocale'

interface SEOHeadProps {
  title?: string
  description?: string
  path?: string
}

export default function SEOHead({
  title = 'Kevin AI局',
  description,
}: SEOHeadProps) {
  const { pathname } = useLocation()
  const { isEnglish } = useLocale()
  const resolvedDescription = description ?? (isEnglish
    ? 'Kevin builds independent products with AI and shares the work, mistakes, and tool tests behind them.'
    : 'Kevin 的个人主页，放独立产品、开发日记和 AI 工具实测。')
  const fullTitle = title === 'Kevin AI局' ? title : `${title} · Kevin AI局`
  const url = `https://kevinai.top${pathname === '/' ? '' : pathname}`
  const basePath = stripLocalePath(pathname)
  const zhUrl = `https://kevinai.top${basePath === '/' ? '' : localizePath(basePath, 'zh')}`
  const enUrl = `https://kevinai.top${localizePath(basePath, 'en')}`
  return (
    <Helmet>
      <html lang={isEnglish ? 'en' : 'zh-CN'} />
      <title>{fullTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content="https://kevinai.top/assets/images/kevin-avatar.png" />
      <meta property="og:locale" content={isEnglish ? 'en_US' : 'zh_CN'} />
      <link rel="canonical" href={url} />
      <link rel="alternate" hrefLang="zh-CN" href={zhUrl} />
      <link rel="alternate" hrefLang="en" href={enUrl} />
      <link rel="alternate" hrefLang="x-default" href={zhUrl} />
    </Helmet>
  )
}
