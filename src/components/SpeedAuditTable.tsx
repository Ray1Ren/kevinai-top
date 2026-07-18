interface SpeedRow {
  task: string
  kimi: string
  codex: string
  minimax: string
}

import { useLocale } from '../hooks/useLocale'

export default function SpeedAuditTable({ rows }: { rows: SpeedRow[] }) {
  const { isEnglish } = useLocale()
  return (
    <div className="overflow-x-auto rounded-xl border border-white/5 bg-graphite-900/30">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5 text-left text-graphite-400">
            <th className="px-4 py-3 font-medium">{isEnglish ? 'Task' : '任务'}</th>
            <th className="px-4 py-3 font-medium text-right">Kimi K3</th>
            <th className="px-4 py-3 font-medium text-right">Codex</th>
            <th className="px-4 py-3 font-medium text-right">MiniMax M3</th>
          </tr>
        </thead>
        <tbody className="text-graphite-200">
          {rows.map((row, idx) => (
            <tr key={row.task} className={idx !== rows.length - 1 ? 'border-b border-white/5' : ''}>
              <td className="px-4 py-3">{row.task}</td>
              <td className="px-4 py-3 text-right tabular-nums">{row.kimi}</td>
              <td className="px-4 py-3 text-right tabular-nums">{row.codex}</td>
              <td className="px-4 py-3 text-right tabular-nums">{row.minimax}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
