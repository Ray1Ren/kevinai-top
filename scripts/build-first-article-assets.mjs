#!/usr/bin/env node
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright'

const ROOT = resolve(process.cwd())
const SOURCE = resolve(
  ROOT,
  '../微信小游戏/晋级之路-运营/内容库/公众号/Kevin AI局_首发_20260715',
)
const OUT = join(ROOT, 'public/assets/first-article')
const ZH = join(OUT, 'zh')
const EN = join(OUT, 'en')
const SHARED = join(OUT, 'shared')

await Promise.all([mkdir(ZH, { recursive: true }), mkdir(EN, { recursive: true }), mkdir(SHARED, { recursive: true })])

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

const palette = {
  bg: '#141413',
  panel: '#201f1d',
  panel2: '#2a2926',
  ink: '#faf9f5',
  muted: '#b0aea5',
  line: '#4a4944',
  green: '#8ab82f',
  orange: '#d97757',
  blue: '#6a9bcc',
}

const style = `
  <style>
    .title { font: 700 58px Arial, Helvetica, sans-serif; letter-spacing: -2px; fill: ${palette.ink}; }
    .kicker { font: 700 18px Arial, Helvetica, sans-serif; letter-spacing: 5px; fill: ${palette.green}; }
    .sub { font: 400 26px Arial, Helvetica, sans-serif; fill: ${palette.muted}; }
    .label { font: 700 20px Arial, Helvetica, sans-serif; letter-spacing: 2px; fill: ${palette.muted}; }
    .value { font: 700 42px Arial, Helvetica, sans-serif; fill: ${palette.ink}; }
    .body { font: 400 24px Arial, Helvetica, sans-serif; fill: ${palette.ink}; }
    .small { font: 400 20px Arial, Helvetica, sans-serif; fill: ${palette.muted}; }
    .tiny { font: 700 15px Arial, Helvetica, sans-serif; letter-spacing: 2px; fill: ${palette.muted}; }
    .panel { fill: ${palette.panel}; stroke: ${palette.line}; stroke-width: 2; }
    .panel2 { fill: ${palette.panel2}; stroke: ${palette.line}; stroke-width: 2; }
    .accent { fill: ${palette.green}; }
    .accentText { fill: ${palette.green}; }
    .orange { fill: ${palette.orange}; }
    .blue { fill: ${palette.blue}; }
    .line { stroke: ${palette.line}; stroke-width: 3; fill: none; }
    .dash { stroke: ${palette.line}; stroke-width: 3; stroke-dasharray: 12 12; fill: none; }
  </style>`

