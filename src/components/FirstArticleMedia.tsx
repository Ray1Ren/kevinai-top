import type { ReactNode } from 'react'

export const FIRST_ARTICLE_QR = '/assets/first-article/one-kick-code-ch_web_note1.png'

type FigureProps = {
  src: string
  alt: string
  caption: ReactNode
  contain?: boolean
}

export function ArticleFigure({ src, alt, caption, contain = false }: FigureProps) {
  return (
    <figure className="my-8 overflow-hidden rounded-2xl border border-white/10 bg-graphite-900/40 md:my-10">
      <div className={contain ? 'flex justify-center bg-graphite-950 p-2 md:p-4' : 'bg-graphite-950'}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`h-auto w-full ${contain ? 'max-h-[50rem] object-contain' : 'object-cover'}`}
        />
      </div>
      <figcaption className="border-t border-white/10 px-4 py-3 text-sm leading-relaxed text-graphite-400 md:px-5">
        {caption}
      </figcaption>
    </figure>
  )
}

export function AudioSample({ label, src, description }: { label: string; src: string; description: string }) {
  return (
    <div className="border-t border-white/10 py-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="!m-0 text-sm font-medium text-white">{label}</p>
          <p className="!mt-1 text-xs !leading-relaxed text-graphite-500">{description}</p>
        </div>
      </div>
      <audio controls preload="none" className="block w-full" aria-label={label}>
        <source src={src} type="audio/mpeg" />
      </audio>
    </div>
  )
}

const screenshots = [
  ['game-home.png', '新版主页：500 关主线与每日挑战', 'Home screen: 500 levels and the daily challenge'],
  ['level-100.png', '第 100 关：路线提示与新机制', 'Level 100: route hint and later-game rules'],
  ['global-rank.png', '全服排行榜', 'Global leaderboard'],
  ['rank-promotion.png', '好友榜晋级播报', 'Friend leaderboard promotion update'],
  ['animal-event.png', '球场动物事件', 'An animal event on the pitch'],
  ['reward-bank.png', '奖励库', 'Reward collection'],
] as const

export function GameScreenshotGrid({ english = false }: { english?: boolean }) {
  return (
    <div className="my-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {screenshots.map(([file, zh, en]) => (
        <figure key={file} className="overflow-hidden rounded-xl border border-white/10 bg-graphite-900/40">
          <img
            src={`/assets/first-article/shared/${file}`}
            alt={english ? en : zh}
            loading="lazy"
            decoding="async"
            className="h-auto w-full object-contain"
          />
          <figcaption className="border-t border-white/10 px-4 py-3 text-sm leading-relaxed text-graphite-400">
            {english ? en : zh}
          </figcaption>
        </figure>
      ))}
    </div>
  )
}

export function ArticleQrCta({ english = false }: { english?: boolean }) {
  return (
    <aside className="my-12 grid gap-6 border-y border-white/10 py-8 sm:grid-cols-[11rem_1fr] sm:items-center md:py-10">
      <img
        src={FIRST_ARTICLE_QR}
        alt={english ? 'One Kick WeChat mini-program code' : '《一脚晋级》微信小游戏码'}
        loading="lazy"
        decoding="async"
        data-channel="web_note1"
        className="mx-auto h-44 w-44 rounded-xl bg-white p-1 sm:mx-0"
      />
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-pitch-500">
          {english ? 'Play the release build' : '试玩正式版'}
        </p>
        <h3 className="!mb-0 !mt-3">
          {english ? 'Open this code with WeChat.' : '用微信扫一扫，直接开玩。'}
        </h3>
        <p className="!mt-4 text-sm !leading-relaxed text-graphite-300 md:text-base">
          {english
            ? 'One Kick is a WeChat mini game, so a normal phone camera will not open it. In WeChat, tap Scan and point the camera at the code.'
            : '这是《一脚晋级》的正式版小游戏码。打开微信“扫一扫”，就能直接进入游戏。'}
        </p>
      </div>
    </aside>
  )
}
