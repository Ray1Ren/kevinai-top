import SEOHead from '../components/SEOHead'
import { useBenchmarks } from '../hooks/useBenchmarks'
import ModelResult from '../components/ModelResult'
import { useLocale } from '../hooks/useLocale'
import PlayableComparison from '../components/PlayableComparison'

export default function Lab2D() {
  const { data, loading, error } = useBenchmarks()
  const task = data?.tasks['2d']
  const { isEnglish, bundlePath } = useLocale()

  return (
    <>
      <SEOHead title={isEnglish ? '2D Web Game Test' : '2D 小游戏实测'} />
      <section className="pt-24 pb-20 md:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="max-w-3xl mb-12">
            <span className="text-xs uppercase tracking-widest text-pitch-500 mb-2 block">2D · {isEnglish ? 'Sling Siege' : '弹弓攻城'}</span>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
              {isEnglish ? '2D web game test' : '2D 小游戏实测'}
            </h1>
            <p className="text-graphite-200 leading-relaxed mb-6">
              {task?.conclusion ?? (isEnglish
                ? 'Codex scored 96.0 and felt the most reliable. K3 scored 80.5 with drifting later levels. MiniMax M3 scored 54.5 and could not clear level one through normal play.'
                : 'Codex 96.0，操作最稳。K3 80.5，第二、三关会自己漂；MiniMax M3 54.5，正常操作过不了第一关。')}
            </p>
            <blockquote className="border-l-2 border-pitch-500 pl-4 text-graphite-300 italic">
              {task?.prompt ?? (isEnglish ? 'Build an original browser game with an immediately understandable slingshot interaction.' : '做一款让普通玩家一眼能理解拖弹弓、放手发射、撞塌建筑的原创网页小游戏。')}
            </blockquote>
          </div>

          <PlayableComparison
            title={isEnglish ? 'Play all three submitted games' : '三套原作，切换就能玩'}
            description={isEnglish ? 'Codex opens first because it received the highest quality score.' : '默认打开得分最高的 Codex，点上方按钮可切换另外两套。'}
            defaultId="codex"
            entries={[
              { id: 'kimi', label: 'Kimi K3', src: bundlePath('/bundles/2d/kimi/'), score: 80.5 },
              { id: 'codex', label: 'Codex', src: bundlePath('/bundles/2d/codex/'), score: 96.0 },
              { id: 'minimax', label: 'MiniMax M3', src: bundlePath('/bundles/2d/minimax-m3/'), score: 54.5 },
            ]}
          />

          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-12">
              {[
                { model: 'kimi' as const, playHref: bundlePath('/bundles/2d/kimi/') },
                { model: 'codex' as const, playHref: bundlePath('/bundles/2d/codex/') },
                { model: 'minimax' as const, playHref: bundlePath('/bundles/2d/minimax-m3/') },
              ].map((item) => (
                <ModelResult
                  key={item.model}
                  data={data}
                  taskKey="2d"
                  model={item.model}
                  playHref={item.playHref}
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {[
              { label: 'Kimi K3', gif: '/assets/gifs/2d-k3.gif' },
              { label: 'Codex', gif: '/assets/gifs/2d-codex.gif' },
              { label: 'MiniMax M3', gif: '/assets/gifs/2d-m3.gif' },
            ].map((item) => (
              <figure key={item.label} className="rounded-xl border border-white/5 bg-graphite-900/30 overflow-hidden">
                <img
                  src={item.gif}
                  alt={`${item.label} ${isEnglish ? '2D game demo' : '的 2D 小游戏实机演示'}`}
                  loading="lazy"
                  className="w-full h-auto object-cover"
                />
                <figcaption className="px-4 py-3 text-xs text-graphite-400">{item.label}</figcaption>
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
                  <tr className="border-b border-white/5">
                    <td className="px-4 py-3">Codex + gpt-5.6-sol xhigh</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">96.0</td>
                    <td className="px-4 py-3 text-right tabular-nums">14:44.97</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="px-4 py-3">Kimi Code + K3 max</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">80.5</td>
                    <td className="px-4 py-3 text-right tabular-nums">40:00.09</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">MiniMax M3</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">54.5</td>
                    <td className="px-4 py-3 text-right tabular-nums">36:56.44</td>
                  </tr>
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
