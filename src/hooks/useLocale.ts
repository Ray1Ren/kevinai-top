import { useLocation } from 'react-router-dom'

export type Locale = 'zh' | 'en'

export const LOCALE_STORAGE_KEY = 'kevinai.locale'

export function rememberLocale(locale: Locale) {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Private browsing and locked-down storage should not block navigation.
  }
}

export function getSavedLocale(): Locale | null {
  try {
    const value = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    return value === 'zh' || value === 'en' ? value : null
  } catch {
    return null
  }
}

export function detectBrowserLocale(): Locale {
  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  const primaryLanguage = languages.find(Boolean) ?? ''
  return /^zh(?:-|$)/i.test(primaryLanguage) ? 'zh' : 'en'
}

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
    bundlePath: (target: string) => (locale === 'en' ? `${target}${target.includes('?') ? '&' : '?'}lang=en` : target),
    alternatePath: getAlternatePath(pathname, locale),
  }
}

function getAlternatePath(pathname: string, locale: Locale) {
  const pairedPaths: Record<string, string> = {
    '/notes': '/en/articles',
    '/en/articles': '/notes',
    '/notes/kimi-k3-subscription-review': '/en/articles/kimi-k3-review',
    '/en/articles/kimi-k3-review': '/notes/kimi-k3-subscription-review',
    '/notes/ai-game-24-days': '/en/articles/ai-game-24-days',
    '/en/articles/ai-game-24-days': '/notes/ai-game-24-days',
    '/en/notes': '/notes',
    '/en/notes/kimi-k3-subscription-review': '/notes/kimi-k3-subscription-review',
  }
  return pairedPaths[pathname] ?? localizePath(stripLocalePath(pathname), locale === 'en' ? 'zh' : 'en')
}
