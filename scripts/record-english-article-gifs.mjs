#!/usr/bin/env node
import { createReadStream } from 'node:fs'
import { mkdtemp, mkdir, rm, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, normalize, resolve } from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { chromium } from 'playwright'

const runFile = promisify(execFile)
const ROOT = resolve(process.cwd())
const PUBLIC = join(ROOT, 'public')
const GIFS = join(PUBLIC, 'assets/gifs-en')
const ARTICLE = join(PUBLIC, 'assets/article-kimi-k3-en')
const temp = await mkdtemp(join(tmpdir(), 'kevinai-english-gifs-'))
const server = await startStaticServer()
const address = server.address()
if (!address || typeof address === 'string') throw new Error('Static server did not expose a port')
const base = `http://127.0.0.1:${address.port}`

await Promise.all([mkdir(GIFS, { recursive: true }), mkdir(ARTICLE, { recursive: true })])

const recordings = [
  { name: '2d-k3', path: '/bundles/2d/kimi/index.html?lang=en', seconds: 6.4, fps: 10, output: join(GIFS, '2d-k3.gif'), action: (page) => play2d(page, '#btn-start') },
  { name: '2d-codex', path: '/bundles/2d/codex/index.html?lang=en', seconds: 6.4, fps: 10, output: join(GIFS, '2d-codex.gif'), action: (page) => play2d(page, '#startButton') },
  { name: '2d-m3', path: '/bundles/2d/minimax-m3/index.html?lang=en', seconds: 6.4, fps: 10, output: join(GIFS, '2d-m3.gif'), action: (page) => play2d(page, '#btn-start') },
  { name: '3d-k3', path: '/bundles/3d/kimi/index.html?lang=en', seconds: 6.8, fps: 10, output: join(GIFS, '3d-k3.gif'), action: (page) => play3d(page, '#btn-start') },
  { name: '3d-codex', path: '/bundles/3d/codex/index.html?lang=en', seconds: 6.8, fps: 10, output: join(GIFS, '3d-codex.gif'), action: (page) => play3d(page, '#start-btn') },
  { name: '3d-m3', path: '/bundles/3d/minimax-m3/index.html?lang=en', seconds: 6.8, fps: 10, output: join(GIFS, '3d-m3.gif'), action: (page) => play3d(page, '#btn-start') },
  { name: 'promo-k3', path: '/bundles/promo/kimi/index.html?lang=en', seconds: 9, fps: 10, output: join(GIFS, 'promo-k3.gif'), action: (page) => playPromo(page, '[data-dir]') },
  { name: 'promo-codex', path: '/bundles/promo/codex/index.html?lang=en', seconds: 9, fps: 10, output: join(GIFS, 'promo-codex.gif'), action: (page) => playPromo(page, '[data-direction]') },
  { name: 'promo-m3', path: '/bundles/promo/minimax-m3/index.html?lang=en', seconds: 9, fps: 10, output: join(GIFS, 'promo-m3.gif'), action: (page) => playPromo(page, '[data-dir]') },
  { name: '2d-k3-physics-fail', path: '/bundles/2d/kimi/index.html?lang=en', seconds: 9.3, fps: 10, output: join(ARTICLE, '2d-k3-physics-fail.gif'), action: recordKimiPhysicsBug },
  { name: '3d-m3-hidden-enemies', path: '/bundles/3d/minimax-m3/index.html?lang=en', seconds: 8, fps: 12, output: join(ARTICLE, '3d-m3-hidden-enemies.gif'), action: recordM3HiddenEnemies },
]

const requestedNames = new Set(process.argv.slice(2))
const selectedRecordings = requestedNames.size > 0
  ? recordings.filter((recording) => requestedNames.has(recording.name))
  : recordings
if (requestedNames.size > 0 && selectedRecordings.length !== requestedNames.size) {
  throw new Error(`Unknown recording name. Available: ${recordings.map((recording) => recording.name).join(', ')}`)
}

try {
  for (const recording of selectedRecordings) await record(recording)
} finally {
  await new Promise((resolveClose) => server.close(resolveClose))
  await rm(temp, { recursive: true, force: true })
}

