import { Link } from 'react-router-dom'
import { useLocale } from '../hooks/useLocale'

export default function Footer() {
  const { isEnglish, path } = useLocale()
  return (
    <footer className="border-t border-white/5 bg-graphite-950">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-white font-medium">Kevin AI局</p>
            <p className="text-sm text-graphite-400 mt-1">
              {isEnglish ? 'Ideas, experiments, and work that actually shipped.' : '记录想法、实验，以及真正上线的作品。'}
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-graphite-300">
            <Link to={path('/')} className="hover:text-white transition-colors">{isEnglish ? 'Home' : '首页'}</Link>
            <Link to={path('/notes')} className="hover:text-white transition-colors">{isEnglish ? 'Notes' : '文章'}</Link>
            <Link to={path('/lab')} className="hover:text-white transition-colors">{isEnglish ? 'Lab' : '评测实验室'}</Link>
            <Link to={path('/links')} className="hover:text-white transition-colors">{isEnglish ? 'Links' : '链接'}</Link>
            <a
              href="https://github.com/Ray1Ren"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>

          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-white/5 text-xs text-graphite-500 flex flex-col sm:flex-row sm:justify-between gap-2">
          <span>© {new Date().getFullYear()} Kevin AI局. {isEnglish ? 'All rights reserved.' : '保留所有权利。'}</span>
          <span>{isEnglish ? 'Domain' : '域名'}：kevinai.top</span>
        </div>
      </div>
    </footer>
  )
}
