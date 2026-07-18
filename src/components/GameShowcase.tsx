import { useEffect, useState } from 'react'
import { useLocale } from '../hooks/useLocale'

const shotsZh = [
  { src: '/assets/images/game-home.png', alt: '《一脚晋级》新版主页：500 关主线与每日挑战', label: '新版主页' },
  { src: '/assets/images/game-level-100.png', alt: '第 100 关：路线提示与新机制', label: '第 100 关' },
  { src: '/assets/images/game-rank.png', alt: '全服排行榜', label: '全服排行榜' },
  { src: '/assets/images/game-promotion.png', alt: '好友榜晋级播报', label: '晋级播报' },
  { src: '/assets/images/game-animal-event.png', alt: '球场动物事件', label: '动物事件' },
  { src: '/assets/images/game-reward-bank.png', alt: '奖励库', label: '奖励库' },
]

const shotsEn = [
  { src: '/assets/images/game-home.png', alt: 'One Kick home screen with the 500-level campaign and daily challenge', label: 'Home' },
  { src: '/assets/images/game-level-100.png', alt: 'Level 100 with a route hint and advanced mechanics', label: 'Level 100' },
  { src: '/assets/images/game-rank.png', alt: 'Global player leaderboard', label: 'Leaderboard' },
  { src: '/assets/images/game-promotion.png', alt: 'Friend promotion update', label: 'Promotion feed' },
  { src: '/assets/images/game-animal-event.png', alt: 'An animal event on the football field', label: 'Field event' },
  { src: '/assets/images/game-reward-bank.png', alt: 'Reward bank', label: 'Rewards' },
]

export default function GameShowcase() {
  const [lightbox, setLightbox] = useState<string | null>(null)
  const { isEnglish } = useLocale()
  const shots = isEnglish ? shotsEn : shotsZh

  useEffect(() => {
    if (!lightbox) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [lightbox])

  return (
    <>
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-6 md:overflow-visible md:pb-0">
          {shots.map((shot, i) => (
            <button
              key={shot.src}
              onClick={() => setLightbox(shot.src)}
              aria-label={`${isEnglish ? 'Open image' : '放大查看'}：${shot.label}`}
              className="group relative flex-shrink-0 w-[82vw] max-w-[340px] aspect-[390/844] md:w-auto md:max-w-none snap-center md:snap-start text-left rounded-[1.4rem] border border-white/10 bg-graphite-900/30 overflow-hidden transition-colors hover:border-pitch-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-pitch-500"
            >
              <img
                src={shot.src}
                alt={shot.alt}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.015]"
              />
              <div className="absolute left-3 top-3 w-8 h-8 rounded-full border border-white/15 bg-graphite-950/80 backdrop-blur flex items-center justify-center text-[10px] tabular-nums text-white">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="absolute left-3 right-3 bottom-3 px-3 py-2.5 rounded-xl border border-white/10 bg-graphite-950/85 backdrop-blur flex items-center justify-between">
                <span className="text-xs text-graphite-200">{shot.label}</span>
                <span className="text-xs text-pitch-500">{isEnglish ? 'Open' : '放大'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={isEnglish ? 'Expanded game screenshot' : '游戏截图放大预览'}
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 w-10 h-10 rounded-full border border-white/15 bg-graphite-900/90 text-white"
            aria-label={isEnglish ? 'Close preview' : '关闭预览'}
          >
            ×
          </button>
          <img
            src={lightbox}
            alt={isEnglish ? 'Expanded game screenshot' : '放大查看游戏截图'}
            className="max-w-full max-h-[90dvh] rounded-lg object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
