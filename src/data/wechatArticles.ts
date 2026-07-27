import aiToolsEn from '../content/wechat/ai-tools-500-levels.en.md?raw'
import aiToolsZh from '../content/wechat/ai-tools-500-levels.zh.md?raw'
import k3ContextEn from '../content/wechat/k3-930k-token-test.en.md?raw'
import k3ContextZh from '../content/wechat/k3-930k-token-test.zh.md?raw'
import opusBattleEn from '../content/wechat/opus-5-eight-models.en.md?raw'
import opusBattleZh from '../content/wechat/opus-5-eight-models.zh.md?raw'

export type WechatArticleId =
  | 'ai-tools-500-levels'
  | 'k3-930k-token-test'
  | 'opus-5-eight-models'

export type LocalizedText = {
  en: string
  zh: string
}

export type ArticleFact = {
  label: LocalizedText
  value: LocalizedText
}

export type WechatArticle = {
  id: WechatArticleId
  category: LocalizedText
  content: LocalizedText
  date: LocalizedText
  description: LocalizedText
  facts: ArticleFact[]
  image: LocalizedText
  path: LocalizedText
  publishedTime: string
  readingTime: LocalizedText
  title: LocalizedText
}

export const WECHAT_ARTICLES: WechatArticle[] = [
  {
    id: 'opus-5-eight-models',
    category: {
      zh: '八模型实测',
      en: 'Eight-model field test',
    },
    content: {
      zh: opusBattleZh,
      en: opusBattleEn,
    },
    date: {
      zh: '2026 年 7 月 26 日',
      en: 'July 26, 2026',
    },
    description: {
      zh: 'Opus 5、Fable 5、GPT-5.6-sol、Kimi K3 等八个模型，同题做 2D、3D、产品页和 50 图识别。',
      en: 'Eight models — including Opus 5, Fable 5, GPT-5.6-sol, and Kimi K3 — take on the same 2D, 3D, product-page, and 50-image tests.',
    },
    facts: [
      {
        label: { zh: '参测模型', en: 'Models' },
        value: { zh: '8 个', en: '8' },
      },
      {
        label: { zh: '质量第一', en: 'Quality leader' },
        value: { zh: 'Opus 5', en: 'Opus 5' },
      },
      {
        label: { zh: '总均分', en: 'Average' },
        value: { zh: '94.4', en: '94.4' },
      },
    ],
    image: {
      zh: 'https://kevinai.top/assets/wechat/opus-5-eight-models/06-v2-quality-overall.png',
      en: 'https://kevinai.top/assets/wechat/opus-5-eight-models/06-v2-quality-overall-en.png',
    },
    path: {
      zh: '/notes/opus-5-eight-models',
      en: '/en/articles/opus-5-eight-models',
    },
    publishedTime: '2026-07-26T09:50:00.000Z',
    readingTime: {
      zh: '约 25 分钟',
      en: 'About 25 min',
    },
    title: {
      zh: '牙膏挤爆！Opus 5支棱起来了？8大模型大混战',
      en: 'Opus 5 Steps Up: Eight Models in Four Hands-On Tests',
    },
  },
  {
    id: 'k3-930k-token-test',
    category: {
      zh: '长上下文实测',
      en: 'Long-context test',
    },
    content: {
      zh: k3ContextZh,
      en: k3ContextEn,
    },
    date: {
      zh: '2026 年 7 月 17 日',
      en: 'July 17, 2026',
    },
    description: {
      zh: '93 万 Token、80 个检查、四个 Agent 组合：K3 的 1M 上下文到底能不能用。',
      en: '930,000 tokens, 80 checks, and four agent combinations: a hands-on test of whether K3’s 1M context really works.',
    },
    facts: [
      {
        label: { zh: '上下文实测', en: 'Context tested' },
        value: { zh: '93 万', en: '930K' },
      },
      {
        label: { zh: '检查项', en: 'Checks' },
        value: { zh: '80 项', en: '80' },
      },
      {
        label: { zh: 'K3 成绩', en: 'K3 result' },
        value: { zh: '80/80', en: '80/80' },
      },
    ],
    image: {
      zh: 'https://kevinai.top/assets/wechat/k3-930k-token-test/01-01-cover-wide.png',
      en: 'https://kevinai.top/assets/wechat/k3-930k-token-test/06-06-scoreboard-en.png',
    },
    path: {
      zh: '/notes/k3-930k-token-test',
      en: '/en/articles/k3-930k-token-test',
    },
    publishedTime: '2026-07-17T10:00:00.000Z',
    readingTime: {
      zh: '约 15 分钟',
      en: 'About 15 min',
    },
    title: {
      zh: 'K3 今天刚发，我先往里塞了 93 万 token',
      en: 'K3 Launched Today. I Fed It 930,000 Tokens.',
    },
  },
  {
    id: 'ai-tools-500-levels',
    category: {
      zh: 'AI 工具复盘',
      en: 'AI tool workflow',
    },
    content: {
      zh: aiToolsZh,
      en: aiToolsEn,
    },
    date: {
      zh: '2026 年 7 月 16 日',
      en: 'July 16, 2026',
    },
    description: {
      zh: '18 个活跃日、1289 次来回、500 关和 2584 个试听位：Claude、Codex、MiniMax 分别适合干什么。',
      en: 'Eighteen active days, 1,289 exchanges, 500 levels, and 2,584 voice auditions: where Claude, Codex, and MiniMax each fit.',
    },
    facts: [
      {
        label: { zh: '活跃开发', en: 'Active days' },
        value: { zh: '18 天', en: '18' },
      },
      {
        label: { zh: '来回沟通', en: 'Exchanges' },
        value: { zh: '1289 次', en: '1,289' },
      },
      {
        label: { zh: '当前关卡', en: 'Levels' },
        value: { zh: '500 关', en: '500' },
      },
    ],
    image: {
      zh: 'https://kevinai.top/assets/wechat/ai-tools-500-levels/01-01-real-game-result.png',
      en: 'https://kevinai.top/assets/wechat/ai-tools-500-levels/01-01-real-game-result.png',
    },
    path: {
      zh: '/notes/ai-tools-500-levels',
      en: '/en/articles/ai-tools-500-levels',
    },
    publishedTime: '2026-07-16T10:00:00.000Z',
    readingTime: {
      zh: '约 10 分钟',
      en: 'About 10 min',
    },
    title: {
      zh: '一个小游戏做到 500 关，我现在这样用 Claude、Codex 和 MiniMax',
      en: 'How I Use Claude, Codex, and MiniMax After Building 500 Levels',
    },
  },
]

export function getWechatArticle(id: WechatArticleId): WechatArticle {
  const article = WECHAT_ARTICLES.find((candidate) => candidate.id === id)
  if (!article) throw new Error(`Unknown WeChat article: ${id}`)
  return article
}
