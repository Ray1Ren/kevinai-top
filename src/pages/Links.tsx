import { useState } from 'react'
import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
import QrDialog from '../components/QrDialog'
import { useLocale } from '../hooks/useLocale'

export default function Links() {
  const [qrOpen, setQrOpen] = useState(false)
  const { isEnglish, path } = useLocale()
  const links = [
    { label: isEnglish ? 'Home' : '个人主页', to: path('/'), desc: 'Kevin AI局' },
    { label: isEnglish ? 'Notes & updates' : '文章与动态', to: path('/notes'), desc: isEnglish ? 'Archive in progress' : '归档整理中' },
    { label: isEnglish ? 'Evaluation lab' : '评测实验室', to: path('/lab'), desc: isEnglish ? 'Interactive outputs and public data' : '原始网页、结果与公开数据' },
    { label: 'GitHub', href: 'https://github.com/Ray1Ren', desc: '@Ray1Ren' },
  ]

  return (
    <>
      <SEOHead title={isEnglish ? 'Links' : '链接'} />
      <section className="min-h-[100dvh] pt-24 pb-12 flex flex-col items-center">
        <div className="w-full max-w-md px-6 py-8">
          <div className="flex flex-col items-center mb-10">
            <img
              src="/assets/images/kevin-avatar.png"
              alt={isEnglish ? 'Portrait of Kevin' : 'Kevin 头像'}
              className="w-24 h-24 rounded-full border-4 border-graphite-800 shadow-xl mb-4"
            />
            <h1 className="text-2xl font-semibold text-white">Kevin AI局</h1>
            <p className="text-sm text-graphite-400 mt-1">
              {isEnglish ? 'Independent products, field notes, and reproducible experiments' : '独立产品、真实记录与可复核实验'}
            </p>
          </div>

          <div className="space-y-3 mb-10">
            {links.map((item) =>
              item.to ? (
                <Link
                  key={item.label}
                  to={item.to}
                  className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-graphite-900/30 hover:border-pitch-500/30 transition-colors active:scale-[0.98]"
                >
                  <div>
                    <p className="text-white font-medium">{item.label}</p>
                    <p className="text-xs text-graphite-400 mt-0.5">{item.desc}</p>
                  </div>
                  <span className="text-pitch-500">→</span>
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-graphite-900/30 hover:border-pitch-500/30 transition-colors active:scale-[0.98]"
                >
                  <div>
                    <p className="text-white font-medium">{item.label}</p>
                    <p className="text-xs text-graphite-400 mt-0.5">{item.desc}</p>
                  </div>
                  <span className="text-pitch-500">→</span>
                </a>
              ),
            )}
          </div>

          <button
            onClick={() => setQrOpen(true)}
            className="w-full flex flex-col items-center p-6 rounded-2xl border border-white/5 bg-graphite-900/30 hover:border-pitch-500/30 transition-colors active:scale-[0.98]"
            aria-haspopup="dialog"
            aria-expanded={qrOpen}
          >
            <img
              src="/assets/images/qr-code.png"
              alt={isEnglish ? 'One Kick WeChat mini program code' : '《一脚晋级》小程序码'}
              className="w-40 h-40 rounded-lg bg-white p-1 mb-4"
            />
            <p className="text-white font-medium">{isEnglish ? 'Play One Kick in WeChat' : '扫码试玩《一脚晋级》'}</p>
            <p className="text-xs text-graphite-400 mt-1">{isEnglish ? '500 levels, each verified to have a solution' : '500 关，每一关都有可行解'}</p>
          </button>

          <p className="text-center text-xs text-graphite-600 mt-10">kevinai.top</p>
        </div>
      </section>

      <QrDialog open={qrOpen} onClose={() => setQrOpen(false)} />
    </>
  )
}
