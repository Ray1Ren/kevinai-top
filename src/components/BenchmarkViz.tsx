import type { BenchmarkData } from '../hooks/useBenchmarks'
import { useLocale } from '../hooks/useLocale'

export default function BenchmarkViz({ data }: { data: BenchmarkData }) {
  const { isEnglish } = useLocale()
  const tasks = data.summary.table.slice(0, -1)
  const { colors } = data.summary
  const max = 100
  const barHeight = 8
  const gap = 12
  const taskGap = 40
  const width = 640
  const height = tasks.length * (barHeight * 3 + gap + taskGap) + 40

  return (
    <div className="rounded-xl border border-white/5 bg-graphite-900/50 p-4 md:p-6">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={isEnglish ? 'Quality score comparison across four tasks' : '四项任务质量分对比'}>
        <text x={width - 10} y={24} textAnchor="end" fill="#6d6d6a" fontSize="12">
          {isEnglish ? 'Score / 100' : '分数 / 100'}
        </text>
        {tasks.map((task, i) => {
          const yBase = 50 + i * (barHeight * 3 + gap + taskGap)
          return (
            <g key={task.task}>
              <text x={0} y={yBase - 12} fill="#e7e7e6" fontSize="13" fontWeight="500">
                {task.task}
              </text>
              {[
                { key: 'kimi', label: 'Kimi', score: task.kimi, color: colors.kimi },
                { key: 'codex', label: 'Codex', score: task.codex, color: colors.codex },
                { key: 'minimax', label: 'MiniMax', score: task.minimax, color: colors.minimax },
              ].map((m, j) => {
                const barWidth = (m.score / max) * (width - 80)
                const y = yBase + j * (barHeight + 4)
                return (
                  <g key={m.key}>
                    <text x={0} y={y + barHeight - 1} fill="#888885" fontSize="10">
                      {m.label}
                    </text>
                    <rect
                      x={70}
                      y={y - 2}
                      width={barWidth}
                      height={barHeight}
                      rx={barHeight / 2}
                      fill={m.color}
                      opacity={0.85}
                    />
                    <text x={70 + barWidth + 8} y={y + barHeight - 1} fill="#e7e7e6" fontSize="10">
                      {m.score.toFixed(1)}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
      <p className="mt-3 text-xs text-graphite-400">{data.metadata.scoringNote}</p>
    </div>
  )
}
