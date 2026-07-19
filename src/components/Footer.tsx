import { Link } from 'react-router-dom'
import { useLocale } from '../hooks/useLocale'

export default function Footer() {
  const { isEnglish, path } = useLocale()
  const articlesPath = isEnglish ? '/en/articles' : '/notes'
  return (
    <footer className="border-t border-white/5 bg-graphite-950">
      <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-white font-medium">{isEnglish ? 'Kevin AI Lab' : 'Kevin AI局'}</p>
            <p className="text-sm text-graphite-400 mt-1">
              {isEnglish ? 'I build products and write down how they were made.' : '做产品，也记录怎么做的。'}
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-graphite-300">
            <Link to={path('/')} className="hover:text-white transition-colors">{isEnglish ? 'Home' : '首页'}</Link>
            <Link to={articlesPath} className="hover:text-white transition-colors">{isEnglish ? 'Articles' : '文章'}</Link>
            <Link to={path('/lab')} className="hover:text-white transition-colors">{isEnglish ? 'Tests' : '实测'}</Link>
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
          <span>© {new Date().getFullYear()} {isEnglish ? 'Kevin AI Lab. All rights reserved.' : 'Kevin AI局. 保留所有权利。'}</span>
          <span>{isEnglish ? 'Domain' : '域名'}：kevinai.top</span>
        </div>
      </div>
    </footer>
  )
}
