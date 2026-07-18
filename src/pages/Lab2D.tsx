import SEOHead from '../components/SEOHead'
import { useBenchmarks } from '../hooks/useBenchmarks'
import ModelResult from '../components/ModelResult'
import SpeedAuditTable from '../components/SpeedAuditTable'
import { useLocale } from '../hooks/useLocale'
import PlayableComparison from '../components/PlayableComparison'

export default function Lab2D() {
  const { data, loading, error } = useBenchmarks()
  const task = data?.tasks['2d']
  const { isEnglish } = useLocale()

  return (
    <>
      <SEOHead title={isEnglish ? '2D Web Game Evaluation' : '2D 小游戏评测'} />
      <section className="pt-24 pb-20 md:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="max-w-3xl mb-12">
            <span className="text-xs uppercase tracking-widest text-pitch-500 mb-2 block">2D · {isEnglish ? 'Sling Siege' : '弹弓攻城'}</span>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
              {isEnglish ? '2D web game evaluation' : '2D 小游戏评测'}
            </h1>
            <p className="text-graphite-200 leading-relaxed mb-6">
              {task?.conclusion ?? (isEnglish
                ? 'Codex led on stability and playability. K3 was ambitious but drifted physically. MiniMax M3 could not reliably aim at high targets.'
                : 'Codex 在稳定性与可玩性上领先；K3 完成度高但物理漂移和手机操作区仍待优化；MiniMax M3 的纵向瞄准约束导致高处目标难以命中。')}
            </p>
            <blockquote className="border-l-2 border-pitch-500 pl-4 text-graphite-300 italic">
              {task?.prompt ?? (isEnglish ? 'Build an original browser game with an immediately understandable slingshot interaction.' : '做一款让普通玩家一眼能理解拖弹弓、放手发射、撞塌建筑的原创网页小游戏。')}
            </blockquote>
          </div>

          <PlayableComparison
            title={isEnglish ? 'Play all three original 2D builds' : '三套 2D 原作直接试玩'}
            description={isEnglish ? 'Switch between the submitted builds without leaving the evaluation. Codex opens first because it led the final quality score.' : '无需离开评测页即可切换三家提交的 HTML 成品；默认打开最终质量分第一的 Codex 版本。'}
            defaultId="codex"
            entries={[
              { id: 'kimi', label: 'Kimi K3', src: '/bundles/2d/kimi/', score: 79.4 },
              { id: 'codex', label: 'Codex', src: '/bundles/2d/codex/', score: 95.0 },
              { id: 'minimax', label: 'MiniMax M3', src: '/bundles/2d/minimax-m3/', score: 68.1 },
            ]}
          />

          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-12">
              {[
                { model: 'kimi' as const, playHref: '/bundles/2d/kimi/' },
                { model: 'codex' as const, playHref: '/bundles/2d/codex/' },
                { model: 'minimax' as const, playHref: '/bundles/2d/minimax-m3/' },
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
                    <td className="px-4 py-3">Codex + gpt-5.6-sol xhigh</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">95.0</td>
                    <td className="px-4 py-3 text-right tabular-nums">14:44.97</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="px-4 py-3">Kimi Code + K3 max</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">79.4</td>
                    <td className="px-4 py-3 text-right tabular-nums">40:00.09</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">MiniMax M3</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">68.1</td>
                    <td className="px-4 py-3 text-right tabular-nums">36:56.44</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-graphite-500">{data?.metadata.scoringNote}</p>
          </div>

          <div className="rounded-2xl border border-white/5 bg-graphite-900/30 p-6 md:p-8">
            <h2 className="text-lg font-semibold text-white mb-2">{isEnglish ? 'Earlier speed-inclusive format (audit only)' : '原赛制含速度分（仅供过程审计）'}</h2>
            <p className="text-sm text-graphite-400 mb-4">{isEnglish ? 'This earlier trial converted speed into points. It is separate from the final quality score above.' : '早期试跑口径含速度项，与上方最终质量分是两套独立评分。'}</p>
            <SpeedAuditTable
              rows={isEnglish ? [
                { task: 'Speed 20', kimi: '6', codex: '16.25', minimax: '20' },
                { task: 'UI 30', kimi: '25.5', codex: '28.5', minimax: '11' },
                { task: 'Feel 30', kimi: '23', codex: '27.5', minimax: '5' },
                { task: 'Bugs 20', kimi: '15', codex: '20', minimax: '1' },
                { task: 'Total', kimi: '69.5', codex: '92.25', minimax: '37' },
              ] : [
                { task: '速度 20', kimi: '6', codex: '16.25', minimax: '20' },
                { task: 'UI 30', kimi: '25.5', codex: '28.5', minimax: '11' },
                { task: '体感 30', kimi: '23', codex: '27.5', minimax: '5' },
                { task: 'Bug 20', kimi: '15', codex: '20', minimax: '1' },
                { task: '总分', kimi: '69.5', codex: '92.25', minimax: '37' },
              ]}
            />
          </div>

          {loading && <p className="mt-8 text-graphite-400 text-sm" role="status" aria-live="polite">{isEnglish ? 'Loading evaluation results…' : '评测结果加载中…'}</p>}
          {error && <p className="mt-8 text-red-400 text-sm" role="alert">{isEnglish ? 'Unable to load data' : '数据加载失败'}：{error}</p>}
        </div>
      </section>
    </>
  )
}
