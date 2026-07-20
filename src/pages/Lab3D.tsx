import SEOHead from '../components/SEOHead'
import { useBenchmarks } from '../hooks/useBenchmarks'
import ModelResult from '../components/ModelResult'
import { useLocale } from '../hooks/useLocale'
import PlayableComparison from '../components/PlayableComparison'
import FullPrompt from '../components/FullPrompt'

export default function Lab3D() {
  const { data, loading, error } = useBenchmarks()
  const task = data?.tasks['3d']
  const { isEnglish, bundlePath } = useLocale()

  return (
    <>
      <SEOHead title={isEnglish ? '3D Web Game Test' : '3D 小游戏实测'} />
      <section className="pt-24 pb-20 md:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="max-w-3xl mb-12">
            <span className="text-xs uppercase tracking-widest text-pitch-500 mb-2 block">3D · {isEnglish ? 'Breach Point' : '破门点'}</span>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
              {isEnglish ? '3D web game test' : '3D 小游戏实测'}
            </h1>
            <p className="text-graphite-200 leading-relaxed mb-6">
              {task?.conclusion ?? (isEnglish ? 'K3 scored 91.0, Codex 89.2, and MiniMax M3 83.6. All three can be finished.' : 'K3 91.0 第一，Codex 89.2，MiniMax M3 83.6。三套都能玩完。')}
            </p>
            <FullPrompt
              isEnglish={isEnglish}
              promptPath="/evidence/prompts/3d.txt"
              summary={task?.prompt ?? (isEnglish ? 'Build an original 3D browser game with a complete tactical training flow.' : '做一款让普通玩家一眼能理解进入 3D 战术训练场、移动瞄准、与敌人交火、清场后拆除装置的原创网页小游戏。')}
            />
          </div>

          <PlayableComparison
            title={isEnglish ? 'Play all three submitted games' : '三套原作，切换就能玩'}
            description={isEnglish ? 'Kimi K3 opens first because it received the highest quality score.' : '默认打开得分最高的 Kimi K3，点上方按钮可切换另外两套。'}
            defaultId="kimi"
            entries={[
              { id: 'kimi', label: 'Kimi K3', src: bundlePath('/bundles/3d/kimi/'), score: 91.0 },
              { id: 'codex', label: 'Codex', src: bundlePath('/bundles/3d/codex/'), score: 89.2 },
              { id: 'minimax', label: 'MiniMax M3', src: bundlePath('/bundles/3d/minimax-m3/'), score: 83.6 },
            ]}
          />

          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-12">
              {[
                { model: 'kimi' as const, playHref: bundlePath('/bundles/3d/kimi/') },
                { model: 'codex' as const, playHref: bundlePath('/bundles/3d/codex/') },
                { model: 'minimax' as const, playHref: bundlePath('/bundles/3d/minimax-m3/') },
              ].map((item) => (
                <ModelResult
                  key={item.model}
                  data={data}
                  taskKey="3d"
                  model={item.model}
                  playHref={item.playHref}
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            {[
              { label: 'Kimi K3', gif: '/assets/gifs/3d-k3.gif' },
              { label: 'Codex', gif: '/assets/gifs/3d-codex.gif' },
              { label: 'MiniMax M3', gif: '/assets/gifs/3d-m3.gif' },
            ].map((item) => (
              <figure key={item.label} className="rounded-xl border border-white/5 bg-graphite-900/30 overflow-hidden">
                <img
                  src={item.gif}
                  alt={`${item.label} ${isEnglish ? '3D game demo' : '的 3D 游戏实机演示'}`}
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
                    <td className="px-4 py-3">Kimi Code + K3 max</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">91.0</td>
                    <td className="px-4 py-3 text-right tabular-nums">1:16:55.95</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="px-4 py-3">Codex + gpt-5.6-sol xhigh</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">89.2</td>
                    <td className="px-4 py-3 text-right tabular-nums">22:57.51</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">MiniMax M3</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">83.6</td>
                    <td className="px-4 py-3 text-right tabular-nums">44:05.49</td>
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
