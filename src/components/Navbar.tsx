import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useMotion } from '../hooks/useMotion'
import { rememberLocale, useLocale } from '../hooks/useLocale'
import { useTheme } from '../hooks/useTheme'

function ThemeIcon({ theme }: { theme: 'light' | 'dark' }) {
  if (theme === 'light') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
        <circle cx="12" cy="12" r="3.5" />
        <path strokeLinecap="round" d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M5.4 5.4 4 4M20 20l-1.4-1.4M18.6 5.4 20 4M4 20l1.4-1.4" />
      </svg>
    )
  }

  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.5 8.5 0 1 0 20.2 15.2Z" />
    </svg>
  )
}

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { motionPaused, setMotionPaused } = useMotion()
  const { theme, toggleTheme } = useTheme()
  const { isEnglish, path, alternatePath } = useLocale()
  const articlesPath = isEnglish ? '/en/articles' : '/notes'
  const navItems = [
    { to: path('/'), label: isEnglish ? 'Home' : '首页' },
    { to: articlesPath, label: isEnglish ? 'Articles' : '文章' },
    { to: path('/lab'), label: isEnglish ? 'Lab' : '实验室' },
    { to: path('/links'), label: isEnglish ? 'Links' : '链接' },
  ]
  const themeActionLabel = theme === 'light'
    ? (isEnglish ? 'Switch to dark mode' : '切换到深色模式')
    : (isEnglish ? 'Switch to light mode' : '切换到浅色模式')
  const themeStatusLabel = theme === 'light'
    ? (isEnglish ? 'Light mode · switch to dark' : '当前浅色 · 切换深色')
    : (isEnglish ? 'Dark mode · switch to light' : '当前深色 · 切换浅色')

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-graphite-950/80 backdrop-blur-md">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link to={path('/')} className="flex items-center gap-3 group">
          <span className="w-2 h-2 rounded-full bg-pitch-500 group-hover:scale-125 transition-transform" />
          <span className="text-lg font-semibold tracking-tight text-white">{isEnglish ? 'Kevin AI Lab' : 'Kevin AI局'}</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6">
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
          <div className="flex items-center gap-2 border-l border-white/10 pl-5">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-graphite-300 transition-colors hover:border-pitch-500/50 hover:text-white"
              aria-label={themeActionLabel}
              aria-pressed={theme === 'dark'}
              title={themeActionLabel}
              data-theme-toggle
            >
              <ThemeIcon theme={theme} />
            </button>
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
              className="px-2 text-xs text-graphite-400 transition-colors hover:text-white"
              lang={isEnglish ? 'zh-CN' : 'en'}
              aria-label={isEnglish ? '切换到中文版' : 'Switch to English'}
            >
              {isEnglish ? '中文' : 'EN'}
            </Link>
          </div>
        </nav>

        <button
          className="lg:hidden p-2 -mr-2 text-graphite-200"
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
        <div className="lg:hidden border-t border-white/5 bg-graphite-950/95 px-4 py-4 space-y-3">
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
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-xs text-graphite-300"
            aria-label={themeActionLabel}
            aria-pressed={theme === 'dark'}
            data-theme-toggle
          >
            <ThemeIcon theme={theme} />
            <span>{themeStatusLabel}</span>
          </button>
          <button
            onClick={() => setMotionPaused(!motionPaused)}
            className="block w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs text-graphite-300"
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
