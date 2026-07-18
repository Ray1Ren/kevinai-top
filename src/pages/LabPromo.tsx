import SEOHead from '../components/SEOHead'
import { useBenchmarks } from '../hooks/useBenchmarks'
import ModelResult from '../components/ModelResult'
import { useLocale } from '../hooks/useLocale'

export default function LabPromo() {
  const { data, loading, error } = useBenchmarks()
  const task = data?.tasks['promo']
  const { isEnglish } = useLocale()

  return (
    <>
      <SEOHead title={isEnglish ? 'Promotion Page Test' : '宣传页实测'} />
      <section className="pt-24 pb-20 md:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="max-w-3xl mb-12">
            <span className="text-xs uppercase tracking-widest text-pitch-500 mb-2 block">{isEnglish ? 'Promotion page · One Kick' : '宣传页 · 一脚晋级'}</span>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
              {isEnglish ? 'Promotion page test' : '宣传页实测'}
            </h1>
            <p className="text-graphite-200 leading-relaxed mb-6">
              {task?.conclusion ?? (isEnglish ? 'Codex scored 95.0, K3 91.0, and MiniMax M3 85.0. MiniMax shipped fastest.' : 'Codex 95.0，K3 91.0，MiniMax M3 85.0。MiniMax 交付最快。')}
            </p>
            <blockquote className="border-l-2 border-pitch-500 pl-4 text-graphite-300 italic">
              {task?.prompt ?? (isEnglish ? 'Put the core One Kick interaction directly into a promotion page.' : '把《一脚晋级》的核心乐趣直接做进网页：访客进入首屏就能在一个缩小版 6×6 球场里滑动足球、判断路线、三步破门。')}
            </blockquote>
          </div>

          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-12">
              {[
                { model: 'kimi' as const, playHref: '/bundles/promo/kimi/' },
                { model: 'codex' as const, playHref: '/bundles/promo/codex/' },
                { model: 'minimax' as const, playHref: '/bundles/promo/minimax-m3/' },
              ].map((item) => (
                <ModelResult
                  key={item.model}
                  data={data}
                  taskKey="promo"
                  model={item.model}
                  playHref={item.playHref}
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {[
              { label: 'Kimi K3', gif: '/assets/gifs/promo-k3.gif' },
              { label: 'Codex', gif: '/assets/gifs/promo-codex.gif' },
              { label: 'MiniMax M3', gif: '/assets/gifs/promo-m3.gif' },
            ].map((item) => (
              <figure key={item.label} className="rounded-xl border border-white/5 bg-graphite-900/30 overflow-hidden">
                <img
                  src={item.gif}
                  alt={`${item.label} ${isEnglish ? 'promotion page scrolling demo' : '宣传页滚动动画演示'}`}
                  loading="lazy"
                  className="w-full h-auto object-cover"
                />
                <figcaption className="px-4 py-3 text-xs text-graphite-400">{item.label} {isEnglish ? 'scrolling demo' : '滚动动画演示'}</figcaption>
              </figure>
            ))}
          </div>

          <div className="rounded-2xl border border-white/5 bg-graphite-900/30 p-6 md:p-8 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">{isEnglish ? 'Quality scores (speed listed separately)' : '成品得分（速度另算）'}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-graphite-400">
                    <th className="px-4 py-3 font-medium">{isEnglish ? 'Tool' : '工具'}</th>
                    <th className="px-4 py-3 font-medium text-right">{isEnglish ? 'Quality' : '质量分'}</th>
                    <th className="px-4 py-3 font-medium text-right">{isEnglish ? 'Time' : '用时'}</th>
                  </tr>
                </thead>
                <tbody className="text-graphite-200">
                  {task && ([
                    { id: 'codex', label: 'Codex + gpt-5.6-sol' },
                    { id: 'minimax', label: 'MiniMax M3' },
                    { id: 'kimi', label: 'Kimi Code + K3' },
                  ] as const).map(({ id, label }, index) => {
                    const model = task.models[id]
                    return (
                      <tr key={id} className={index < 2 ? 'border-b border-white/5' : undefined}>
                        <td className="px-4 py-3">{label}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-white">{Number(model.score).toFixed(1)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{String(model.time)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-graphite-500">{data?.metadata.scoringNote}</p>
          </div>

          {loading && <p className="mt-8 text-graphite-400 text-sm" role="status" aria-live="polite">{isEnglish ? 'Loading evaluation results…' : '评测结果加载中…'}</p>}
          {error && <p className="mt-8 text-red-400 text-sm" role="alert">{isEnglish ? 'Unable to load data' : '数据加载失败'}：{error}</p>}
        </div>
      </section>
    </>
  )
}
