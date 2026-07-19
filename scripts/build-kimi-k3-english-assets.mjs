#!/usr/bin/env node
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_ROOT = resolve(
  ROOT,
  '../微信小游戏/晋级之路-运营/内容库/公众号/弹弓攻城三方同题实测_20260718',
)
const CHART_SOURCE = join(SOURCE_ROOT, 'charts/quality-scorecards.html')
const ZH = join(ROOT, 'public/assets/article-kimi-k3')
const EN = join(ROOT, 'public/assets/article-kimi-k3-en')

await mkdir(ZH, { recursive: true })
await mkdir(EN, { recursive: true })

const sharedImages = [
  'k3-official-benchmark.png',
  'vision-arrow.png',
  'vision-count-party.png',
  'vision-count-snow.png',
  'vision-ocr.png',
]
await Promise.all(sharedImages.map((name) => copyFile(join(ZH, name), join(EN, name))))

const translations = new Map([
  ['四项实测成绩单', 'Four-task benchmark scorecards'],
  ['2D 仿愤怒的小鸟 demo', '2D slingshot physics demo'],
  ['网页制作', 'Promotion page'],
  ['图片识别', 'Image recognition'],
  ['功能完整性、视觉表现、交互体验、稳定性与适配四项合计 100 分；速度单独统计。', 'Functionality, visuals, interaction, stability, and device support total 100 points. Time is reported separately.'],
  ['关卡、规则、音效、存档', 'Levels, rules, audio, saved progress'],
  ['功能完整性', 'Functionality'],
  ['画面、信息层级、反馈', 'Art, information hierarchy, feedback'],
  ['视觉表现', 'Visuals'],
  ['拉弓、轨迹、碰撞、命中', 'Pull, trajectory, collisions, hits'],
  ['交互体验', 'Interaction'],
  ['静置、桌面与手机实测', 'Idle state, desktop, and mobile tests'],
  ['稳定性与适配', 'Stability and device support'],
  ['3D 第一人称射击小游戏', '3D first-person shooter'],
  ['功能完整性、3D 视觉、操作体验、稳定性与适配四项合计 100 分；速度单独统计。', 'Functionality, 3D visuals, controls, stability, and device support total 100 points. Time is reported separately.'],
  ['开局、战斗、目标、结算', 'Start, combat, objective, results'],
  ['3D 视觉表现', '3D visuals'],
  ['场景、地标、引导、信息层级', 'Scene, landmarks, guidance, hierarchy'],
  ['操作体验', 'Controls'],
  ['移动、射击、受击、拆除', 'Movement, shooting, damage, defusal'],
  ['桌面、手机、存档', 'Desktop, mobile, saved progress'],
  ['品牌视觉、核心交互、动效表现、稳定性与适配四项合计 100 分；速度单独统计。', 'Brand visuals, core interaction, motion, stability, and device support total 100 points. Time is reported separately.'],
  ['Logo、素材、构图、层级', 'Logo, assets, composition, hierarchy'],
  ['品牌视觉', 'Brand visuals'],
  ['三步挑战与操作反馈', 'Three-move challenge and feedback'],
  ['核心交互', 'Core interaction'],
  ['滚动、过渡、卖点呈现', 'Scroll, transitions, product story'],
  ['动效表现', 'Motion'],
  ['桌面、手机与基础检查', 'Desktop, mobile, and basic checks'],
  ['50 道题按三类识别能力计分，再加入 15 道难题的回答稳定性，总分 100。', 'Fifty questions cover three visual skill groups, plus answer consistency on 15 difficult questions, for 100 points total.'],
  ['日常图像、OCR 与文档', 'Everyday images, OCR, and documents'],
  ['15 题：物体、文字、文档表格', '15 questions: objects, text, document tables'],
  ['计数与空间关系', 'Counting and spatial relations'],
  ['10 题：密集计数、小目标位置', '10 questions: dense counting, small-object position'],
  ['图表、专业图与界面', 'Charts, technical images, and UI'],
  ['25 题：图表、工程图、UI', '25 questions: charts, engineering diagrams, UI'],
  ['难题回答稳定性', 'Consistency on difficult questions'],
  ['15 道难题，连续回答三次', '15 difficult questions, answered three times'],
  ['：综合得分', ': overall score'],
  ['满分 100，时间另算', '100 points; time reported separately'],
  ['蓝色是这一题最高分。', 'Blue marks the highest score in this task.'],
  ['：评分细节', ': score breakdown'],
  ['蓝色标出本维度最高分', 'Blue marks the top score in each category'],
  ['四项任务，三家分别用了多久？', 'How long did each model take on four tasks?'],
  ['横条越短，用时越少', 'Shorter bars mean less time'],
  ['前三项从开工一直计到模型自己停手；图片识别看单题中位数。四张小图各用自己的时间尺，真实用时写在右边。', 'The first three tasks run from start until the model stopped. Image recognition uses median time per question. Each panel has its own scale; actual times appear at right.'],
  ['2D 小游戏', '2D game'],
  ['3D 小游戏', '3D game'],
  ['从开工到停手', 'Start to finish'],
  ['最长', 'longest'],
  ['单题中位数', 'Median per question'],
  ['最慢', 'slowest'],
  ['四项实测：最后总分', 'Four-task benchmark: total score'],
  ['满分 100，四项各占 25%', '100 points; each task contributes 25%'],
  ['蓝色标出总分最高的一家，速度不计入本图。', 'Blue marks the highest total. Time is excluded.'],
  ['四项实测：单项成绩', 'Four-task benchmark: task scores'],
  ['蓝色标出本项最高分', 'Blue marks the highest score in each task'],
  ['2D、3D、网页制作和图片识别都按 100 分计算，速度单独统计。', 'The 2D, 3D, promotion-page, and vision tasks are each scored out of 100. Time is reported separately.'],
  ['满分 100', '100 points'],
  ['三项编码任务：新增 Token 合计', 'Three coding tasks: total new tokens'],
  ['横条越短，新增越少', 'Shorter bars mean fewer new tokens'],
  ['蓝色是新增最少的一家。灰字是缓存读取。两者没有相加。', 'Blue marks the fewest new tokens. Gray text shows cache reads; the two are not added together.'],
  ['三项编码任务：分项 Token', 'Three coding tasks: tokens by task'],
  ['每项单独比较', 'Each task uses its own comparison'],
  ['横条只看新增 Token。灰字是缓存读取。三张小图各用自己的尺。', 'Bars show only new tokens. Gray text shows cache reads. Each panel uses its own scale.'],
  ['三项合计', 'Three-task total'],
  ['新增 Token', 'New tokens'],
  ['缓存读取', 'Cache reads'],
  ['缓存 ', 'Cache '],
  [' 万', ' x10k'],
  ['秒', 's'],
  [' 分', ' pts'],
])

