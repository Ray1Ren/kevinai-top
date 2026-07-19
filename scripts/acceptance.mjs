#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, stat, mkdir } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { chromium } from 'playwright'

const ROOT = resolve(process.cwd())
const DIST = join(ROOT, 'dist')
const SCREENSHOTS = join(ROOT, 'screenshots', 'acceptance')

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

function log(message) {
  console.log(`[acceptance] ${message}`)
}

async function fileStat(path) {
  try {
    return await stat(path)
  } catch {
    return null
  }
}

async function sendFile(response, path, statusCode = 200) {
  const body = await readFile(path)
  response.writeHead(statusCode, {
    'Content-Type': mimeTypes[extname(path).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  response.end(body)
}

function createStatic404Server() {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')
      const pathname = decodeURIComponent(url.pathname)
      let target = resolve(DIST, `.${pathname}`)
      const insideDist = target === DIST || target.startsWith(`${DIST}${sep}`)
      if (!insideDist) {
        await sendFile(response, join(DIST, '404.html'), 404)
        return
      }

      let targetStat = await fileStat(target)
      if (targetStat?.isDirectory()) {
        target = join(target, 'index.html')
        targetStat = await fileStat(target)
      }

      if (targetStat?.isFile()) {
        await sendFile(response, target)
      } else {
        await sendFile(response, join(DIST, '404.html'), 404)
      }
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end(error instanceof Error ? error.message : String(error))
    }
  })
}

