import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { detectBrowserLocale, getSavedLocale } from '../hooks/useLocale'

export default function LanguageRedirect() {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (pathname !== '/' || new URLSearchParams(search).has('redirect')) return

    const preferred = getSavedLocale() ?? detectBrowserLocale()
    if (preferred === 'en') navigate('/en', { replace: true })
  }, [navigate, pathname, search])

  return null
}