let zhChartHtml = applyPublishedScores(await readFile(CHART_SOURCE, 'utf8'))
const openAiIcon = await readFile(join(SOURCE_ROOT, 'assets/brand-openai.svg'), 'base64')
const minimaxIcon = await readFile(join(SOURCE_ROOT, 'assets/brand-minimax.png'), 'base64')
zhChartHtml = zhChartHtml
  .replaceAll('../assets/brand-openai.svg', `data:image/svg+xml;base64,${openAiIcon}`)
  .replaceAll('../assets/brand-minimax.png', `data:image/png;base64,${minimaxIcon}`)

let enChartHtml = zhChartHtml
for (const [from, to] of [...translations].sort((left, right) => right[0].length - left[0].length)) {
  enChartHtml = enChartHtml.replaceAll(from, to)
}
enChartHtml = enChartHtml
  .replace('<html lang="zh-CN">', '<html lang="en">')
  .replace('"PingFang SC", "Microsoft YaHei", ', '')

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio'] })
try {
  const page = await browser.newPage({ viewport: { width: 1640, height: 1100 }, deviceScaleFactor: 1 })
  const zhCharts = [
    ['#quality-overview-total', 'overall-total.png'],
    ['#quality-overview-detail', 'overall-detail.png'],
    ['#quality-3d-total', '3d-total.png'],
    ['#quality-3d-detail', '3d-detail.png'],
    ['#token-overview-total', 'token-total.png'],
    ['#token-overview-detail', 'token-detail.png'],
  ]
  const enCharts = [
    ...zhCharts,
    ['#duration-overview', 'duration.png'],
    ['#quality-2d-total', '2d-total.png'],
    ['#quality-2d-detail', '2d-detail.png'],
    ['#quality-promo-total', 'web-total.png'],
    ['#quality-promo-detail', 'web-detail.png'],
    ['#quality-vision-total', 'vision-total.png'],
    ['#quality-vision-detail', 'vision-detail.png'],
  ]
  await renderCharts(page, zhChartHtml, ZH, zhCharts, false)
  await renderCharts(page, enChartHtml, EN, enCharts, true)

  await renderEvidenceScreenshots(page)
} finally {
  await browser.close()
}