async function listen(server) {
  await new Promise((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  assert(address && typeof address === 'object')
  return `http://127.0.0.1:${address.port}`
}

function monitorPage(page, label, { allowDocument404 = false } = {}) {
  const issues = []
  page.on('pageerror', (error) => issues.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    // Response events below retain the exact missing URL. Chrome's generic 404
    // console line adds no signal and is also emitted for an absent favicon.
    if (/Failed to load resource:.*404/.test(message.text())) return
    issues.push(`console.error: ${message.text()}`)
  })
  page.on('requestfailed', (request) => {
    issues.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ''}`)
  })
  page.on('response', (response) => {
    if (response.status() < 400) return
    const url = new URL(response.url())
    if (url.pathname === '/favicon.ico') return
    if (allowDocument404 && response.request().resourceType() === 'document' && response.status() === 404) return
    issues.push(`http ${response.status()}: ${response.url()}`)
  })
  return () => assert.deepEqual(issues, [], `${label} emitted browser errors:\n${issues.join('\n')}`)
}

async function testStaticDeepLinks(browser, base) {
  const cases = [
    ['/lab/2d', '2D 小游戏实测'],
    ['/lab/vision', '50 图识别实测'],
    ['/links', '链接'],
    ['/notes', '文章与动态'],
    ['/notes/kimi-k3-subscription-review', 'Kimi K3 到底值不值得订阅'],
    ['/notes/ai-game-24-days', 'AI 做小游戏'],
    ['/en/lab/2d', '2D Web Game Test'],
    ['/en/articles', 'Articles'],
    ['/en/articles/kimi-k3-review', 'I tested Kimi K3'],
    ['/en/articles/ai-game-24-days', 'AI made my first game playable'],
  ]
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  await context.addInitScript(() => {
    Date.now = () => Date.parse('2026-07-19T00:01:00Z')
  })
  for (const [path, title] of cases) {
    const page = await context.newPage()
    const finishMonitoring = monitorPage(page, `deep link ${path}`, { allowDocument404: true })
    const initial = await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded' })
    assert.equal(initial?.status(), 404, `${path} must enter through a real static 404 response`)
    await page.waitForFunction(
      ({ expectedPath, expectedTitle }) =>
        window.location.pathname === expectedPath &&
        window.location.search === '' &&
        document.title.includes(expectedTitle) &&
        document.querySelector('main h1'),
      { expectedPath: path, expectedTitle: title },
      { timeout: 15000 },
    )
    finishMonitoring()
    await page.close()
    log(`static 404 deep link passed: ${path}`)
  }
  await context.close()
}

async function loadLazyArticleMedia(page) {
  let previousHeight = 0
  for (let pass = 0; pass < 8; pass += 1) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y <= height; y += 720) {
      await page.evaluate((top) => window.scrollTo(0, top), y)
      await page.waitForTimeout(70)
    }
    await page.waitForLoadState('networkidle')
    if (height === previousHeight) break
    previousHeight = height
  }
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll('article img')).every((image) => image.complete && image.naturalWidth > 0),
    undefined,
    { timeout: 15000 },
  )
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(250)
}

async function testArticleReleaseGate(browser, base) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
  await context.addInitScript(() => {
    Date.now = () => Date.parse('2026-07-18T23:59:00Z')
  })
  const page = await context.newPage()
  const finishMonitoring = monitorPage(page, 'article release gate', { allowDocument404: true })

  await page.goto(`${base}/notes`, { waitUntil: 'networkidle' })
  assert.match(await page.locator('main').innerText(), /下一篇文章，早上 8 点见/)
  assert.equal(await page.getByRole('link', { name: '阅读全文' }).count(), 0)

  await page.goto(`${base}/`, { waitUntil: 'networkidle' })
  assert.match(await page.locator('main').innerText(), /下一篇文章，早上 8 点见/)
  assert.equal(await page.getByRole('link', { name: '读第一篇文章' }).getAttribute('href'), '/notes/ai-game-24-days')

  await page.goto(`${base}/notes/kimi-k3-subscription-review`, { waitUntil: 'networkidle' })
  assert.match(await page.title(), /下一篇文章 08:00 发布/)
  const body = await page.locator('main').innerText()
  assert(!body.includes('89.8'), 'article score must stay hidden before 08:00')
  finishMonitoring()
  await context.close()
  log('article release gate passed: list and detail stay locked at 07:59')
}

async function testFirstArticle(browser, base) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  await context.addInitScript(() => {
    Date.now = () => Date.parse('2026-07-19T00:01:00Z')
  })
  const page = await context.newPage()
  const finishMonitoring = monitorPage(page, 'first bilingual article', { allowDocument404: true })

  await page.goto(`${base}/notes/kimi-k3-subscription-review`, { waitUntil: 'networkidle' })
  assert.match(await page.title(), /Kimi K3 到底值不值得订阅/)
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN')
  const zhBody = await page.locator('article').innerText()
  for (const required of ['92.6', '89.8', '77.8', '80.5', '96.0', '54.5', '91.0', '89.2', '83.6', '95.0', '85.0', '96.7', '90.0', '88.0', '49/50', '47/50', '46/50', '1 亿+', '30 亿+']) {
    assert(zhBody.includes(required), `Chinese article must include ${required}`)
  }
  assert(!zhBody.includes('tempkey'), 'Chinese article must not expose an expiring WeChat preview URL')
  assert.equal(await page.locator('img[src^="/assets/article-kimi-k3/"]').count() >= 10, true)
  const zhWidth = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth))
  assert(zhWidth <= 392, `Chinese article must not overflow a 390px viewport, got ${zhWidth}px`)
  await loadLazyArticleMedia(page)
  await page.screenshot({ path: join(SCREENSHOTS, 'article-kimi-k3-mobile.png'), fullPage: true })

  await page.goto(`${base}/en/articles/kimi-k3-review`, { waitUntil: 'networkidle' })
  assert.match(await page.title(), /I tested Kimi K3/)
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  const enBody = await page.locator('article').innerText()
  for (const required of ['92.6', '89.8', '77.8', '80.5', '96.0', '54.5', '91.0', '89.2', '83.6', '95.0', '85.0', '96.7', '90.0', '88.0', '49/50', '47/50', '46/50', '100 million-plus', '3 billion-plus']) {
    assert(enBody.includes(required), `English article must include ${required}`)
  }
  assert(!enBody.includes('tempkey'), 'English article must not expose an expiring WeChat preview URL')
  const englishImageSources = await page.locator('article img').evaluateAll((images) => images.map((image) => image.getAttribute('src') ?? ''))
  const allowedSharedImages = new Set([
    '/assets/article-kimi-k3/k3-official-benchmark.png',
    '/assets/article-kimi-k3/vision-count-snow.png',
    '/assets/article-kimi-k3/vision-count-party.png',
    '/assets/article-kimi-k3/vision-ocr.png',
    '/assets/images/qr-code.png',
  ])
  for (const src of englishImageSources) {
    assert(src.startsWith('/assets/article-kimi-k3-en/') || allowedSharedImages.has(src), `English article uses an unreviewed image: ${src}`)
  }
  const enWidth = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth))
  assert(enWidth <= 392, `English article must not overflow a 390px viewport, got ${enWidth}px`)
  await loadLazyArticleMedia(page)
  await page.screenshot({ path: join(SCREENSHOTS, 'article-kimi-k3-en-mobile.png'), fullPage: true })

  finishMonitoring()
  await context.close()
  log('first article passed: Chinese and English facts, English-only article images, SEO title, and 390px layout')
}

async function testBuildStoryArticle(browser, base) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    locale: 'zh-CN',
  })
  const page = await context.newPage()
  const finishMonitoring = monitorPage(page, 'AI game build story', { allowDocument404: true })

  await page.goto(`${base}/notes/ai-game-24-days`, { waitUntil: 'networkidle' })
  assert.match(await page.title(), /AI 做小游戏：1 天能玩，24 天上线/)
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN')
  const zhBody = await page.locator('article').innerText()
  for (const required of ['6 月 13 日', '6 月 15 日', '23 天', '500 关', '移动防线', '试听 A', 'Kevin AI局']) {
    assert(zhBody.includes(required), `Chinese build story must include ${required}`)
  }
  assert.equal(await page.locator('img[src^="/assets/first-article/zh/"]').count(), 5)
  assert.equal(await page.locator('audio').count(), 3)
  assert.equal(await page.locator('img[data-channel="web_note1"]').getAttribute('src'), '/assets/first-article/one-kick-code-ch_web_note1.png')
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://kevinai.top/notes/ai-game-24-days')
  const zhWidth = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth))
  assert(zhWidth <= 392, `Chinese build story must not overflow a 390px viewport, got ${zhWidth}px`)
  await loadLazyArticleMedia(page)
  await page.screenshot({ path: join(SCREENSHOTS, 'article-ai-game-24-days-mobile.png'), fullPage: true })

  await page.goto(`${base}/en/articles/ai-game-24-days`, { waitUntil: 'networkidle' })
  assert.match(await page.title(), /AI made my first game playable in a day/)
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  const enBody = await page.locator('article').innerText()
  for (const required of ['June 13', 'June 15', '23 days', '500 levels', 'Moving Defense', 'Voice test A', 'WeChat']) {
    assert(enBody.includes(required), `English build story must include ${required}`)
  }
  assert(enBody.includes('Read in Chinese'), 'English build story must use an English language-switch label')
  assert(!enBody.includes('中文版'), 'English build story must not expose a Chinese language-switch label')
  assert.equal(await page.locator('audio').count(), 3)
  const enImageSources = await page.locator('article img').evaluateAll((images) => images.map((image) => image.getAttribute('src') ?? ''))
  assert(enImageSources.some((src) => src.startsWith('/assets/first-article/en/')), 'English build story must use English infographic assets')
  assert(!enImageSources.some((src) => src.startsWith('/assets/first-article/zh/')), 'English build story must not use Chinese infographic assets')
  assert(enImageSources.every((src) => src.startsWith('/assets/first-article/en/') || src.startsWith('/assets/first-article/shared/') || src === '/assets/first-article/one-kick-code-ch_web_note1.png'), `English build story uses an unexpected image: ${enImageSources.join(', ')}`)
  assert.equal(await page.locator('img[data-channel="web_note1"]').getAttribute('src'), '/assets/first-article/one-kick-code-ch_web_note1.png')
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://kevinai.top/en/articles/ai-game-24-days')
  const enWidth = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth))
  assert(enWidth <= 392, `English build story must not overflow a 390px viewport, got ${enWidth}px`)
  await loadLazyArticleMedia(page)
  await page.screenshot({ path: join(SCREENSHOTS, 'article-ai-game-24-days-en-mobile.png'), fullPage: true })

  finishMonitoring()
  await context.close()
  log('AI game build story passed: bilingual facts, English infographics, audio, QR channel, SEO, and 390px layout')
}

async function testBilingualHomepage(browser, base) {
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    locale: 'zh-CN',
  })
  await mobileContext.addInitScript(() => {
    Date.now = () => Date.parse('2026-07-19T00:01:00Z')
  })
  const page = await mobileContext.newPage()
  const finishMonitoring = monitorPage(page, 'bilingual homepage', { allowDocument404: true })

  for (const [path, language, required, forbidden, screenshot] of [
    ['/', 'zh-CN', ['2026 年 6 月 13 日', '24 天后', '我以前没做过小游戏', '读第一篇文章'], ['先做出来，再谈方法', 'AI 负责多做，人负责挑对'], 'home-zh-mobile.png'],
    ['/en', 'en', ['June 13, 2026', '24 days later', 'I had never built a mini game before', 'Play One Kick inside WeChat'], ['Build it first. Then talk about the method.', 'AI makes more. I decide what stays.'], 'home-en-mobile.png'],
  ]) {
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
    assert.equal(await page.locator('html').getAttribute('lang'), language)
    const body = await page.locator('main').innerText()
    required.forEach((text) => assert(body.includes(text), `${path} homepage must include ${text}`))
    forbidden.forEach((text) => assert(!body.includes(text), `${path} homepage must remove slogan: ${text}`))
    const firstArticleLink = page.getByRole('link', { name: path === '/' ? '读第一篇文章' : 'Read the first article' })
    assert.equal(
      await firstArticleLink.getAttribute('href'),
      path === '/' ? '/notes/ai-game-24-days' : '/en/articles/ai-game-24-days',
      `${path} homepage must point to the original first article`,
    )
    const hero = page.locator('img[src="/assets/images/kevin-ai-hero.png"]')
    await hero.waitFor({ state: 'visible' })
    assert.equal(await hero.evaluate((image) => image.complete && image.naturalWidth === 1122 && image.naturalHeight === 1402), true)
    const width = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth))
    assert(width <= 392, `${path} homepage must not overflow a 390px viewport, got ${width}px`)
    await loadLazyArticleMedia(page)
    await page.screenshot({ path: join(SCREENSHOTS, screenshot), fullPage: true })
  }
  finishMonitoring()
  await mobileContext.close()

  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const desktopPage = await desktopContext.newPage()
  await desktopPage.goto(`${base}/en`, { waitUntil: 'networkidle' })
  await desktopPage.locator('img[src="/assets/images/kevin-ai-hero.png"]').waitFor({ state: 'visible' })
  await desktopPage.screenshot({ path: join(SCREENSHOTS, 'home-en-desktop.png') })
  await desktopContext.close()
  log('homepage passed: generated hero, natural bilingual copy, WeChat context, and 390px layout')
}

async function testPrimaryNavigation(browser, base) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' })
  const page = await context.newPage()
  const finishMonitoring = monitorPage(page, 'primary SPA navigation', { allowDocument404: true })
  const cases = [
    { home: '/', label: '文章', path: '/notes', heading: '把做东西的过程写下来。' },
    { home: '/', label: '实验室', path: '/lab', heading: '四项 AI 实测' },
    { home: '/', label: '链接', path: '/links', heading: 'Kevin AI局' },
    { home: '/en', label: 'Articles', path: '/en/articles', heading: 'I write after I have something to show.' },
    { home: '/en', label: 'Lab', path: '/en/lab', heading: 'Four AI tests' },
    { home: '/en', label: 'Links', path: '/en/links', heading: 'Kevin AI Observatory' },
  ]

  for (const testCase of cases) {
    await page.goto(`${base}${testCase.home}`, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => document.querySelector('canvas') && document.querySelector('.pin-spacer'))
    const header = page.getByRole('banner')
    const link = header.getByRole('link', { name: testCase.label, exact: true })
    assert.equal(await link.count(), 1, `${testCase.label} must have one primary navigation link`)
    await link.click()
    await page.waitForURL(`${base}${testCase.path}`, { timeout: 15000 })
    await page.getByRole('heading', { name: testCase.heading, exact: true }).waitFor({ state: 'visible' })
    assert.equal(await page.getByRole('banner').isVisible(), true)
    assert.equal(await page.locator('footer').isVisible(), true)
  }

  finishMonitoring()
  await context.close()
  log('primary navigation passed: every Chinese and English tab survived the animated homepage teardown')
}

async function testAutomaticLanguagePreference(browser, base) {
  const englishContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
  })
  const englishPage = await englishContext.newPage()
  const finishEnglishMonitoring = monitorPage(englishPage, 'automatic English language preference')
  await englishPage.goto(`${base}/`, { waitUntil: 'networkidle' })
  await englishPage.waitForURL(`${base}/en`)
  assert.equal(await englishPage.locator('html').getAttribute('lang'), 'en')
  assert.equal(await englishPage.evaluate(() => localStorage.getItem('kevinai.locale')), null, 'automatic detection must not become a permanent preference')

  await englishPage.getByRole('link', { name: '切换到中文版' }).click()
  await englishPage.waitForURL(`${base}/`)
  assert.equal(await englishPage.locator('html').getAttribute('lang'), 'zh-CN')
  assert.equal(await englishPage.evaluate(() => localStorage.getItem('kevinai.locale')), 'zh')
  await englishPage.reload({ waitUntil: 'networkidle' })
  assert.equal(englishPage.url(), `${base}/`, 'manual Chinese preference must survive reload on an English browser')
  assert.equal(await englishPage.locator('html').getAttribute('lang'), 'zh-CN')
  finishEnglishMonitoring()
  await englishContext.close()

  const chineseContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'zh-CN',
  })
  const chinesePage = await chineseContext.newPage()
  const finishChineseMonitoring = monitorPage(chinesePage, 'automatic Chinese language preference')
  await chinesePage.goto(`${base}/`, { waitUntil: 'networkidle' })
  assert.equal(chinesePage.url(), `${base}/`)
  assert.equal(await chinesePage.locator('html').getAttribute('lang'), 'zh-CN')
  assert.equal(await chinesePage.evaluate(() => localStorage.getItem('kevinai.locale')), null, 'automatic detection must not become a permanent preference')
  finishChineseMonitoring()
  await chineseContext.close()

  const deepLinkContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
  })
  const deepLinkPage = await deepLinkContext.newPage()
  const finishDeepLinkMonitoring = monitorPage(deepLinkPage, 'locale-specific deep links', { allowDocument404: true })
  await deepLinkPage.goto(`${base}/lab/2d`, { waitUntil: 'networkidle' })
  assert.equal(new URL(deepLinkPage.url()).pathname, '/lab/2d', 'an explicit Chinese deep link must not be rewritten')
  assert.equal(await deepLinkPage.locator('html').getAttribute('lang'), 'zh-CN')
  await deepLinkPage.goto(`${base}/en/lab/2d`, { waitUntil: 'networkidle' })
  assert.equal(new URL(deepLinkPage.url()).pathname, '/en/lab/2d', 'an explicit English deep link must not be rewritten')
  assert.equal(await deepLinkPage.locator('html').getAttribute('lang'), 'en')
  finishDeepLinkMonitoring()
  await deepLinkContext.close()
  log('language preference passed: browser default, explicit routes, and manual override persistence')
}

const bundleKinds = {
  '2d': { files: ['index.html', 'styles.css', 'game.js'], ready: 'canvas' },
  '3d': { files: ['index.html', 'styles.css', 'game.js', 'vendor/three.min.js'], ready: 'canvas' },
  promo: { files: ['index.html', 'styles.css', 'app.js'], ready: 'main' },
}

async function testBundleMimeAndLoad(browser, base) {
  for (const [kind, config] of Object.entries(bundleKinds)) {
    for (const model of ['kimi', 'codex', 'minimax-m3']) {
      const prefix = `${base}/bundles/${kind}/${model}`
      for (const file of config.files) {
        const response = await fetch(`${prefix}/${file}`)
        assert.equal(response.status, 200, `${kind}/${model}/${file} must return 200`)
        const type = response.headers.get('content-type') ?? ''
        if (file.endsWith('.css')) assert.match(type, /^text\/css/, `${file} has wrong MIME: ${type}`)
        if (file.endsWith('.js')) assert.match(type, /javascript/, `${file} has wrong MIME: ${type}`)
        if (file.endsWith('.html')) assert.match(type, /^text\/html/, `${file} has wrong MIME: ${type}`)
      }

      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
      const page = await context.newPage()
      const finishMonitoring = monitorPage(page, `${kind}/${model}`)
      await page.goto(`${prefix}/`, { waitUntil: 'networkidle', timeout: 30000 })
      await page.locator(config.ready).first().waitFor({ state: 'visible', timeout: 15000 })
      assert.notEqual((await page.title()).trim(), '', `${kind}/${model} must have a document title`)
      finishMonitoring()
      await context.close()
      log(`bundle load and MIME passed: ${kind}/${model}`)
    }
  }
}

async function test2DInteraction(browser, base) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const finishMonitoring = monitorPage(page, '2D interaction')
  await page.goto(`${base}/bundles/2d/codex/`, { waitUntil: 'networkidle' })
  await page.locator('#startButton').click()
  await page.waitForFunction(() => document.querySelector('#startOverlay')?.classList.contains('hidden'))
  const initialShots = await page.locator('#shotsValue').innerText()
  const box = await page.locator('#gameCanvas').boundingBox()
  assert(box, '2D canvas must have a bounding box')
  const startX = box.x + (178 / 1280) * box.width
  const startY = box.y + (503 / 720) * box.height
  const endX = box.x + (90 / 1280) * box.width
  const endY = box.y + (560 / 720) * box.height
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(endX, endY, { steps: 8 })
  await page.mouse.up()
  await page.waitForFunction((before) => document.querySelector('#shotsValue')?.textContent !== before, initialShots)
  await page.keyboard.press('Space')
  await page.locator('#pauseButton').click()
  await page.waitForFunction(() => !document.querySelector('#pauseOverlay')?.classList.contains('hidden'))
  await page.screenshot({ path: join(SCREENSHOTS, '2d-fired-and-paused.png') })
  finishMonitoring()
  await context.close()
  log('2D operation passed: start, drag, launch, ability, pause')
}

async function test3DInteraction(browser, base) {
  const context = await browser.newContext({
    viewport: { width: 900, height: 700 },
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  const finishMonitoring = monitorPage(page, '3D interaction')
  await page.goto(`${base}/bundles/3d/codex/`, { waitUntil: 'networkidle' })
  await page.locator('#start-btn').click()
  await page.locator('#hud').waitFor({ state: 'visible' })
  const before = await page.evaluate(() => window.__BREACH_TEST__.snapshot().player)
  await page.keyboard.down('KeyW')
  await page.waitForTimeout(350)
  await page.keyboard.up('KeyW')
  const after = await page.evaluate(() => window.__BREACH_TEST__.snapshot().player)
  assert(Math.hypot(after.x - before.x, after.z - before.z) > 0.05, '3D player must move after W input')
  await page.locator('#pause-btn').click()
  await page.locator('#pause-panel').waitFor({ state: 'visible' })
  await page.screenshot({ path: join(SCREENSHOTS, '3d-moved-and-paused.png') })
  finishMonitoring()
  await context.close()
  log('3D operation passed: start, move, pause')
}

async function testM3DesktopShooting(browser, base) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  const finishMonitoring = monitorPage(page, 'MiniMax M3 desktop shooting')
  await page.goto(`${base}/bundles/3d/minimax-m3/`, { waitUntil: 'networkidle' })
  await page.locator('#btn-start').click()
  await page.waitForFunction(() => window.__BREACH_TEST__?.snapshot?.().phase === 'playing')

  const before = await page.evaluate(() => window.__BREACH_TEST__.snapshot())
  const canvas = page.locator('#gl')
  const canvasBox = await canvas.boundingBox()
  assert(canvasBox, 'MiniMax M3 canvas must have a bounding box')
  await canvas.click({ position: { x: canvasBox.width / 2, y: canvasBox.height / 2 } })
  await page.waitForFunction(
    ({ ammo, shots }) => {
      const snapshot = window.__BREACH_TEST__.snapshot()
      return snapshot.player.ammo < ammo && snapshot.stats.shots > shots
    },
    { ammo: before.player.ammo, shots: before.stats.shots },
  )
  const after = await page.evaluate(() => window.__BREACH_TEST__.snapshot())
  assert.equal(after.player.ammo, before.player.ammo - 1, 'desktop mouse click must consume one round')
  assert.equal(after.stats.shots, before.stats.shots + 1, 'desktop mouse click must register one shot')
  await page.screenshot({ path: join(SCREENSHOTS, '3d-m3-desktop-shot.png') })
  finishMonitoring()
  await context.close()
  log('MiniMax M3 desktop shooting passed: real mouse click consumed one round')
}

async function testM3MobileShooting(browser, base) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  })
  const page = await context.newPage()
  const finishMonitoring = monitorPage(page, 'MiniMax M3 mobile shooting')
  await page.goto(`${base}/bundles/3d/minimax-m3/`, { waitUntil: 'networkidle' })
  await page.locator('#btn-start').click()
  await page.waitForFunction(() => window.__BREACH_TEST__?.snapshot?.().phase === 'playing')

  const fireButton = page.locator('#touch-fire')
  await fireButton.waitFor({ state: 'visible' })
  const beforeMouse = await page.evaluate(() => window.__BREACH_TEST__.snapshot())
  await fireButton.click()
  await page.waitForFunction(
    ({ ammo, shots }) => {
      const snapshot = window.__BREACH_TEST__.snapshot()
      return snapshot.player.ammo < ammo && snapshot.stats.shots > shots
    },
    { ammo: beforeMouse.player.ammo, shots: beforeMouse.stats.shots },
  )
  const afterMouse = await page.evaluate(() => window.__BREACH_TEST__.snapshot())
  assert.equal(afterMouse.player.ammo, beforeMouse.player.ammo - 1, 'mobile FIRE mouse click must consume one round')
  assert.equal(afterMouse.stats.shots, beforeMouse.stats.shots + 1, 'mobile FIRE mouse click must register one shot')

  const fireBox = await fireButton.boundingBox()
  assert(fireBox, 'mobile FIRE button must have a bounding box')
  await page.waitForTimeout(250)
  await page.touchscreen.tap(fireBox.x + fireBox.width / 2, fireBox.y + fireBox.height / 2)
  await page.waitForFunction(
    ({ ammo, shots }) => {
      const snapshot = window.__BREACH_TEST__.snapshot()
      return snapshot.player.ammo < ammo && snapshot.stats.shots > shots
    },
    { ammo: afterMouse.player.ammo, shots: afterMouse.stats.shots },
  )
  const afterTouch = await page.evaluate(() => window.__BREACH_TEST__.snapshot())
  assert.equal(afterTouch.player.ammo, afterMouse.player.ammo - 1, 'mobile FIRE touch tap must consume one round')
  assert.equal(afterTouch.stats.shots, afterMouse.stats.shots + 1, 'mobile FIRE touch tap must register one shot')
  await page.screenshot({ path: join(SCREENSHOTS, '3d-m3-mobile-shot.png') })
  finishMonitoring()
  await context.close()
  log('MiniMax M3 mobile shooting passed: mouse click and touch tap each consumed one round')
}

async function testPromoInteraction(browser, base) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const finishMonitoring = monitorPage(page, 'promotion page interaction')
  await page.goto(`${base}/bundles/promo/codex/`, { waitUntil: 'networkidle' })

  for (const [index, direction] of ['right', 'up', 'right'].entries()) {
    await page.locator(`[data-direction="${direction}"]`).click()
    await page.waitForFunction((expectedMoves) => {
      const phase = window.__ONEKICK_TEST__.snapshot().phase
      const moves = Number(document.querySelector('#move-count')?.textContent ?? '-1')
      return moves === expectedMoves && (phase === 'ready' || phase === 'won')
    }, index + 1)
  }
  await page.waitForTimeout(600)

  assert.equal(await page.locator('#move-count').innerText(), '3')
  assert.equal(await page.locator('#victory-panel').getAttribute('aria-hidden'), 'false')
  assert.match(await page.locator('#demo-status').innerText(), /进球|晋级/)
  await page.screenshot({ path: join(SCREENSHOTS, 'promo-three-move-win.png') })
  finishMonitoring()
  await context.close()
  log('promotion page operation passed: right, up, right, victory')
}

async function assertNoChineseInterface(page, label) {
  const leaks = await page.evaluate(() => {
    const chinese = /[\u3400-\u9fff]/u
    const text = document.body.innerText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => chinese.test(line))
    const attributes = Array.from(document.querySelectorAll('[aria-label], [title], [alt], [placeholder]'))
      .flatMap((element) => ['aria-label', 'title', 'alt', 'placeholder'].map((name) => ({
        name,
        value: element.getAttribute(name) ?? '',
      })))
      .filter((item) => chinese.test(item.value))
    return { text, attributes }
  })
  assert.deepEqual(leaks, { text: [], attributes: [] }, `${label} must not expose Chinese UI copy`)
}

async function testEnglishBundleLocalization(browser, base) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    locale: 'en-US',
  })
  const page = await context.newPage()
  const finishMonitoring = monitorPage(page, 'English playable bundles')

  for (const [kind, config] of Object.entries(bundleKinds)) {
    for (const model of ['kimi', 'codex', 'minimax-m3']) {
      const label = `${kind}/${model}`
      await page.goto(`${base}/bundles/${label}/?lang=en`, { waitUntil: 'networkidle', timeout: 30000 })
      await page.locator(config.ready).first().waitFor({ state: 'visible', timeout: 15000 })
      await page.waitForFunction(() => document.documentElement.lang === 'en')
      assert(!/[\u3400-\u9fff]/u.test(await page.title()), `${label} title must be English`)
      await assertNoChineseInterface(page, `${label} initial screen`)
      const width = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth))
      assert(width <= 392, `${label} must not overflow a 390px portrait viewport, got ${width}px`)
    }
  }

  await page.goto(`${base}/bundles/promo/codex/?lang=en`, { waitUntil: 'networkidle' })
  for (const [index, direction] of ['right', 'up', 'right'].entries()) {
    await page.locator(`[data-direction="${direction}"]`).click()
    await page.waitForFunction((expectedMoves) => {
      const phase = window.__ONEKICK_TEST__.snapshot().phase
      const moves = Number(document.querySelector('#move-count')?.textContent ?? '-1')
      return moves === expectedMoves && (phase === 'ready' || phase === 'won')
    }, index + 1)
  }
  await page.waitForTimeout(600)
  assert.match(await page.locator('#demo-status').innerText(), /Goal|clear|promot/i)
  await assertNoChineseInterface(page, 'English promotion win state')
  const mobileWinLayout = await page.evaluate(() => ({
    scrollX: window.scrollX,
    heroScrollLeft: document.querySelector('.hero')?.scrollLeft ?? -1,
    pageWidth: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    consoleRect: (() => {
      const rect = document.querySelector('.demo-console')?.getBoundingClientRect()
      return rect ? { left: rect.left, right: rect.right } : null
    })(),
  }))
  assert.equal(mobileWinLayout.scrollX, 0, 'English promotion page must not drift horizontally after touch controls')
  assert.equal(mobileWinLayout.heroScrollLeft, 0, 'English promotion hero must not become a hidden horizontal scroll container')
  assert(mobileWinLayout.pageWidth <= 392, `English promotion page must fit a 390px viewport, got ${mobileWinLayout.pageWidth}px`)
  assert(mobileWinLayout.consoleRect && mobileWinLayout.consoleRect.left >= 0 && mobileWinLayout.consoleRect.right <= 390, 'English promotion console must stay fully inside the portrait viewport')
  await page.screenshot({ path: join(SCREENSHOTS, 'promo-codex-en-mobile-win.png') })
  finishMonitoring()
  await context.close()
  log('English bundles passed: nine initial screens and the dynamic promotion win state')
}

async function testPublishedBenchmarkScores(browser, base) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  const finishMonitoring = monitorPage(page, 'published benchmark scores', { allowDocument404: true })
  const expectedByPage = {
    '/lab/2d': { kimi: '80.5', codex: '96.0', minimax: '54.5' },
    '/lab/3d': { kimi: '91.0', codex: '89.2', minimax: '83.6' },
    '/lab/promo': { kimi: '91.0', codex: '95.0', minimax: '85.0' },
    '/lab/vision': { kimi: '96.7', codex: '90.0', minimax: '88.0' },
  }

  for (const [path, expected] of Object.entries(expectedByPage)) {
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
    for (const [model, score] of Object.entries(expected)) {
      const card = page.locator(`[data-model-result="${model}"]`)
      assert.equal(await card.getAttribute('data-score-key'), 'score')
      assert.equal(await card.locator('[data-model-score]').innerText(), score)
    }
    const pageText = await page.locator('main').innerText()
    assert(!/含速度综合分|speed-inclusive composite/i.test(pageText), `${path} must not show a speed-inclusive score`)
  }

  await page.goto(`${base}/lab`, { waitUntil: 'networkidle' })
  const totalRow = page.locator('tr').filter({ hasText: /四项等权总分/ })
  assert.match(await totalRow.innerText(), /89\.8/)
  assert.match(await totalRow.innerText(), /92\.6/)
  assert.match(await totalRow.innerText(), /77\.8/)
  finishMonitoring()
  await context.close()
  log('published benchmark scores passed: four detail pages and equal-weight total match the public-account article')
}

async function testVisionReview(browser, base) {
  const vision = await fetch(`${base}/data/vision-cases.json`).then((response) => response.json())
  assert.equal(vision.cases.length, 50)
  const category = '日常物体'
  const difficulty = 'easy'
  const k3Misses = vision.cases.filter((item) => !item.results.kimi.correct).length
  const expectedIntersection = vision.cases.filter(
    (item) => item.category === category && item.difficulty === difficulty,
  ).length

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  const finishMonitoring = monitorPage(page, 'vision review interaction', { allowDocument404: true })
  await page.goto(`${base}/lab/vision`, { waitUntil: 'networkidle' })
  const cards = page.locator('article[data-case-id]')
  await cards.first().waitFor({ state: 'visible' })
  assert.equal(await cards.count(), 50)

  await page.locator('button[data-result-filter="wrong:kimi"]').click()
  assert.equal(await cards.count(), k3Misses)
  await page.locator('button[data-result-filter="all"]').click()
  assert.equal(await cards.count(), 50)

  await page.locator('#category').selectOption(category)
  assert.equal(await cards.count(), 5)
  await page.locator('#difficulty').selectOption(difficulty)
  assert.equal(await cards.count(), expectedIntersection)
  assert(expectedIntersection > 0, 'chosen category/difficulty intersection must not be empty')
  assert.match(await page.locator('body').innerText(), /Kimi K3/)
  assert.match(await cards.first().innerText(), /K3/)
  assert.match(await cards.first().innerText(), /Codex/)
  assert.match(await cards.first().innerText(), /M3/)
  const body = await page.locator('body').innerText()
  const localHomePathMarker = ['/', 'Users', '/'].join('')
  assert(!body.includes(localHomePathMarker))
  const hrefs = await page.locator('a').evaluateAll((links) =>
    links.map((link) => link.getAttribute('href') ?? ''),
  )
  assert(!hrefs.some((href) => /stdout|stderr|\/raw\/|\.jsonl/i.test(href)))
  await page.screenshot({ path: join(SCREENSHOTS, 'vision-filter-expanded.png'), fullPage: true })

  await page.goto(`${base}/en/lab/vision/review`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  assert.equal(await page.locator('article[data-case-id]').count(), 50)
  assert.match(await page.locator('body').innerText(), /translated for this edition/)
  const firstEnglishCase = page.locator('article[data-case-id="V001"]')
  await firstEnglishCase.waitFor({ state: 'visible' })
  const firstEnglishCaseText = await firstEnglishCase.innerText()
  assert.match(firstEnglishCaseText, /What piece of sports equipment is under the child’s feet\?/)
  for (const option of ['Snowboard', 'Surfboard', 'Sled', 'Skateboard']) {
    assert(firstEnglishCaseText.includes(option), `V001 must include English option ${option}`)
  }
  assert(!/[\u3400-\u9fff]/u.test(firstEnglishCaseText), 'V001 card must not contain Chinese UI copy')
  finishMonitoring()
  await context.close()
  log('vision review passed: 50 direct results, filters, and fully translated English question cards')
}

async function testEmbeddedPlayableBuilds(browser, base) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  const finishMonitoring = monitorPage(page, 'embedded playable builds', { allowDocument404: true })

  await page.goto(`${base}/lab/2d`, { waitUntil: 'networkidle' })
  const frame = page.locator('iframe[data-playable-frame]')
  await frame.waitFor({ state: 'visible' })
  assert.equal(await frame.getAttribute('src'), '/bundles/2d/codex/')
  await page.locator('button[data-playable-id="kimi"]').click()
  assert.equal(await frame.getAttribute('src'), '/bundles/2d/kimi/')

  await page.goto(`${base}/lab/3d`, { waitUntil: 'networkidle' })
  await frame.waitFor({ state: 'visible' })
  assert.equal(await frame.getAttribute('src'), '/bundles/3d/kimi/')
  await page.locator('button[data-playable-id="minimax"]').click()
  assert.equal(await frame.getAttribute('src'), '/bundles/3d/minimax-m3/')

  await page.goto(`${base}/en/lab/2d`, { waitUntil: 'networkidle' })
  await frame.waitFor({ state: 'visible' })
  assert.equal(await frame.getAttribute('src'), '/bundles/2d/codex/?lang=en')
  await page.locator('button[data-playable-id="kimi"]').click()
  assert.equal(await frame.getAttribute('src'), '/bundles/2d/kimi/?lang=en')

  await page.goto(`${base}/en/lab/3d`, { waitUntil: 'networkidle' })
  await frame.waitFor({ state: 'visible' })
  assert.equal(await frame.getAttribute('src'), '/bundles/3d/kimi/?lang=en')
  await page.locator('button[data-playable-id="minimax"]').click()
  assert.equal(await frame.getAttribute('src'), '/bundles/3d/minimax-m3/?lang=en')
  finishMonitoring()
  await context.close()
  log('embedded playable builds passed: Chinese and English 2D/3D model switching')
}

async function testMotionModes(browser, base) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' })
  const page = await context.newPage()
  const finishMonitoring = monitorPage(page, 'motion controls')
  await page.goto(`${base}/`, { waitUntil: 'networkidle' })
  await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForFunction(() => document.querySelector('.pin-spacer'))

  const scrollTarget = await page.evaluate(() => {
    const spacer = document.querySelector('.pin-spacer')
    if (!spacer) return 0
    const rect = spacer.getBoundingClientRect()
    const top = rect.top + window.scrollY
    return top + (rect.height - window.innerHeight) * 0.88
  })
  await page.evaluate((y) => window.scrollTo(0, y), scrollTarget)
  await page.waitForTimeout(800)
  const proofOpacity = await page.locator('.narrative-proof').evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).opacity),
  )
  assert(proofOpacity > 0.65, `GSAP final product proof should be visible, got opacity ${proofOpacity}`)
  await page.screenshot({ path: join(SCREENSHOTS, 'gsap-final-work-phase.png') })

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: '暂停动效' }).click()
  await page.waitForFunction(() => document.body.hasAttribute('data-motion-paused'))
  await page.waitForFunction(() => !document.querySelector('canvas') && !document.querySelector('.pin-spacer'))
  const playState = await page.locator('.animate-pulse-slow').evaluate((element) =>
    getComputedStyle(element).animationPlayState,
  )
  assert.equal(playState, 'paused')
  await page.screenshot({ path: join(SCREENSHOTS, 'manual-motion-paused.png') })

  await page.getByRole('button', { name: '开启动效' }).click()
  await page.locator('canvas').first().waitFor({ state: 'visible', timeout: 15000 })
  await page.waitForFunction(() => document.querySelector('.pin-spacer'))
  finishMonitoring()
  await context.close()

  const reducedContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
    locale: 'zh-CN',
  })
  const reducedPage = await reducedContext.newPage()
  await reducedPage.goto(`${base}/`, { waitUntil: 'networkidle' })
  await reducedPage.waitForFunction(() => !document.querySelector('canvas') && !document.querySelector('.pin-spacer'))
  assert.equal(await reducedPage.locator('h3').filter({ hasText: /能玩了|上线了|还在改/ }).count(), 3)
  await reducedContext.close()

  const coarseContext = await browser.newContext({
    viewport: { width: 700, height: 900 },
    hasTouch: true,
    isMobile: true,
    locale: 'zh-CN',
  })
  const coarsePage = await coarseContext.newPage()
  await coarsePage.goto(`${base}/`, { waitUntil: 'networkidle' })
  await coarsePage.waitForFunction(() => !document.querySelector('canvas') && !document.querySelector('.pin-spacer'))
  await coarseContext.close()
  log('motion modes passed: GSAP final phase, manual pause, reduced motion, coarse pointer')
}

async function testQrKeyboardAndLocale(browser, base) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'zh-CN' })
  const page = await context.newPage()
  const finishMonitoring = monitorPage(page, 'QR and locale controls', { allowDocument404: true })

  for (const path of ['/', '/links']) {
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
    const trigger = page.locator('button[aria-haspopup="dialog"]')
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()
    await page.getByRole('dialog').waitFor({ state: 'visible' })
    await page.waitForFunction(
      () => document.activeElement?.getAttribute('aria-label') === '关闭小程序码预览',
    )
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), '关闭小程序码预览')
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'detached' })
    assert(await trigger.evaluate((element) => element === document.activeElement), `${path} QR trigger must regain focus`)
  }

  await page.goto(`${base}/en/lab/2d`, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('html').getAttribute('lang'), 'en')
  const alternate = page.locator('link[rel="alternate"][hreflang="zh-CN"]')
  assert.equal(await alternate.getAttribute('href'), 'https://kevinai.top/lab/2d')
  await page.getByRole('link', { name: '切换到中文版' }).click()
  await page.waitForURL(`${base}/lab/2d`)
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-CN')
  finishMonitoring()
  await context.close()
  log('QR keyboard and bilingual route switching passed')
}

async function main() {
  await mkdir(SCREENSHOTS, { recursive: true })
  const server = createStatic404Server()
  const base = await listen(server)
  let browser

  try {
    browser = await chromium.launch({ channel: 'chrome' })
    await testPrimaryNavigation(browser, base)
    await testStaticDeepLinks(browser, base)
    await testArticleReleaseGate(browser, base)
    await testFirstArticle(browser, base)
    await testBuildStoryArticle(browser, base)
    await testBilingualHomepage(browser, base)
    await testAutomaticLanguagePreference(browser, base)
    await testBundleMimeAndLoad(browser, base)
    await test2DInteraction(browser, base)
    await test3DInteraction(browser, base)
    await testM3DesktopShooting(browser, base)
    await testM3MobileShooting(browser, base)
    await testPromoInteraction(browser, base)
    await testEnglishBundleLocalization(browser, base)
    await testPublishedBenchmarkScores(browser, base)
    await testVisionReview(browser, base)
    await testEmbeddedPlayableBuilds(browser, base)
    await testMotionModes(browser, base)
    await testQrKeyboardAndLocale(browser, base)
    log('all interactive acceptance checks passed')
  } finally {
    await browser?.close()
    await new Promise((resolveClose) => server.close(resolveClose))
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
