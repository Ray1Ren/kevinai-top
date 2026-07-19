import { useState } from 'react'
import { useLocale } from '../hooks/useLocale'

interface PlayableEntry {
  id: string
  label: string
  src: string
  score: number
}

interface PlayableComparisonProps {
  entries: PlayableEntry[]
  defaultId: string
  title: string
  description: string
}

export default function PlayableComparison({
  entries,
  defaultId,
  title,
  description,
}: PlayableComparisonProps) {
  const { isEnglish } = useLocale()
  const [selectedId, setSelectedId] = useState(defaultId)
  const [loading, setLoading] = useState(true)
  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0]

  return (
    <section className="mb-14" aria-labelledby="playable-heading">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="mb-2 block text-xs uppercase tracking-widest text-pitch-500">
            {isEnglish ? 'Play here' : '直接试玩'}
          </span>
          <h2 id="playable-heading" className="mb-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
            {title}
          </h2>
          <p className="max-w-[65ch] text-sm leading-relaxed text-graphite-300">{description}</p>
        </div>
        <a
          href={selected.src}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:border-pitch-500/60 hover:text-pitch-400 active:scale-[0.98]"
        >
          {isEnglish ? 'Open in a new window' : '新窗口打开'} <span className="ml-1" aria-hidden="true">↗</span>
        </a>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-graphite-900/35">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 p-3" role="group" aria-label={isEnglish ? 'Choose a playable build' : '选择试玩版本'}>
          {entries.map((entry) => {
            const active = entry.id === selected.id
            return (
              <button
                key={entry.id}
                type="button"
                data-playable-id={entry.id}
                onClick={() => {
                  setSelectedId(entry.id)
                  setLoading(true)
                }}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors active:scale-[0.98] ${
                  active
                    ? 'border-pitch-500 bg-pitch-600 text-paper'
                    : 'border-white/10 bg-graphite-950/50 text-graphite-300 hover:border-white/25 hover:text-white'
                }`}
              >
                <span>{entry.label}</span>
                <span className={active ? 'text-pitch-300' : 'text-graphite-500'}>{entry.score.toFixed(1)}</span>
              </button>
            )
          })}
        </div>

        <div className="relative h-[72dvh] min-h-[460px] bg-graphite-950 md:h-auto md:aspect-video md:min-h-0">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-graphite-950" role="status" aria-live="polite">
              <div className="flex items-center gap-3 text-sm text-graphite-400">
                <span className="h-2 w-2 animate-pulse-slow rounded-full bg-pitch-500" />
                {isEnglish ? 'Loading the game…' : '游戏加载中…'}
              </div>
            </div>
          )}
          <iframe
            key={selected.src}
            data-playable-frame
            src={selected.src}
            title={`${selected.label} ${isEnglish ? 'playable web game' : '在线试玩'}`}
            className="absolute inset-0 h-full w-full border-0"
            allow="autoplay; fullscreen; gamepad; pointer-lock"
            allowFullScreen
            onLoad={() => setLoading(false)}
          />
        </div>
      </div>
      <p className="mt-3 text-xs text-graphite-500">
        {isEnglish
          ? 'These are the games exactly as submitted. Keyboard, mouse, and touch support vary between them.'
          : '这里放的是三家交来的原版网页游戏，键盘、鼠标和触摸支持各不相同。'}
      </p>
    </section>
  )
}
