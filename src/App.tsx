import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { MotionProvider } from './context/MotionContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Lab from './pages/Lab'
import Links from './pages/Links'
import RedirectHandler from './components/RedirectHandler'
import Notes from './pages/Notes'
import { useLocale } from './hooks/useLocale'
import './index.css'

const Lab2D = lazy(() => import('./pages/Lab2D'))
const Lab3D = lazy(() => import('./pages/Lab3D'))
const LabPromo = lazy(() => import('./pages/LabPromo'))
const LabVision = lazy(() => import('./pages/LabVision'))
const LabVisionReview = lazy(() => import('./pages/LabVisionReview'))
const KimiK3Review = lazy(() => import('./pages/KimiK3Review'))

function App() {
  return (
    <MotionProvider>
      <BrowserRouter>
        <Layout>
          <RedirectHandler />
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
  return [
    <Route key={route('/')} path={route('/')} element={<Home />} />,
    <Route key={route('/notes')} path={route('/notes')} element={<Notes />} />,
    <Route key={route('/notes/kimi-k3-subscription-review')} path={route('/notes/kimi-k3-subscription-review')} element={<Suspense fallback={<PageFallback />}><KimiK3Review /></Suspense>} />,
    <Route key={route('/lab')} path={route('/lab')} element={<Lab />} />,
    <Route key={route('/lab/2d')} path={route('/lab/2d')} element={<Suspense fallback={<PageFallback />}><Lab2D /></Suspense>} />,
    <Route key={route('/lab/3d')} path={route('/lab/3d')} element={<Suspense fallback={<PageFallback />}><Lab3D /></Suspense>} />,
    <Route key={route('/lab/promo')} path={route('/lab/promo')} element={<Suspense fallback={<PageFallback />}><LabPromo /></Suspense>} />,
    <Route key={route('/lab/vision')} path={route('/lab/vision')} element={<Suspense fallback={<PageFallback />}><LabVision /></Suspense>} />,
    <Route key={route('/lab/vision/review')} path={route('/lab/vision/review')} element={<Suspense fallback={<PageFallback />}><LabVisionReview /></Suspense>} />,
    <Route key={route('/links')} path={route('/links')} element={<Links />} />,
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
