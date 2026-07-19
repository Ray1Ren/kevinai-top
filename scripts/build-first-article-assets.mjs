#!/usr/bin/env node
import { access, copyFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const ROOT = resolve(process.cwd())
const SOURCE = resolve(
  ROOT,
  '../微信小游戏/晋级之路-运营/内容库/公众号/Kevin AI局_首发_20260715',
)
const OUT = join(ROOT, 'public/assets/first-article')
const ZH = join(OUT, 'zh')
const EN = join(OUT, 'en')
const SHARED = join(OUT, 'shared')

await Promise.all([
  mkdir(ZH, { recursive: true }),
  mkdir(EN, { recursive: true }),
  mkdir(SHARED, { recursive: true }),
])

const copies = [
  ['imgs/01-timeline-one-day-24-days.png', 'zh/timeline-zh.png'],
  ['imgs/02-comparison-demo-product.png', 'zh/comparison-zh.png'],
  ['imgs/03-infographic-seven-demos.png', 'zh/seven-demos-zh.png'],
  ['imgs/04-framework-ai-human-judgment.png', 'zh/ai-judgment-zh.png'],
  ['imgs/05-infographic-500-levels.png', 'zh/levels-zh.png'],
  ['imgs/06-real-new-home.png', 'shared/game-home.png'],
  ['imgs/07-real-level-100-route.png', 'shared/level-100.png'],
  ['imgs/08-real-global-rank.png', 'shared/global-rank.png'],
  ['imgs/09-real-rank-promotion.png', 'shared/rank-promotion.png'],
  ['imgs/10-real-animal-event.png', 'shared/animal-event.png'],
  ['imgs/11-real-reward-bank.png', 'shared/reward-bank.png'],
  ['audio/01_试听A.mp3', 'shared/voice-a.mp3'],
  ['audio/02_试听B.mp3', 'shared/voice-b.mp3'],
  ['audio/03_试听C.mp3', 'shared/voice-c.mp3'],
]

await Promise.all(copies.map(([from, to]) => copyFile(join(SOURCE, from), join(OUT, to))))

// English infographics are final Image Gen edits. Never rebuild or overwrite
// them with SVG, Canvas, or browser-rendered text overlays.
const imageGenEnglishAssets = [
  'timeline-en.png',
  'comparison-en.png',
  'seven-demos-en.png',
  'ai-judgment-en.png',
  'levels-en.png',
  'og-ai-game-24-days-en.png',
]

await Promise.all(imageGenEnglishAssets.map((file) => access(join(EN, file))))
await copyFile(join(ZH, 'timeline-zh.png'), join(ZH, 'og-ai-game-24-days-zh.png'))

console.log(`Chinese and shared first-article assets refreshed in ${OUT}; Image Gen English assets preserved`)