console.log(`Recorded ${selectedRecordings.length} English GIFs`)

async function record(config) {
  console.log(`recording ${config.name}`)
  const rawDir = join(temp, config.name)
  await mkdir(rawDir, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required'] })
  const context = await browser.newContext({
    viewport: { width: 800, height: 450 },
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
    recordVideo: { dir: rawDir, size: { width: 800, height: 450 } },
  })
  const page = await context.newPage()
  const video = page.video()
  const raw = join(temp, `${config.name}.webm`)
  try {
    await page.goto(`${base}${config.path}`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => window.__BUNDLE_LOCALE__?.language === 'en')
    await page.evaluate(() => document.fonts.ready)
    await config.action(page)
    await page.waitForTimeout(Math.ceil(config.seconds * 1000) + 600)
  } finally {
    await context.close()
    if (video) await video.saveAs(raw)
    await browser.close()
  }

  if (!video) throw new Error(`No Playwright video for ${config.name}`)
  await runFile('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-ss', '0.35', '-i', raw, '-t', String(config.seconds),
    '-vf', `fps=${config.fps},scale=800:450:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=192[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3`,
    '-loop', '0', config.output,
  ])

  const info = await stat(config.output)
  if (info.size < 50_000) throw new Error(`${config.name} GIF is unexpectedly small (${info.size} bytes)`)
  console.log(`finished ${config.name}: ${(info.size / 1_048_576).toFixed(1)} MB`)
}

async function play2d(page, startSelector) {
  await page.waitForTimeout(1_000)
  await page.locator(startSelector).click()
  await page.waitForTimeout(700)
  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('2D canvas is not visible')
  const from = { x: box.x + box.width * 0.15, y: box.y + box.height * 0.78 }
  const to = { x: box.x + box.width * 0.055, y: box.y + box.height * 0.88 }
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 18 })
  await page.mouse.up()
}

async function play3d(page, startSelector) {
  await page.waitForTimeout(1_000)
  await page.locator(startSelector).click()
  await page.waitForTimeout(700)
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(900)
  await page.keyboard.up('KeyW')
  await page.mouse.click(520, 250)
  await page.waitForTimeout(300)
  await page.mouse.click(520, 250)
}

async function playPromo(page, selector) {
  await page.waitForTimeout(1_300)
  const right = page.locator(`${selector}[data-dir="right"], ${selector}[data-direction="right"]`).first()
  const up = page.locator(`${selector}[data-dir="up"], ${selector}[data-direction="up"]`).first()
  if (await right.count()) {
    await right.click()
    await page.waitForTimeout(650)
    await up.click()
    await page.waitForTimeout(650)
    await right.click()
  }
  await page.waitForTimeout(800)
  await page.evaluate(() => window.scrollTo({ top: Math.min(window.innerHeight * 0.75, document.body.scrollHeight - window.innerHeight), behavior: 'smooth' }))
}

async function recordKimiPhysicsBug(page) {
  await page.waitForTimeout(1_000)
  await page.evaluate(() => window.__SLINGSHOT_TEST__.loadLevel(2))
}

async function recordM3HiddenEnemies(page) {
  await page.waitForTimeout(900)
  await page.locator('#btn-start').click()
  await page.waitForTimeout(500)
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(4_600)
  await page.keyboard.up('KeyW')
}

async function startStaticServer() {
  const mime = {
    '.css': 'text/css; charset=utf-8', '.gif': 'image/gif', '.html': 'text/html; charset=utf-8',
    '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.mp3': 'audio/mpeg', '.png': 'image/png',
    '.svg': 'image/svg+xml; charset=utf-8', '.woff2': 'font/woff2',
  }
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
      const relative = normalize(pathname).replace(/^[/\\]+/, '')
      let file = resolve(PUBLIC, relative)
      if (!file.startsWith(PUBLIC)) throw new Error('Path outside public root')
      const fileStat = await stat(file)
      if (fileStat.isDirectory()) file = join(file, 'index.html')
      response.writeHead(200, { 'content-type': mime[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
      createReadStream(file).pipe(response)
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('Not found')
    }
  })
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen))
  return server
}
