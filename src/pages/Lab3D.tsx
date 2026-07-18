import SEOHead from '../components/SEOHead'
import { useBenchmarks } from '../hooks/useBenchmarks'
import ModelResult from '../components/ModelResult'
import SpeedAuditTable from '../components/SpeedAuditTable'
import { useLocale } from '../hooks/useLocale'
import PlayableComparison from '../components/PlayableComparison'

export default function Lab3D() {
  const { data, loading, error } = useBenchmarks()
  const task = data?.tasks['3d']
  const { isEnglish } = useLocale()

  return (
    <>
      <SEOHead title={isEnglish ? '3D Web Game Evaluation' : '3D 小游戏评测'} />
      <section className="pt-24 pb-20 md:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="max-w-3xl mb-12">
            <span className="text-xs uppercase tracking-widest text-pitch-500 mb-2 block">3D · {isEnglish ? 'Breach Point' : '破门点'}</span>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
              {isEnglish ? '3D web game evaluation' : '3D 小游戏评测'}
            </h1>
            <p className="text-graphite-200 leading-relaxed mb-4">
              {task?.conclusion ?? (isEnglish ? 'K3 led on quality alone, while Codex led under the earlier speed-inclusive format.' : '纯质量分 K3 88.8 第一；若按原赛制含速度分，则 Codex 第一。MiniMax M3 最终版也通过了全部 19 项 QA。')}
            </p>
            {task?.speedNote && <p className="text-sm text-graphite-400 mb-6">{task.speedNote}</p>}
            <blockquote className="border-l-2 border-pitch-500 pl-4 text-graphite-300 italic">
              {task?.prompt ?? (isEnglish ? 'Build an original 3D browser game with a complete tactical training flow.' : '做一款让普通玩家一眼能理解进入 3D 战术训练场、移动瞄准、与敌人交火、清场后拆除装置的原创网页小游戏。')}
            </blockquote>
          </div>

          <PlayableComparison
            title={isEnglish ? 'Play all three original 3D builds' : '三套 3D 原作直接试玩'}
            description={isEnglish ? 'Switch between the submitted builds directly. Kimi K3 opens first because it led the final quality score.' : '三家提交的 HTML 3D 游戏都已部署在这里，可直接切换试玩；默认打开最终质量分第一的 Kimi K3 版本。'}
            defaultId="kimi"
            entries={[
              { id: 'kimi', label: 'Kimi K3', src: '/bundles/3d/kimi/', score: 88.8 },
              { id: 'codex', label: 'Codex', src: '/bundles/3d/codex/', score: 86.5 },
              { id: 'minimax', label: 'MiniMax M3', src: '/bundles/3d/minimax-m3/', score: 79.5 },
            ]}
          />

          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-12">
              {[
                { model: 'kimi' as const, playHref: '/bundles/3d/kimi/' },
                { model: 'codex' as const, playHref: '/bundles/3d/codex/' },
                { model: 'minimax' as const, playHref: '/bundles/3d/minimax-m3/' },
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
            <h2 className="text-lg font-semibold text-white mb-4">{isEnglish ? 'Final quality score (speed excluded)' : '最终质量分（速度不计入）'}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-graphite-400">
                    <th className="px-4 py-3 font-medium">{isEnglish ? 'Tool chain' : '组合'}</th>
                    <th className="px-4 py-3 font-medium text-right">{isEnglish ? 'Quality' : '质量分'}</th>
                    <th className="px-4 py-3 font-medium text-right">{isEnglish ? 'Time' : '独立用时'}</th>
                  </tr>
                </thead>
                <tbody className="text-graphite-200">
                  <tr className="border-b border-white/5">
                    <td className="px-4 py-3">Kimi Code + K3 max</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">88.8</td>
                    <td className="px-4 py-3 text-right tabular-nums">1:16:55.95</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="px-4 py-3">Codex + gpt-5.6-sol xhigh</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">86.5</td>
                    <td className="px-4 py-3 text-right tabular-nums">22:57.51</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">MiniMax M3</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">79.5</td>
                    <td className="px-4 py-3 text-right tabular-nums">44:05.49</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-graphite-500">{data?.metadata.scoringNote}</p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-graphite-900/30 p-6 md:p-8">
            <h2 className="text-lg font-semibold text-white mb-2">{isEnglish ? 'Earlier speed-inclusive format (audit only)' : '原赛制含速度分（仅供过程审计）'}</h2>
            <p className="text-sm text-graphite-400 mb-4">{isEnglish ? 'Codex moves into first when speed becomes points. This is retained only for audit and remains separate from final quality.' : '含速度后 Codex 总分反超；此处仅保留作审计参考，不与上方最终质量分混淆。'}</p>
            <SpeedAuditTable
              rows={(isEnglish ? [
                { task: 'Speed 20', kimi: '6', codex: '20', minimax: '13.31' },
                { task: '3D / UI 30', kimi: '25', codex: '23.7', minimax: '10.5' },
                { task: 'Feel 30', kimi: '26', codex: '25.5', minimax: '6' },
                { task: 'Bugs 20', kimi: '20', codex: '20', minimax: '0' },
                { task: 'Total', kimi: '77', codex: '89.20', minimax: '29.81' },
              ] : [
                { task: '速度 20', kimi: '6', codex: '20', minimax: '13.31' },
                { task: '3D/UI 30', kimi: '25', codex: '23.7', minimax: '10.5' },
                { task: '体感 30', kimi: '26', codex: '25.5', minimax: '6' },
                { task: 'Bug 20', kimi: '20', codex: '20', minimax: '0' },
                { task: '总分', kimi: '77', codex: '89.20', minimax: '29.81' },
              ])}
            />
          </div>

          {loading && <p className="mt-8 text-graphite-400 text-sm" role="status" aria-live="polite">{isEnglish ? 'Loading evaluation results…' : '评测结果加载中…'}</p>}
          {error && <p className="mt-8 text-red-400 text-sm" role="alert">{isEnglish ? 'Unable to load data' : '数据加载失败'}：{error}</p>}
        </div>
      </section>
    </>
  )
}