console.log(`English Kimi K3 article assets built in ${EN}`)

function applyPublishedScores(html) {
  const taskTotals = `const publishedTaskTotals = {
      'quality-2d': { kimi: 80.5, gpt: 96.0, m3: 54.5 },
      'quality-3d': { kimi: 91.0, gpt: 89.2, m3: 83.6 },
      'quality-promo': { kimi: 91.0, gpt: 95.0, m3: 85.0 },
      'quality-vision': { kimi: 96.7, gpt: 90.0, m3: 88.0 },
    };
    const order = ['kimi', 'gpt', 'm3'];`
  const overviewCalculation = `const overviewTotals = Object.fromEntries(order.map((model) => [
      model,
      cards.reduce((sum, card) => sum + totalFor(card, model), 0) / cards.length,
    ]));`
  const cardCalculation = 'const totals = Object.fromEntries(order.map((model) => [model, totalFor(card, model)]));'
  const patched = html
    .replace("const order = ['kimi', 'gpt', 'm3'];", taskTotals)
    .replace(overviewCalculation, 'const overviewTotals = { kimi: 89.8, gpt: 92.6, m3: 77.8 };')
    .replaceAll(cardCalculation, 'const totals = publishedTaskTotals[card.id];')

  if (!patched.includes('const overviewTotals = { kimi: 89.8, gpt: 92.6, m3: 77.8 };')) {
    throw new Error('Could not patch the public article score chart with the final published totals')
  }
  return patched
}

async function renderCharts(page, html, outputDirectory, charts, requireEnglish) {
  await page.setViewportSize({ width: 1640, height: 1100 })
  await page.goto('about:blank')
  const pageErrors = []
  const capturePageError = (error) => pageErrors.push(error.message)
  page.on('pageerror', capturePageError)
  await page.setContent(html, { waitUntil: 'load' })
  await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0))

  if (await page.locator(charts[0][0]).count() === 0) {
    page.off('pageerror', capturePageError)
    throw new Error(`${requireEnglish ? 'English' : 'Chinese'} score charts did not render: ${pageErrors.join(' | ')}`)
  }

  for (const [selector, filename] of charts) {
    const locator = page.locator(selector)
    const visibleText = await locator.innerText()
    if (requireEnglish && /\p{Script=Han}/u.test(visibleText)) {
      throw new Error(`${filename} still contains Chinese text: ${visibleText}`)
    }
    await locator.screenshot({ path: join(outputDirectory, filename) })
  }
  page.off('pageerror', capturePageError)
}

async function renderEvidenceScreenshots(page) {
  const screenshots = [
    ['codex-token-usage.png', 966, 484, codexUsage()],
    ['codex-week-quota.png', 680, 180, codexQuota()],
    ['kimi-token-ledger.png', 1362, 356, kimiLedger()],
    ['kimi-week-quota.png', 1422, 436, kimiQuota()],
  ]

  for (const [filename, width, height, body] of screenshots) {
    await page.setViewportSize({ width, height })
    await page.setContent(`<style>${evidenceStyles()}</style>${body}`, { waitUntil: 'load' })
    const visibleText = await page.locator('body').innerText()
    if (/\p{Script=Han}/u.test(visibleText)) throw new Error(`${filename} still contains Chinese text`)
    await page.screenshot({ path: join(EN, filename), clip: { x: 0, y: 0, width, height } })
  }
}

function evidenceStyles() {
  return `
    *{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden}body{font-family:Arial,Helvetica,sans-serif;background:#111;color:#f6f7fa}
    .muted{color:#9ca3af}.blue{color:#60a5fa}.card{border:1px solid #383838;border-radius:22px;background:#151515}.bar{height:28px;border-radius:4px;background:#303030;overflow:hidden}.fill{height:100%;background:#e5e7eb}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
  `
}

