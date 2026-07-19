import { Link } from 'react-router-dom'
import SEOHead from '../components/SEOHead'
import {
  ArticleFigure,
  ArticleQrCta,
  AudioSample,
  GameScreenshotGrid,
} from '../components/FirstArticleMedia'

const wechatOriginal = 'https://mp.weixin.qq.com/s/t3BFROP2PcSpKNHW6vN6zA'
const zhAsset = (name: string) => `/assets/first-article/zh/${name}`
const audioAsset = (name: string) => `/assets/first-article/shared/${name}`

export default function AiGame24Days() {
  const toc = [
    ['playable', '能玩，只是第一步'],
    ['seven-demos', '七个 Demo，删掉一个'],
    ['judgment', 'AI 给选项，我来取舍'],
    ['voice', '三条早期试音'],
    ['why-write', '为什么开 Kevin AI局'],
    ['release-build', '现在的《一脚晋级》'],
  ]

  return (
    <>
      <SEOHead
        title="AI 做小游戏：1 天能玩，24 天上线"
        description="我是 Android 研发。第一次做微信小游戏，第二天已经能玩；从 Demo 到正式上线，又花了 23 天。"
        image="https://kevinai.top/assets/first-article/zh/og-ai-game-24-days-zh.png"
        type="article"
        publishedTime="2026-07-15T13:22:00.000Z"
        canonicalPath="/notes/ai-game-24-days"
        alternateZhPath="/notes/ai-game-24-days"
        alternateEnPath="/en/articles/ai-game-24-days"
      />

      <article className="pb-24 pt-24 md:pb-32 md:pt-32">
        <header className="mx-auto max-w-[1400px] px-4 md:px-6">
          <Link to="/notes" className="inline-flex text-sm text-graphite-400 transition-colors hover:text-white">
            <span className="mr-2" aria-hidden="true">←</span>返回文章列表
          </Link>

          <div className="mt-10 grid gap-10 border-b border-white/10 pb-12 md:pb-16 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs uppercase tracking-[0.16em] text-graphite-500">
                <span className="text-pitch-500">独立开发日记</span>
                <span>2026 年 7 月 15 日</span>
                <span>约 10 分钟</span>
              </div>
              <h1 className="max-w-5xl text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
                AI 做小游戏：1 天能玩，24 天上线
              </h1>
              <p className="mt-7 max-w-[65ch] text-lg leading-relaxed text-graphite-200 md:text-xl">
                我是 Android 研发。6 月 13 日，我第一次认真做小游戏。第二天，初版已经能玩。那晚我真有点飘，觉得再修几个小问题就能发。真正上线，是 7 月 7 日。
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={wechatOriginal}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-graphite-200 transition-colors hover:border-white/25 hover:text-white"
                >
                  查看公众号原文
                </a>
                <Link
                  to="/en/articles/ai-game-24-days"
                  className="inline-flex rounded-full bg-pitch-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-pitch-500"
                >
                  Read in English
                </Link>
              </div>
            </div>

            <dl className="grid grid-cols-3 gap-3 lg:col-span-4 lg:grid-cols-1 lg:justify-self-end">
              {[
                ['初版可玩', '1 天'],
                ['正式上线', '24 天'],
                ['当前版本', '500 关'],
              ].map(([label, value]) => (
                <div key={label} className="border-t border-white/10 pt-3 lg:min-w-[15rem]">
                  <dt className="text-xs text-graphite-500">{label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </header>

        <div className="mx-auto mt-10 grid max-w-[1400px] grid-cols-1 gap-12 px-4 md:mt-16 md:px-6 lg:grid-cols-12">
          <aside className="hidden lg:col-span-3 lg:block">
            <nav className="sticky top-28 border-l border-white/10 pl-5" aria-label="文章目录">
              <p className="mb-4 text-xs uppercase tracking-[0.18em] text-graphite-500">目录</p>
              <ol className="space-y-3 text-sm text-graphite-400">
                {toc.map(([id, label], index) => (
                  <li key={id}>
                    <a href={`#${id}`} className="transition-colors hover:text-pitch-400">
                      <span className="mr-2 tabular-nums text-graphite-600">{String(index + 1).padStart(2, '0')}</span>{label}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <div className="article-body min-w-0 lg:col-span-8 lg:col-start-5">
            <section id="playable">
              <p>从“能玩”到正式上线，我又走了 23 天。</p>

              <ArticleFigure
                src={zhAsset('timeline-zh.png')}
                alt="从 6 月 13 日开工，到 7 月 7 日上线的时间线"
                caption="6 月 13 日开工，6 月 14 日初版可玩，6 月 29 日进入游戏审核，7 月 7 日正式上线。"
              />

              <h2>能玩，只是第一步</h2>
              <p>AI 写出一个能运行的 Demo，很快。把它放到真实手机上，问题才开始一层层冒出来。</p>
              <p>操作顺不顺？小屏看不看得清？箭头、弹窗和配音会不会一起抢注意力？资源能不能装进包里？隐私说明和平台规则有没有踩线？代码跑通，不会替我回答这些问题。</p>

              <ArticleFigure
                src={zhAsset('comparison-zh.png')}
                alt="一天 Demo 与二十三天产品化工作的对比"
                caption="左边证明想法能跑，右边才是能交给别人玩的版本。"
              />
            </section>

            <section id="seven-demos">
              <h2>七个 Demo，删掉一个</h2>
              <p>6 月 15 日，我一天做了 7 个新玩法 Demo。第二天试玩完，我删掉了“移动防线”。</p>
              <p>它没有写坏，也能正常运行。问题更简单：它没让游戏变好玩，只让第一次玩的玩家更懵。AI 能把想法很快做出来，值不值得留下，还得我自己判断。</p>

              <ArticleFigure
                src={zhAsset('seven-demos-zh.png')}
                alt="七个玩法 Demo 中删掉移动防线"
                caption="能实现，不代表值得留下。移动防线能跑，但不适合这款游戏。"
              />

              <p>后来我又发现，新玩家连第一步为什么这么走都不知道。我先加箭头，又加弹窗和配音。加得越多，提示越容易打架。</p>
              <p>最后，我把前 10 关重新做了一遍。一关只教一件事。路线提示也改成卡住后再出现。</p>
              <p>整条难度曲线也重排了。差不多每 10 关加入一个新玩法：泥地、转向箭头、越位、队友、对手、守门员、黄牌、传送门，一层层叠上去。</p>
              <p>现在的版本有 500 关。每一关都跑过程序验证，保证存在可行解。</p>

              <ArticleFigure
                src={zhAsset('levels-zh.png')}
                alt="五百关逐步加入新机制的路线图"
                caption="规则逐步叠加。500 关不是把同一关复制 500 次。"
              />
            </section>

            <section id="judgment">
              <h2>AI 给选项，我来取舍</h2>
              <p>这一个月，AI 帮我最多的是调研和快速试错。玩法规则、代码、图片和配音，都能一批批生成。Demo 出得很快。</p>
              <p>接下来的工作没法交出去：玩法该怎么收，美术留哪一版，哪条配音更贴角色，什么时候该砍功能，审核该怎么走。最后删掉和重做的内容，比留下的多得多。</p>

              <ArticleFigure
                src={zhAsset('ai-judgment-zh.png')}
                alt="AI 批量生成，人做判断，再经真实设备验收"
                caption="AI 给得多。方向、审美、取舍和验收，仍然要有人负责。"
              />
            </section>

            <section id="voice">
              <h2>三条早期试音</h2>
              <p>下面三段，是 6 月 27 日给场边角色做的同一轮试音。都是 AI 生成的原创声线，没有克隆真人。三条念的是同一句台词，也没有为了这篇文章重做。</p>
              <p>最好戴上耳机。先听，再看我最后怎么选。</p>

              <div className="my-8 border-y border-white/10">
                <AudioSample label="试听 A" src={audioAsset('voice-a.mp3')} description="同一句台词 · 早期原样" />
                <AudioSample label="试听 B" src={audioAsset('voice-b.mp3')} description="同一句台词 · 早期原样" />
                <AudioSample label="试听 C" src={audioAsset('voice-c.mp3')} description="同一句台词 · 早期原样" />
              </div>

              <p>A 的个性最明显，但语速偏慢。连续触发几次，很容易腻。B 短促利落，适合推进时出现。C 更柔和，放在失败后的安慰里更合适。所以我最后没有只留一条。</p>
              <p>早期台词里还有“哥哥”。后来我删掉了这个称呼，角色也统一成场边教练。声音只是一步。台词写什么，什么时候播放，也要一起改。</p>
              <p>最后挑声时，我把每条都放回游戏里，连续触发十来次。听到第十次还不烦，才会留下。</p>

              <blockquote className="my-10 border-l-2 border-pitch-500 pl-5 text-xl leading-relaxed text-white md:text-2xl">
                AI 省下了从 0 到 1 的时间。从“能跑”到“敢给别人玩”，还是要一遍遍试玩和返工。
              </blockquote>
            </section>

            <section id="why-write">
              <h2>为什么开 Kevin AI局</h2>
              <p>我喜欢 3A 和独立游戏，也一直想做一款真正好玩的独立游戏。《一脚晋级》是我的第一次练手。</p>
              <p>它也让我第一次完整走过一遍：想法、Demo、测试、配音、素材、云服务、平台审核，最后真正上线。</p>
              <p>我想把这些过程记下来。以后这里主要写四类东西：</p>
              <ul className="mt-5 list-disc space-y-3 pl-5 text-base leading-relaxed text-graphite-200 md:text-lg">
                <li>我真实用过的 AI 工具和工作流</li>
                <li>一个想法怎样从 Demo 变成上线产品</li>
                <li>做 AI 项目的真实成本，以及白花的钱</li>
                <li>《一脚晋级》和以后其他项目的开发日记</li>
              </ul>
              <p className="mt-6">这些只是我现在的做法，不一定都对。有经验的朋友，欢迎直接指出问题。</p>
            </section>

            <section id="release-build">
              <h2>现在的《一脚晋级》</h2>
              <p>玩法很简单：移动场上的球员和障碍，给足球让出一条通往球门的路。越往后，规则越多。</p>
              <p>现在的主页、路线提示、排行榜、动物事件和奖励系统，都已经不是最早那个 Demo 里的样子。</p>

              <GameScreenshotGrid />

              <ArticleQrCta />

              <p>不好玩的地方可以直接说。卡关时，也可以把关卡号留给我。</p>
            </section>
          </div>
        </div>
      </article>
    </>
  )
}
