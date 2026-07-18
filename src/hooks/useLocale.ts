import { useLocation } from 'react-router-dom'

export type Locale = 'zh' | 'en'

export function stripLocalePath(pathname: string) {
  if (pathname === '/en') return '/'
  if (pathname.startsWith('/en/')) return pathname.slice(3) || '/'
  return pathname || '/'
}

export function localizePath(path: string, locale: Locale) {
  const normalized = path === '' ? '/' : path
  if (locale === 'zh') return normalized
  return normalized === '/' ? '/en' : `/en${normalized}`
}

export function useLocale() {
  const { pathname } = useLocation()
  const locale: Locale = pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'zh'
  const basePath = stripLocalePath(pathname)

  return {
    locale,
    isEnglish: locale === 'en',
    basePath,
    path: (target: string) => localizePath(target, locale),
    alternatePath: localizePath(basePath, locale === 'en' ? 'zh' : 'en'),
  }
}