function codexUsage() {
  return `<main style="position:relative;width:966px;height:484px;padding:42px 56px;background:#1c2028;border:2px solid #39404d;border-radius:48px">
    <h1 style="margin:0;width:260px;font-size:44px;line-height:1.06">Token Usage<br>Trends</h1>
    <p class="muted" style="position:absolute;top:32px;left:375px;margin:0;font-size:27px">Source: ccusage daily stats · updated 4 min ago</p>
    <div style="position:absolute;top:174px;left:56px;width:866px">
      <div style="display:grid;grid-template-columns:220px 1fr auto;align-items:center;gap:18px"><span style="font-size:30px">07-18</span><div class="bar"><div class="fill" style="width:100%;background:linear-gradient(90deg,#0788ff,#6ed4f2)"></div></div><b class="blue" style="font-size:29px">3.02B · $5,110</b></div>
      <div style="margin-top:76px;display:grid;grid-template-columns:220px 1fr;align-items:center;gap:18px"><span style="font-size:30px">07-17</span><div class="bar"><div class="fill" style="width:13%"></div></div></div>
    </div>
    <section style="position:absolute;left:294px;top:236px;width:640px;height:248px;padding:26px 30px;background:#242a34;border:2px solid #4a5362;border-radius:26px">
      <h2 class="muted" style="margin:0 0 18px;font-size:25px">07-18 token mix</h2>
      <p style="margin:0 0 15px;font-size:25px"><b>Input: 145M</b><br><span class="muted" style="font-size:21px">Uncached input tokens</span></p>
      <p style="margin:0;font-size:25px"><b>Cache reads: 2.86B</b><br><span class="muted" style="font-size:21px">95% of total input</span></p>
    </section>
  </main>`
}

function codexQuota() {
  return `<main style="width:680px;height:180px;padding:18px 28px;background:linear-gradient(110deg,#303030,#262626);font-size:28px">
    <div style="display:flex;justify-content:space-between;align-items:center"><strong>◔&nbsp; Remaining usage <span class="muted">6%</span></strong><span class="muted">⌄</span></div>
    <div style="display:flex;justify-content:space-between;margin:26px 36px 0"><span>1 week</span><span class="muted">6% · Jul 25</span></div>
    <div style="display:flex;justify-content:space-between;margin:24px 36px 0"><span>3 resets available</span><span>›</span></div>
  </main>`
}

function kimiLedger() {
  const rows = [
    ['Jul 17', '759,882', '10,000,854', '10,760,736'],
    ['Through Jul 18, 22:16', '1,894,879', '35,786,172', '37,681,051'],
    ['Total', '2,654,761', '45,787,026', '48,441,787'],
  ]
  return `<main style="width:1362px;height:356px;padding:28px 38px;background:#171717">
    <div style="display:grid;grid-template-columns:1.35fr .9fr .9fr .9fr;gap:28px;padding:8px 0 18px;border-bottom:2px solid #424242;font-size:26px;font-weight:700"><span>Date</span><span>New input + output</span><span>Cache reads</span><span>Raw total</span></div>
    ${rows.map((row, index) => `<div style="display:grid;grid-template-columns:1.35fr .9fr .9fr .9fr;gap:28px;padding:25px 0;border-bottom:${index === rows.length - 1 ? 0 : 2}px solid #272727;font-size:29px;${index === rows.length - 1 ? 'font-weight:700' : ''}">${row.map((cell) => `<span class="mono">${cell}</span>`).join('')}</div>`).join('')}
  </main>`
}

function kimiQuota() {
  return `<main style="width:1422px;height:436px;padding:30px 12px;background:#111">
    <h1 style="margin:0 0 68px;font-size:38px">Dashboard</h1>
    <div style="display:grid;grid-template-columns:1.1fr 1.1fr .7fr;gap:30px">
      <section class="card" style="height:254px;padding:34px"><h2 class="muted" style="margin:0;font-size:28px">Weekly usage ⓘ</h2><div style="display:flex;justify-content:space-between;align-items:end;margin-top:48px"><b class="mono" style="font-size:46px">50%</b><span class="muted" style="font-size:27px">Resets in 133 hours</span></div><div class="bar" style="margin-top:17px"><div class="fill" style="width:50%"></div></div></section>
      <section class="card" style="height:254px;padding:34px"><div style="display:flex;justify-content:space-between"><h2 class="muted" style="margin:0;font-size:28px">Rate-limit details ⓘ</h2><span class="blue" style="font-size:27px">Buy add-on</span></div><div style="display:flex;justify-content:space-between;align-items:end;margin-top:48px"><b class="mono" style="font-size:46px">100%</b><span class="muted" style="font-size:27px">Resets in 37 minutes</span></div><div class="bar" style="margin-top:17px"><div class="fill" style="width:100%"></div></div></section>
      <section class="card" style="height:254px;padding:34px"><h2 class="muted" style="margin:0;font-size:28px">My plan</h2><p class="mono" style="margin:52px 0 8px;font-size:44px">Allegro</p><span class="muted" style="font-size:25px">Member</span></section>
    </div>
  </main>`
}