function shell(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
    <rect width="1600" height="900" fill="${palette.bg}" />
    ${style}
    ${body}
  </svg>`
}

const assets = {
  'timeline-en': shell(`
    <text class="kicker" x="92" y="90">FROM FIRST BUILD TO RELEASE</text>
    <text class="title" x="92" y="170">Playable in 1 day. Shipped in 24.</text>
    <text class="sub" x="92" y="220">The first build came quickly. Shipping it took another 23 days.</text>
    <line x1="160" y1="510" x2="1440" y2="510" stroke="${palette.line}" stroke-width="5" />
    ${[
      [180, 'JUN 13', 'START', palette.blue, 'I began with almost no mini-game experience.'],
      [590, 'JUN 14', 'PLAYABLE', palette.green, 'The first version was already playable.'],
      [1000, 'JUN 29', 'REVIEW', palette.orange, 'The game went into platform review.'],
      [1400, 'JUL 7', 'LIVE', palette.green, 'The release build went live with 500 levels.'],
    ].map(([x, date, label, color, note]) => `
      <circle cx="${x}" cy="510" r="17" fill="${color}" stroke="${palette.bg}" stroke-width="7" />
      <text class="tiny" x="${x}" y="410" text-anchor="middle">${date}</text>
      <text class="value" x="${x}" y="462" text-anchor="middle" style="font-size:30px">${label}</text>
      <foreignObject x="${Number(x) - 155}" y="560" width="310" height="120">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font:20px/1.45 Arial;color:${palette.muted};text-align:center">${note}</div>
      </foreignObject>
    `).join('')}
    <rect class="panel" x="92" y="748" width="1416" height="86" rx="22" />
    <text class="body" x="800" y="802" text-anchor="middle">AI made the first build fast. Shipping took another 23 days.</text>
  `),

  'comparison-en': shell(`
    <text class="kicker" x="92" y="90">THE GAP I DID NOT SEE ON DAY TWO</text>
    <text class="title" x="92" y="170">The demo worked. It was not ready to ship.</text>
    <text class="sub" x="92" y="220">The demo proved the idea. The release had to work on a real phone and pass review.</text>
    <rect class="panel" x="92" y="286" width="620" height="480" rx="34" />
    <rect class="panel2" x="888" y="286" width="620" height="480" rx="34" />
    <text class="label" x="142" y="352">1-DAY DEMO</text>
    <text class="value" x="142" y="416">The code ran.</text>
    ${['A playable board', 'Win and lose states', 'One screen size', 'Enough to test the idea'].map((t, i) => `
      <circle cx="158" cy="${493 + i * 63}" r="7" class="blue" />
      <text class="body" x="184" y="${501 + i * 63}">${t}</text>
    `).join('')}
    <text class="label" x="938" y="352">23 MORE DAYS</text>
    <text class="value" x="938" y="416">It worked on a phone.</text>
    ${['Small screens and touch', 'Onboarding and difficulty', 'Voice, package size, privacy', 'Platform rules and review'].map((t, i) => `
      <circle cx="954" cy="${493 + i * 63}" r="7" class="accent" />
      <text class="body" x="980" y="${501 + i * 63}">${t}</text>
    `).join('')}
    <line x1="748" y1="526" x2="852" y2="526" stroke="${palette.orange}" stroke-width="10" />
    <line x1="800" y1="474" x2="800" y2="578" stroke="${palette.orange}" stroke-width="10" />
    <text class="small" x="800" y="824" text-anchor="middle">The real phone was where the unfinished work showed up.</text>
  `),

  'seven-demos-en': shell(`
    <text class="kicker" x="92" y="90">SEVEN DEMOS, ONE CUT</text>
    <text class="title" x="92" y="170">Seven demos in one day. I cut one the next.</text>
    <text class="sub" x="92" y="220">The discarded idea worked. It just made the first play session harder to understand.</text>
    ${[
      ['MUD', 92, 300, palette.blue], ['TURN ARROWS', 342, 300, palette.green], ['OFFSIDE', 592, 300, '#7f7398'],
      ['TEAMMATES', 92, 520, palette.green], ['GOALKEEPER', 342, 520, '#7f7398'], ['MOVING DEFENSE', 592, 520, palette.orange],
    ].map(([label, x, y, color], i) => `
      <rect x="${x}" y="${y}" width="210" height="178" rx="26" fill="${palette.panel}" stroke="${i === 5 ? palette.orange : palette.line}" stroke-width="3" />
      <circle cx="${Number(x) + 105}" cy="${Number(y) + 72}" r="35" fill="${color}" opacity="0.88" />
      <path d="M ${Number(x) + 80} ${Number(y) + 72} h 50 M ${Number(x) + 105} ${Number(y) + 47} v 50" stroke="${palette.bg}" stroke-width="8" stroke-linecap="round" />
      <text class="tiny" x="${Number(x) + 105}" y="${Number(y) + 145}" text-anchor="middle">${label}</text>
      ${i === 5 ? `<path d="M ${Number(x) + 28} ${Number(y) + 28} L ${Number(x) + 182} ${Number(y) + 150} M ${Number(x) + 182} ${Number(y) + 28} L ${Number(x) + 28} ${Number(y) + 150}" stroke="${palette.orange}" stroke-width="12" stroke-linecap="round" />` : ''}
    `).join('')}
    <rect class="panel2" x="884" y="300" width="624" height="398" rx="34" />
    <text class="label" x="944" y="374">THE QUESTION I HAD TO ASK</text>
    <text class="value" x="944" y="448" style="font-size:34px">Did it make the game better?</text>
    <line x1="944" y1="486" x2="1448" y2="486" stroke="${palette.line}" stroke-width="2" />
    <text class="body" x="944" y="552">It was possible to build.</text>
    <text class="body" x="944" y="604">It was not worth keeping.</text>
    <text x="944" y="666" style="font:700 27px Arial;fill:${palette.orange}">I REMOVED MOVING DEFENSE.</text>
    <text class="small" x="92" y="824">AI got me from idea to demo faster. It could not tell me which idea belonged in the game.</text>
  `),

  'ai-judgment-en': shell(`
    <text class="kicker" x="92" y="90">WHAT THE WORK LOOKED LIKE</text>
    <text class="title" x="92" y="170">AI produced options quickly. I still had to choose.</text>
    <text class="sub" x="92" y="220">Most of my time went into testing, cutting, rebuilding, and getting through review.</text>
    ${[
      [92, '01', 'AI OUTPUT', ['Research', 'Code', 'Images', 'Voices'], palette.blue],
      [470, '02', 'MY CHOICES', ['Direction', 'Taste', 'Cuts', 'What stayed'], palette.orange],
      [848, '03', 'REAL CHECKS', ['Phone', 'Repeat play', 'Package size', 'Platform rules'], '#7f7398'],
      [1226, '04', 'SHIPPED BUILD', ['500 levels', 'Clear onboarding', 'Reviewed', 'Live in WeChat'], palette.green],
    ].map(([x, no, title, items, color], index) => `
      <rect class="panel" x="${x}" y="300" width="282" height="410" rx="30" />
      <circle cx="${Number(x) + 54}" cy="354" r="24" fill="${color}" />
      <text x="${Number(x) + 54}" y="362" text-anchor="middle" style="font:700 17px Arial;fill:${palette.bg}">${no}</text>
      <text class="label" x="${Number(x) + 92}" y="363">${title}</text>
      ${items.map((item, i) => `
        <line x1="${Number(x) + 34}" y1="${430 + i * 62}" x2="${Number(x) + 248}" y2="${430 + i * 62}" stroke="${palette.line}" stroke-width="2" />
        <text class="body" x="${Number(x) + 34}" y="${414 + i * 62}">${item}</text>
      `).join('')}
      ${index < 3 ? `<path d="M ${Number(x) + 300} 505 h 48 l -14 -14 m 14 14 l -14 14" stroke="${palette.muted}" stroke-width="4" fill="none" />` : ''}
    `).join('')}
    <rect x="92" y="760" width="1416" height="76" rx="20" fill="${palette.green}" />
    <text x="800" y="808" text-anchor="middle" style="font:700 25px Arial;fill:${palette.bg}">I spent more time testing and rebuilding than generating.</text>
  `),

  'levels-en': shell(`
    <text class="kicker" x="92" y="90">A LONGER DIFFICULTY CURVE</text>
    <text class="title" x="92" y="170">500 levels, with new rules along the way.</text>
    <text class="sub" x="92" y="220">Roughly every 10 levels, the player learns one new rule.</text>
    <path d="M 140 640 C 320 520, 370 590, 520 480 S 770 510, 900 400 S 1180 440, 1450 300" stroke="${palette.line}" stroke-width="5" fill="none" />
    ${[
      [170, 620, 'BASE MOVE', palette.blue],
      [365, 535, 'MUD', palette.blue],
      [555, 465, 'TURN ARROWS', palette.green],
      [750, 455, 'OFFSIDE', '#7f7398'],
      [945, 375, 'TEAMMATES + RIVALS', palette.orange],
      [1135, 360, 'GOALKEEPERS', palette.blue],
      [1305, 315, 'CARDS + PORTALS', '#7f7398'],
      [1450, 300, 'LEVEL 500', palette.green],
    ].map(([x, y, label, color], i) => `
      <circle cx="${x}" cy="${y}" r="18" fill="${color}" stroke="${palette.bg}" stroke-width="7" />
      <line x1="${x}" y1="${Number(y) - 24}" x2="${x}" y2="${Number(y) - 82}" stroke="${palette.line}" stroke-width="2" />
      <text class="tiny" x="${x}" y="${Number(y) - 98}" text-anchor="middle" style="font-size:${i === 4 ? 13 : 15}px">${label}</text>
    `).join('')}
    <rect class="panel" x="92" y="724" width="1416" height="112" rx="26" />
    <circle cx="152" cy="780" r="22" fill="none" stroke="${palette.green}" stroke-width="6" />
    <path d="M 139 780 l 9 9 18 -22" stroke="${palette.green}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    <text class="body" x="196" y="775">Every level has a solver-verified route.</text>
    <text class="small" x="196" y="809">The rules stack gradually, so the difficulty rises one step at a time.</text>
  `),
}

for (const [name, svg] of Object.entries(assets)) {
  await writeFile(join(EN, `${name}.svg`), svg)
}

const browser = await chromium.launch({ channel: 'chrome' })
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })
  for (const name of Object.keys(assets)) {
    await page.goto(pathToFileURL(join(EN, `${name}.svg`)).href)
    await page.screenshot({ path: join(EN, `${name}.png`), clip: { x: 0, y: 0, width: 1600, height: 900 } })
  }
} finally {
  await browser.close()
}

await copyFile(join(EN, 'timeline-en.png'), join(EN, 'og-ai-game-24-days-en.png'))
await copyFile(join(ZH, 'timeline-zh.png'), join(ZH, 'og-ai-game-24-days-zh.png'))

console.log(`First article assets built in ${OUT}`)
