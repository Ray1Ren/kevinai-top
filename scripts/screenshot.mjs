#!/usr/bin/env node
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { mkdir } from 'node:fs/promises'
import { resolve as resolvePath } from 'node:path'

const PORT = Number(process.env.SCREENSHOT_PORT ?? 4173)
const BASE = `http://localhost:${PORT}`
const OUTDIR = 'screenshots'

const routes = [
  { path: '/', name: 'home', title: 'Kevin AI局' },
  { path: '/notes', name: 'notes', title: '文章与动态' },
  { path: '/lab', name: 'lab', title: '四类评测总控实验室' },
  { path: '/lab/2d', name: 'lab-2d', title: '2D 小游戏评测' },
  { path: '/lab/3d', name: 'lab-3d', title: '3D 小游戏评测' },
  { path: '/lab/promo', name: 'lab-promo', title: '宣传页 HTML 评测' },
  { path: '/lab/vision', name: 'lab-vision', title: '图片识别评测' },
  { path: '/lab/vision/review', name: 'lab-vision-review', title: '50 图视觉识别公开审阅' },
  { path: '/links', name: 'links', title: '链接' },
  { path: '/en', name: 'en-home', title: 'Kevin AI局' },
  { path: '/en/notes', name: 'en-notes', title: 'Notes & Updates' },
  { path: '/en/lab', name: 'en-lab', title: 'Evaluation Lab' },
  { path: '/en/lab/2d', name: 'en-lab-2d', title: '2D Web Game Evaluation' },
  { path: '/en/lab/3d', name: 'en-lab-3d', title: '3D Web Game Evaluation' },
  { path: '/en/lab/promo', name: 'en-lab-promo', title: 'Promotion Page Evaluation' },
  { path: '/en/lab/vision', name: 'en-lab-vision', title: 'Image Recognition Evaluation' },
  { path: '/en/lab/vision/review', name: 'en-lab-vision-review', title: '50-Image Public Review' },
  { path: '/en/links', name: 'en-links', title: 'Links' },
]

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
]

async function startServer() {
  const viteBin = resolvePath('node_modules/vite/bin/vite.js')
  let output = ''
  const child = spawn(
    process.execPath,
    [viteBin, 'preview', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'],
    { stdio: 'pipe' },
  )

  try {
    await Promise.race([
      new Promise((resolve, reject) => {
        child.once('exit', (code) => reject(new Error(`Preview server exited before ready (${code})`)))
        child.stdout.on('data', (d) => {
          output += d.toString()
          if (output.includes('Local:')) resolve(child)
        })
        child.stderr.on('data', (d) => {
          output += d.toString()
        })
      }),
      delay(10000).then(() => {
        throw new Error(`Preview server start timeout\n${output}`)
      }),
    ])
  } catch (error) {
    child.kill('SIGTERM')
    throw error
  }

  await delay(500)
  return child
}

async function main() {
  await mkdir(OUTDIR, { recursive: true })
  const server = await startServer()
  let browser
  const allErrors = []

  try {
    browser = await chromium.launch({ channel: 'chrome' })
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.name === 'mobile',
        isMobile: vp.name === 'mobile',
      })
      const page = await context.newPage()
      let currentPath = '/'

      page.on('pageerror', (err) => {
        allErrors.push({ type: 'pageerror', viewport: vp.name, path: currentPath, message: err.message })
      })
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          allErrors.push({ type: 'console.error', viewport: vp.name, path: currentPath, text: msg.text() })
        }
      })
      page.on('requestfailed', (request) => {
        allErrors.push({
          type: 'requestfailed',
          viewport: vp.name,
          path: currentPath,
          url: request.url(),
          reason: request.failure()?.errorText,
        })
      })
      page.on('response', (resp) => {
        if (resp.status() >= 400) {
          const url = resp.url()
          if (!url.endsWith('.map')) {
            allErrors.push({ type: 'http-error', viewport: vp.name, path: currentPath, status: resp.status(), url })
          }
        }
      })

      for (const route of routes) {
        currentPath = route.path
        await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle', timeout: 30000 })
        const title = await page.title()
        if (!title.includes(route.title)) {
          allErrors.push({ type: 'wrong-title', viewport: vp.name, path: route.path, title })
        }
        const bodyWidth = await page.evaluate(() =>
          Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        )
        const vpWidth = page.viewportSize().width
        if (bodyWidth > vpWidth + 2) {
          allErrors.push({ type: 'horizontal-overflow', viewport: vp.name, path: route.path, bodyWidth, vpWidth })
        }
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await delay(500)
        const screenshotPath = `${OUTDIR}/${vp.name}-${route.name}.png`
        await page.screenshot({ path: screenshotPath, fullPage: true })
        console.log(`Screenshot: ${screenshotPath}`)
      }

      await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await delay(500)
      await page.screenshot({ path: `${OUTDIR}/${vp.name}-home-reduced-motion.png`, fullPage: true })
      console.log(`Screenshot: ${OUTDIR}/${vp.name}-home-reduced-motion.png`)

      await context.close()
    }
  } finally {
    await browser?.close()
    server.kill('SIGTERM')
  }

  if (allErrors.length) {
    console.log('\nErrors detected:')
    allErrors.forEach((e) => console.log(JSON.stringify(e)))
    process.exit(1)
  }

  console.log('\nAll screenshots captured, no console/page errors')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
