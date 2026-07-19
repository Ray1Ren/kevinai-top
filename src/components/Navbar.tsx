import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMotion } from '../hooks/useMotion'
import { rememberLocale, useLocale } from '../hooks/useLocale'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { motionPaused, setMotionPaused } = useMotion()
  const { isEnglish, path, alternatePath } = useLocale()
  const articlesPath = isEnglish ? '/en/articles' : '/notes'
  const navItems = [
    { to: path('/'), label: isEnglish ? 'Home' : '首页' },
    { to: articlesPath, label: isEnglish ? 'Articles' : '文章' },
    { to: path('/lab'), label: isEnglish ? 'Lab' : '实验室' },
    { to: path('/links'), label: isEnglish ? 'Links' : '链接' },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-graphite-950/80 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link to={path('/')} className="flex items-center gap-3 group">
          <span className="w-2 h-2 rounded-full bg-pitch-500 group-hover:scale-125 transition-transform" />
          <span className="text-lg font-semibold tracking-tight text-white">{isEnglish ? 'Kevin AI Observatory' : 'Kevin AI局'}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-sm transition-colors ${
                pathname === item.to ? 'text-white' : 'text-graphite-300 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => setMotionPaused(!motionPaused)}
            className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-graphite-300 hover:text-white hover:border-pitch-500/50 transition-colors"
            aria-pressed={motionPaused}
          >
            {motionPaused
              ? (isEnglish ? 'Resume motion' : '开启动效')
              : (isEnglish ? 'Pause motion' : '暂停动效')}
          </button>
          <Link
            to={alternatePath}
            onClick={() => rememberLocale(isEnglish ? 'zh' : 'en')}
            className="text-xs text-graphite-400 transition-colors hover:text-white"
            lang={isEnglish ? 'zh-CN' : 'en'}
            aria-label={isEnglish ? '切换到中文版' : 'Switch to English'}
          >
            {isEnglish ? '中文' : 'EN'}
          </Link>
        </nav>

        <button
          className="md:hidden p-2 -mr-2 text-graphite-200"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={isEnglish ? 'Menu' : '菜单'}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/5 bg-graphite-950/95 px-4 py-4 space-y-3">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={`block text-sm ${pathname === item.to ? 'text-white' : 'text-graphite-300'}`}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => setMotionPaused(!motionPaused)}
            className="block text-xs px-3 py-1.5 rounded-full border border-white/10 text-graphite-300"
            aria-pressed={motionPaused}
          >
            {motionPaused
              ? (isEnglish ? 'Resume motion' : '开启动效')
              : (isEnglish ? 'Pause motion' : '暂停动效')}
          </button>
          <Link
            to={alternatePath}
            onClick={() => {
              rememberLocale(isEnglish ? 'zh' : 'en')
              setOpen(false)
            }}
            className="block text-sm text-graphite-300"
            lang={isEnglish ? 'zh-CN' : 'en'}
          >
            {isEnglish ? '切换到中文版' : 'Switch to English'}
          </Link>
        </div>
      )}
    </header>
  )
}
