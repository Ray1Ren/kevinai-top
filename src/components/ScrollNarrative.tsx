import { useEffect, useRef, useState } from 'react'
import { useMotion } from '../hooks/useMotion'
import { useLocale } from '../hooks/useLocale'

const phaseCopy = {
  zh: [
    { title: '想法', body: 'AI 可以很快把一个念头变成能玩的 Demo，也能一次做出很多版本。' },
    { title: '实验', body: '接下来就是一遍遍试玩：留下好用的，删掉多余的，哪里不对就返工。' },
    { title: '作品', body: '等它真的有人能玩、我也愿意继续维护，才算做完。' },
  ],
  en: [
    { title: 'Idea', body: 'AI can turn a thought into a playable demo quickly, then make several more versions.' },
    { title: 'Experiment', body: 'Then I play them: keep what works, cut what does not, and redo the parts that feel wrong.' },
    { title: 'Work', body: 'It is finished when other people can use it and I am willing to keep maintaining it.' },
  ],
}

const fragmentPoints = [
  [12, 18, 4], [25, 9, 7], [39, 23, 5], [58, 12, 4], [76, 18, 6], [88, 31, 4],
  [17, 42, 5], [32, 36, 3], [49, 45, 8], [68, 39, 4], [82, 51, 6], [7, 63, 4],
  [23, 72, 6], [41, 64, 4], [57, 76, 5], [73, 68, 3], [91, 77, 7], [34, 88, 4],
  [64, 91, 5], [80, 87, 4],
] as const

