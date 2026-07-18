import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const VALID_PATHS = [
  '/',
  '/lab',
  '/lab/2d',
  '/lab/3d',
  '/lab/promo',
  '/lab/vision',
  '/lab/vision/review',
  '/links',
  '/notes',
  '/notes/kimi-k3-subscription-review',
  '/en',
  '/en/notes',
  '/en/notes/kimi-k3-subscription-review',
  '/en/lab',
  '/en/lab/2d',
  '/en/lab/3d',
  '/en/lab/promo',
  '/en/lab/vision',
  '/en/lab/vision/review',
  '/en/links',
]

export default function RedirectHandler() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const redirect = searchParams.get('redirect')
    if (!redirect) return

    const clean = redirect.replace(/^\/+/, '/').replace(/[?#].*$/, '')
    const isValid = VALID_PATHS.includes(clean) && !redirect.includes('://')
    if (isValid) {
      navigate(clean, { replace: true })
      return
    }
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams, navigate])

  return null
}
