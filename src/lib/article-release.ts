import { useEffect, useState } from 'react'

export const FIRST_ARTICLE_SLUG = 'kimi-k3-subscription-review'
export const FIRST_ARTICLE_PATH = `/notes/${FIRST_ARTICLE_SLUG}`
export const FIRST_ARTICLE_RELEASE_AT = Date.parse('2026-07-19T00:00:00Z')

function isLocalArticlePreview() {
  if (typeof window === 'undefined') return false
  const localHost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost'
  return localHost && new URLSearchParams(window.location.search).get('preview') === 'article'
}

export function isFirstArticleReleased() {
  return Date.now() >= FIRST_ARTICLE_RELEASE_AT || isLocalArticlePreview()
}

export function useFirstArticleRelease() {
  const [released, setReleased] = useState(isFirstArticleReleased)

  useEffect(() => {
    if (released) return
    const wait = Math.max(0, FIRST_ARTICLE_RELEASE_AT - Date.now())
    const timer = window.setTimeout(() => setReleased(true), wait + 50)
    return () => window.clearTimeout(timer)
  }, [released])

  return released
}