export default function ScrollNarrative() {
  const sectionRef = useRef<HTMLElement>(null)
  const { reducedMotion } = useMotion()
  const { isEnglish } = useLocale()
  const phases = isEnglish ? phaseCopy.en : phaseCopy.zh
  const [staticMode, setStaticMode] = useState(() =>
    typeof window === 'undefined'
      ? true
      : window.matchMedia('(max-width: 767px), (pointer: coarse)').matches,
  )
  const prefersReduced = reducedMotion || staticMode

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px), (pointer: coarse)')
    const syncMode = () => setStaticMode(media.matches)
    syncMode()
    media.addEventListener('change', syncMode)
    return () => media.removeEventListener('change', syncMode)
  }, [])

  useEffect(() => {
    if (prefersReduced) return
    let ctx: { revert: () => void } | null = null
    let cancelled = false

    Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled) return
        gsap.registerPlugin(ScrollTrigger)
        const section = sectionRef.current
        if (!section) return

        ctx = gsap.context(() => {
          const rings = section.querySelectorAll('.narrative-ring')
          const texts = section.querySelectorAll('.narrative-text')
          const fragments = section.querySelector('.narrative-fragments')
          const core = section.querySelector('.narrative-core')
          const proof = section.querySelector('.narrative-proof')

          gsap.set(texts, { autoAlpha: 0, y: 34 })
          gsap.set(texts[0], { autoAlpha: 1, y: 0 })
          gsap.set(fragments, { autoAlpha: 1, scale: 1 })
          gsap.set(core, { autoAlpha: 0, scale: 0.76 })
          gsap.set(proof, { autoAlpha: 0, x: 90, scale: 0.94 })
          gsap.set(rings, { scale: 0.72, opacity: 0.18, rotation: -28 })

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: '+=220%',
              scrub: 1,
              pin: true,
              anticipatePin: 1,
            },
          })

          tl.to(rings, { scale: 1, opacity: 0.72, rotation: 0, stagger: 0.08, duration: 0.7 }, 0)
            .to(fragments, { autoAlpha: 0.12, scale: 0.48, duration: 0.55 }, 0.34)
            .to(core, { autoAlpha: 1, scale: 1, duration: 0.68 }, 0.36)
            .to(texts[0], { autoAlpha: 0, y: -34, duration: 0.3 }, 0.5)
            .to(texts[1], { autoAlpha: 1, y: 0, duration: 0.44 }, 0.62)
            .to(core, { autoAlpha: 0, x: -72, scale: 0.9, duration: 0.5 }, 1.22)
            .to(rings, { scale: 1.16, opacity: 0.18, duration: 0.5 }, 1.22)
            .to(proof, { autoAlpha: 1, x: 0, scale: 1, duration: 0.62 }, 1.3)
            .to(texts[1], { autoAlpha: 0, y: -34, duration: 0.3 }, 1.28)
            .to(texts[2], { autoAlpha: 1, y: 0, duration: 0.48 }, 1.42)
        }, section)
        ScrollTrigger.refresh()
      },
    )

    return () => {
      cancelled = true
      if (ctx) ctx.revert()
    }
  }, [prefersReduced])

  if (prefersReduced) {
    return (
      <section className="py-20 md:py-28 border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {phases.map((p) => (
              <div key={p.title} className="p-6 rounded-2xl border border-white/5 bg-graphite-900/30">
                <h3 className="text-xl font-semibold text-white mb-2">{p.title}</h3>
                <p className="text-graphite-300 leading-relaxed">{p.body}</p>
                {p.title === (isEnglish ? 'Work' : '作品') && (
                  <img
                    src="/assets/images/game-level-100.png"
                    alt={isEnglish ? 'A real level from One Kick' : '《一脚晋级》第 100 关真实画面'}
                    className="mt-5 w-full h-40 rounded-xl object-cover object-top"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100dvh] flex items-center overflow-hidden border-b border-white/5"
    >
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="h-48 md:h-80 relative">
          {phases.map((p, i) => (
            <div
              key={p.title}
              className="narrative-text absolute inset-0 flex flex-col justify-center"
              style={{ opacity: i === 0 ? 1 : 0 }}
            >
              <span className="text-xs uppercase tracking-widest text-pitch-500 mb-3">{isEnglish ? 'Phase' : '阶段'} 0{i + 1}</span>
              <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-white mb-4">
                {p.title}
              </h2>
              <p className="text-lg text-graphite-200 leading-relaxed max-w-md">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="hidden md:flex items-center justify-center">
          <div className="relative w-full max-w-[560px] h-[500px] overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="narrative-ring absolute rounded-full border border-pitch-500/25 will-change-transform"
                  style={{ width: 220 + i * 120, height: 220 + i * 120 }}
                />
              ))}
            </div>

            <div className="narrative-fragments absolute inset-10 will-change-transform">
              {fragmentPoints.map(([x, y, size], index) => (
                <span
                  key={index}
                  className="absolute rounded-sm bg-pitch-500/70"
                  style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
                />
              ))}
            </div>

            <div className="narrative-core absolute inset-0 flex items-center justify-center will-change-transform">
              <div className="absolute w-72 h-72 rounded-full border border-pitch-500/15" />
              <img
                src="/assets/images/kevin-avatar.png"
                alt={isEnglish ? 'Portrait of Kevin' : 'Kevin 头像'}
                className="relative w-48 h-48 rounded-full border-4 border-graphite-800 shadow-2xl object-cover"
              />
            </div>

            <div className="narrative-proof absolute inset-8 will-change-transform">
              <div className="relative h-full rounded-3xl border border-white/10 bg-graphite-900/90 overflow-hidden shadow-2xl">
                <img
                  src="/assets/images/game-level-100.png"
                  alt={isEnglish ? 'A real level from One Kick' : '《一脚晋级》第 100 关真实画面'}
                  className="absolute inset-0 w-[58%] h-full object-cover object-top"
                />
                <div className="absolute right-0 top-0 bottom-0 w-[48%] bg-graphite-900/95 p-7 flex flex-col justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-pitch-500">{isEnglish ? 'Shipped product' : '已上线'}</span>
                    <p className="mt-3 text-2xl font-semibold text-white">《一脚晋级》</p>
                    <p className="mt-2 text-sm leading-relaxed text-graphite-300">
                      {isEnglish ? 'From a one-day demo to a product shipped in twenty-four.' : '从一天能玩，到二十四天上线。'}
                    </p>
                  </div>
                  <div className="border-t border-white/10 pt-5">
                    <p className="text-xs text-graphite-500">{isEnglish ? 'Levels' : '关卡'}</p>
                    <p className="mt-1 text-4xl font-semibold text-pitch-500 tabular-nums">500</p>
                    <p className="text-xs text-graphite-400">{isEnglish ? 'Every one has a verified solution' : '每一关都验证过有解'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
