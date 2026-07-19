import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MotionProvider } from './context/MotionContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Lab from './pages/Lab'
import Links from './pages/Links'
import RedirectHandler from './components/RedirectHandler'
import LanguageRedirect from './components/LanguageRedirect'
import Notes from './pages/Notes'
import EnglishArticles from './pages/EnglishArticles'
import { useLocale } from './hooks/useLocale'
import './index.css'

const Lab2D = lazy(() => import('./pages/Lab2D'))
const Lab3D = lazy(() => import('./pages/Lab3D'))
const LabPromo = lazy(() => import('./pages/LabPromo'))
const LabVision = lazy(() => import('./pages/LabVision'))
const LabVisionReview = lazy(() => import('./pages/LabVisionReview'))
const KimiK3Review = lazy(() => import('./pages/KimiK3Review'))
const KimiK3ReviewEn = lazy(() => import('./pages/KimiK3ReviewEn'))
const AiGame24Days = lazy(() => import('./pages/AiGame24Days'))
const AiGame24DaysEn = lazy(() => import('./pages/AiGame24DaysEn'))

function App() {
  return (
    <MotionProvider>
      <BrowserRouter>
        <Layout>
          <RedirectHandler />
          <LanguageRedirect />
          <Routes>
            {renderLocalizedRoutes('')}
            {renderLocalizedRoutes('/en')}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </MotionProvider>
  )
}

function renderLocalizedRoutes(prefix: '' | '/en') {
  const route = (path: string) => (path === '/' ? (prefix || '/') : `${prefix}${path}`)
  const sharedRoutes = [
    <Route key={route('/')} path={route('/')} element={<Home />} />,
    <Route key={route('/lab')} path={route('/lab')} element={<Lab />} />,
    <Route key={route('/lab/2d')} path={route('/lab/2d')} element={<Suspense fallback={<PageFallback />}><Lab2D /></Suspense>} />,
    <Route key={route('/lab/3d')} path={route('/lab/3d')} element={<Suspense fallback={<PageFallback />}><Lab3D /></Suspense>} />,
    <Route key={route('/lab/promo')} path={route('/lab/promo')} element={<Suspense fallback={<PageFallback />}><LabPromo /></Suspense>} />,
    <Route key={route('/lab/vision')} path={route('/lab/vision')} element={<Suspense fallback={<PageFallback />}><LabVision /></Suspense>} />,
    <Route key={route('/lab/vision/review')} path={route('/lab/vision/review')} element={<Suspense fallback={<PageFallback />}><LabVisionReview /></Suspense>} />,
    <Route key={route('/links')} path={route('/links')} element={<Links />} />,
  ]

  if (prefix === '/en') {
    return [
      ...sharedRoutes,
      <Route key="/en/articles" path="/en/articles" element={<EnglishArticles />} />,
      <Route key="/en/articles/kimi-k3-review" path="/en/articles/kimi-k3-review" element={<Suspense fallback={<PageFallback />}><KimiK3ReviewEn /></Suspense>} />,
      <Route key="/en/articles/ai-game-24-days" path="/en/articles/ai-game-24-days" element={<Suspense fallback={<PageFallback />}><AiGame24DaysEn /></Suspense>} />,
      <Route key="/en/notes" path="/en/notes" element={<Navigate to="/en/articles" replace />} />,
      <Route key="/en/notes/kimi-k3-subscription-review" path="/en/notes/kimi-k3-subscription-review" element={<Navigate to="/en/articles/kimi-k3-review" replace />} />,
    ]
  }

  return [
    ...sharedRoutes,
    <Route key="/notes" path="/notes" element={<Notes />} />,
    <Route key="/notes/kimi-k3-subscription-review" path="/notes/kimi-k3-subscription-review" element={<Suspense fallback={<PageFallback />}><KimiK3Review /></Suspense>} />,
    <Route key="/notes/ai-game-24-days" path="/notes/ai-game-24-days" element={<Suspense fallback={<PageFallback />}><AiGame24Days /></Suspense>} />,
  ]
}

function PageFallback() {
  const { isEnglish } = useLocale()
  return (
    <div className="min-h-[60dvh] flex items-center justify-center">
      <div className="text-graphite-300" role="status" aria-live="polite">
        {isEnglish ? 'Loading page…' : '页面加载中…'}
      </div>
    </div>
  )
}

export default App
