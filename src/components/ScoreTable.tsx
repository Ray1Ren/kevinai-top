import type { BenchmarkData } from '../hooks/useBenchmarks'
import { useLocale } from '../hooks/useLocale'

export default function ScoreTable({ data }: { data: BenchmarkData }) {
  const { isEnglish } = useLocale()
  const rows = data.summary.table
  const { colors } = data.summary

  return (
    <div className="overflow-x-auto rounded-xl border border-white/5 bg-graphite-900/50">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5 text-left text-graphite-400">
            <th className="px-4 py-3 font-medium">{isEnglish ? 'Task' : '任务'}</th>
            <th className="px-4 py-3 font-medium text-right" style={{ color: colors.kimi }}>
              Kimi K3
            </th>
            <th className="px-4 py-3 font-medium text-right" style={{ color: colors.codex }}>
              GPT-5.6 Sol
            </th>
            <th className="px-4 py-3 font-medium text-right" style={{ color: colors.minimax }}>
              MiniMax M3
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const isTotal = idx === rows.length - 1
            return (
              <tr
                key={row.task}
                className={`${idx !== rows.length - 1 ? 'border-b border-white/5' : ''} ${
                  isTotal ? 'bg-white/[0.03]' : ''
                }`}
              >
                <td className={`px-4 py-3 ${isTotal ? 'text-white font-medium' : 'text-graphite-200'}`}>
                  {row.task}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{row.kimi.toFixed(1)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.codex.toFixed(1)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{row.minimax.toFixed(1)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
