import SEOHead from '../components/SEOHead'
import { useBenchmarks } from '../hooks/useBenchmarks'
import ModelResult from '../components/ModelResult'
import { useLocale } from '../hooks/useLocale'
import VisionReviewGrid from '../components/VisionReviewGrid'
import FullPrompt from '../components/FullPrompt'

export default function LabVision() {
  const { data, loading, error } = useBenchmarks()
  const task = data?.tasks['vision']
  const { isEnglish } = useLocale()

  return (
    <>
      <SEOHead title={isEnglish ? '50-Image Recognition Test' : '50 图识别实测'} />
      <section className="pt-24 pb-20 md:pb-28">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="max-w-3xl mb-12">
            <span className="text-xs uppercase tracking-widest text-pitch-500 mb-2 block">{isEnglish ? 'Vision · 50 images' : '视觉 · 50 张图'}</span>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-white mb-4">
              {isEnglish ? '50-image recognition test' : '50 图识别实测'}
            </h1>
            <p className="text-graphite-200 leading-relaxed mb-6">
              {task?.conclusion ?? (isEnglish ? 'Kimi scored highest on these 50 images, followed by Codex and MiniMax M3.' : '这次 50 图测试，Kimi 得分最高，Codex 和 MiniMax M3 随后。')}
            </p>
            <FullPrompt
              isEnglish={isEnglish}
              promptPath="/evidence/prompts/vision.txt"
              summary={task?.prompt ?? (isEnglish ? 'Answer using only the attached image and output exactly one line of JSON.' : '只根据随附图片回答。即使图片模糊，也请选择最符合图片的一项，只输出一行 JSON。')}
            />
          </div>

          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-12">
              {[
                { model: 'kimi' as const },
                { model: 'codex' as const },
                { model: 'minimax' as const },
              ].map((item) => (
                <ModelResult key={item.model} data={data} taskKey="vision" model={item.model} />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
            <figure className="rounded-xl border border-white/5 bg-graphite-900/30 overflow-hidden">
              <img
                src="/assets/images/image-recognition-dataset-1.jpg"
                alt={isEnglish ? 'Sample from the 50-image evaluation set, panel 1' : '50 图视觉识别数据集样例 1'}
                loading="lazy"
                className="w-full h-auto object-cover"
              />
              <figcaption className="px-4 py-3 text-xs text-graphite-400">{isEnglish ? 'Test set · page 1' : '50 道题 · 第 1 页'}</figcaption>
            </figure>
            <figure className="rounded-xl border border-white/5 bg-graphite-900/30 overflow-hidden">
              <img
                src="/assets/images/image-recognition-dataset-2.jpg"
                alt={isEnglish ? 'Sample from the 50-image evaluation set, panel 2' : '50 图视觉识别数据集样例 2'}
                loading="lazy"
                className="w-full h-auto object-cover"
              />
              <figcaption className="px-4 py-3 text-xs text-graphite-400">{isEnglish ? 'Test set · page 2' : '50 道题 · 第 2 页'}</figcaption>
            </figure>
          </div>

          <div className="rounded-2xl border border-white/5 bg-graphite-900/30 p-6 md:p-8 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">{isEnglish ? 'Scores and answers (speed listed separately)' : '得分和答题情况（速度另列）'}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-graphite-400">
                    <th className="px-4 py-3 font-medium">{isEnglish ? 'Tool' : '工具'}</th>
                    <th className="px-4 py-3 font-medium text-right">{isEnglish ? 'Accuracy' : '准确率'}</th>
                    <th className="px-4 py-3 font-medium text-right">{isEnglish ? '3-run agreement' : '三次一致'}</th>
                    <th className="px-4 py-3 font-medium text-right">{isEnglish ? 'Median / item' : '单题中位'}</th>
                    <th className="px-4 py-3 font-medium text-right">{isEnglish ? 'Score' : '总分'}</th>
                  </tr>
                </thead>
                <tbody className="text-graphite-200">
                  <tr className="border-b border-white/5">
                    <td className="px-4 py-3">Kimi Code + K3 max</td>
                    <td className="px-4 py-3 text-right tabular-nums">49/50</td>
                    <td className="px-4 py-3 text-right tabular-nums">14/15</td>
                    <td className="px-4 py-3 text-right tabular-nums">28.93 {isEnglish ? 's' : '秒'}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">96.7</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="px-4 py-3">Codex CLI + gpt-5.6-sol xhigh</td>
                    <td className="px-4 py-3 text-right tabular-nums">47/50</td>
                    <td className="px-4 py-3 text-right tabular-nums">12/15</td>
                    <td className="px-4 py-3 text-right tabular-nums">8.84 {isEnglish ? 's' : '秒'}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">90.0</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">OpenCode + MiniMax M3 thinking</td>
                    <td className="px-4 py-3 text-right tabular-nums">46/50</td>
                    <td className="px-4 py-3 text-right tabular-nums">12/15</td>
                    <td className="px-4 py-3 text-right tabular-nums">8.61 {isEnglish ? 's' : '秒'}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-white">88.0</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-graphite-500">
              {isEnglish ? 'The 100 points cover everyday images, text and documents (30), counting and spatial questions (20), charts, technical diagrams and UI (30), plus answer agreement across three runs of the 15 hard items (20). Speed is listed separately.' : '100 分里，日常图片、文字和文档占 30 分，计数和空间题占 20 分，图表、专业图和界面占 30 分；15 道难题重复三次，答案是否一致占 20 分。速度另列。'}
            </p>
          </div>

          <div className="mt-14 border-t border-white/10 pt-12">
            <VisionReviewGrid />
          </div>

          {loading && <p className="mt-8 text-graphite-400 text-sm" role="status" aria-live="polite">{isEnglish ? 'Loading evaluation results…' : '评测结果加载中…'}</p>}
          {error && <p className="mt-8 text-red-400 text-sm" role="alert">{isEnglish ? 'Unable to load data' : '数据加载失败'}：{error}</p>}
        </div>
      </section>
    </>
  )
}
