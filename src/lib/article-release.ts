import { useEffect, useState } from 'react'

export const FIRST_ARTICLE_SLUG = 'kimi-k3-subscription-review'
export const FIRST_ARTICLE_PATH = `/notes/${FIRST_ARTICLE_SLUG}`
export const FIRST_ARTICLE_RELEASE_AT = Date.parse('2026-07-19T00:00:00Z')

function isLocalArticlePreview() {
  if (typeof window === 'undefined') return false
  const localHost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
  return localHost && new URLSearchParams(window.location.search).get('preview') === 'article'
}

export function isArticleReleased(releaseAt: number | string) {
  const timestamp = typeof releaseAt === 'number' ? releaseAt : Date.parse(releaseAt)
  return Date.now() >= timestamp || isLocalArticlePreview()
}

export function isFirstArticleReleased() {
  return isArticleReleased(FIRST_ARTICLE_RELEASE_AT)
}

export function useArticleRelease(releaseAt: number | string) {
  const timestamp = typeof releaseAt === 'number' ? releaseAt : Date.parse(releaseAt)
  const [released, setReleased] = useState(() => isArticleReleased(timestamp))

  useEffect(() => {
    if (released) return
    const wait = Math.max(0, timestamp - Date.now())
    const timer = window.setTimeout(() => setReleased(true), wait + 50)
    return () => window.clearTimeout(timer)
  }, [released, timestamp])

  return released
}

export function useFirstArticleRelease() {
  return useArticleRelease(FIRST_ARTICLE_RELEASE_AT)
}
