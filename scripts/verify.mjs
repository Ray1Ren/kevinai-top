#!/usr/bin/env node
import { readFile, readdir, stat } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = resolve(process.cwd())
const PUBLIC = join(ROOT, 'public')
const SRC = join(ROOT, 'src')
const DIST = join(ROOT, 'dist')
const BUNDLES = join(PUBLIC, 'bundles')

const REQUIRED_PUBLIC_ASSETS = [
  'assets/images/kevin-avatar.png',
  'assets/images/kevin-ai-hero.png',
  'assets/images/qr-code.png',
  'assets/images/og-image.png',
  'assets/images/apple-touch-icon.png',
  'assets/images/game-home.png',
  'assets/images/game-level-100.png',
  'assets/images/game-rank.png',
  'assets/images/game-promotion.png',
  'assets/images/game-animal-event.png',
  'assets/images/game-reward-bank.png',
  'assets/images/image-recognition-dataset-1.jpg',
  'assets/images/image-recognition-dataset-2.jpg',
  'assets/article-kimi-k3/duration.png',
  'assets/article-kimi-k3/overall-total.png',
  'assets/article-kimi-k3/overall-detail.png',
  'assets/article-kimi-k3/2d-total.png',
  'assets/article-kimi-k3/2d-detail.png',
  'assets/article-kimi-k3/2d-k3-physics-fail.gif',
  'assets/article-kimi-k3/3d-total.png',
  'assets/article-kimi-k3/3d-m3-hidden-enemies.gif',
  'assets/article-kimi-k3/web-total.png',
  'assets/article-kimi-k3/web-detail.png',
  'assets/article-kimi-k3/vision-total.png',
  'assets/article-kimi-k3/vision-detail.png',
  'assets/article-kimi-k3/vision-count-snow.png',
  'assets/article-kimi-k3/vision-count-party.png',
  'assets/article-kimi-k3/vision-arrow.png',
  'assets/article-kimi-k3/vision-ocr.png',
  'assets/article-kimi-k3/token-total.png',
  'assets/article-kimi-k3/token-detail.png',
  'assets/article-kimi-k3/codex-token-usage.png',
  'assets/article-kimi-k3/codex-week-quota.png',
  'assets/article-kimi-k3/kimi-token-ledger.png',
  'assets/article-kimi-k3/kimi-week-quota.png',
  'assets/article-kimi-k3/k3-official-benchmark.png',
  'assets/article-kimi-k3-en/2d-kimi-scene.png',
  'assets/article-kimi-k3-en/2d-codex-scene.png',
  'assets/article-kimi-k3-en/2d-minimax-scene.png',
  'assets/article-kimi-k3-en/3d-kimi-scene.png',
  'assets/article-kimi-k3-en/3d-codex-scene.png',
  'assets/article-kimi-k3-en/3d-minimax-scene.png',
  'assets/article-kimi-k3-en/duration.png',
  'assets/article-kimi-k3-en/overall-total.png',
  'assets/article-kimi-k3-en/overall-detail.png',
  'assets/article-kimi-k3-en/2d-total.png',
  'assets/article-kimi-k3-en/2d-detail.png',
  'assets/article-kimi-k3-en/2d-k3-physics-fail.gif',
  'assets/article-kimi-k3-en/3d-total.png',
  'assets/article-kimi-k3-en/3d-m3-hidden-enemies.gif',
  'assets/article-kimi-k3-en/web-total.png',
  'assets/article-kimi-k3-en/web-detail.png',
  'assets/article-kimi-k3-en/vision-total.png',
  'assets/article-kimi-k3-en/vision-detail.png',
  'assets/article-kimi-k3-en/vision-count-snow.png',
  'assets/article-kimi-k3-en/vision-count-party.png',
  'assets/article-kimi-k3-en/vision-arrow.png',
  'assets/article-kimi-k3-en/vision-ocr.png',
  'assets/article-kimi-k3-en/token-total.png',
  'assets/article-kimi-k3-en/token-detail.png',
  'assets/article-kimi-k3-en/codex-token-usage.png',
  'assets/article-kimi-k3-en/codex-week-quota.png',
  'assets/article-kimi-k3-en/kimi-token-ledger.png',
  'assets/article-kimi-k3-en/kimi-week-quota.png',
  'assets/article-kimi-k3-en/k3-official-benchmark.png',
  'assets/article-kimi-k3-en/vision-arrow-crop.png',
  'assets/article-kimi-k3-en/og-kimi-k3-review.png',
  'assets/first-article/one-kick-code-ch_web_note1.png',
  'assets/first-article/zh/timeline-zh.png',
  'assets/first-article/zh/comparison-zh.png',
  'assets/first-article/zh/seven-demos-zh.png',
  'assets/first-article/zh/ai-judgment-zh.png',
  'assets/first-article/zh/levels-zh.png',
  'assets/first-article/zh/og-ai-game-24-days-zh.png',
  'assets/first-article/en/timeline-en.png',
  'assets/first-article/en/comparison-en.png',
  'assets/first-article/en/seven-demos-en.png',
  'assets/first-article/en/ai-judgment-en.png',
  'assets/first-article/en/levels-en.png',
  'assets/first-article/en/og-ai-game-24-days-en.png',
  'assets/first-article/shared/game-home.png',
  'assets/first-article/shared/level-100.png',
  'assets/first-article/shared/global-rank.png',
  'assets/first-article/shared/rank-promotion.png',
  'assets/first-article/shared/animal-event.png',
  'assets/first-article/shared/reward-bank.png',
  'assets/first-article/shared/voice-a.mp3',
  'assets/first-article/shared/voice-b.mp3',
  'assets/first-article/shared/voice-c.mp3',
  'assets/gifs/2d-k3.gif',
  'assets/gifs/2d-codex.gif',
  'assets/gifs/2d-m3.gif',
  'assets/gifs/3d-k3.gif',
  'assets/gifs/3d-codex.gif',
  'assets/gifs/3d-m3.gif',
  'assets/gifs/promo-k3.gif',
  'assets/gifs/promo-codex.gif',
  'assets/gifs/promo-m3.gif',
  'assets/gifs-en/2d-k3.gif',
  'assets/gifs-en/2d-codex.gif',
  'assets/gifs-en/2d-m3.gif',
  'assets/gifs-en/3d-k3.gif',
  'assets/gifs-en/3d-codex.gif',
  'assets/gifs-en/3d-m3.gif',
  'assets/gifs-en/promo-k3.gif',
  'assets/gifs-en/promo-codex.gif',
  'assets/gifs-en/promo-m3.gif',
  'data/benchmarks.json',
  'data/benchmarks.en.json',
  'data/vision-cases.json',
  'evidence/prompts/2d.txt',
  'evidence/prompts/3d.txt',
  'evidence/prompts/promo.txt',
  'evidence/prompts/vision.txt',
  'bundles/i18n.js',
  'favicon.svg',
  'CNAME',
  'robots.txt',
  'sitemap.xml',
]

const BUNDLE_ALLOWLIST = {
  '2d': new Set(['index.html', 'styles.css', 'game.js']),
  '3d': new Set(['index.html', 'styles.css', 'game.js', 'vendor/three.min.js']),
  'promo': new Set(['index.html', 'styles.css', 'app.js']),
}
const BUNDLE_REQUIRED = {
  '2d': ['index.html', 'styles.css', 'game.js'],
  '3d': ['index.html', 'styles.css', 'game.js', 'vendor/three.min.js'],
  'promo': ['index.html', 'styles.css', 'app.js'],
}

const SHARED_BASE_ROUTES = ['/', '/lab', '/lab/2d', '/lab/3d', '/lab/promo', '/lab/vision', '/lab/vision/review', '/lab/model-price-benchmark', '/links']
const CHINESE_ARTICLE_ROUTES = ['/notes', '/notes/kimi-k3-subscription-review', '/notes/ai-game-24-days']
const ENGLISH_ARTICLE_ROUTES = ['/en/articles', '/en/articles/kimi-k3-review', '/en/articles/ai-game-24-days']
const LEGACY_ENGLISH_ARTICLE_ROUTES = ['/en/notes', '/en/notes/kimi-k3-subscription-review']
const SITEMAP_ROUTES = [
  ...SHARED_BASE_ROUTES,
  ...CHINESE_ARTICLE_ROUTES,
  ...SHARED_BASE_ROUTES.map((route) => (route === '/' ? '/en' : `/en${route}`)),
  ...ENGLISH_ARTICLE_ROUTES,
]
const ROUTES = [...SITEMAP_ROUTES, ...LEGACY_ENGLISH_ARTICLE_ROUTES]

const BAD_EXTENSIONS = ['.jsonl', '.stderr', '.stdout', '.log']
const PUBLIC_BAD_SUBSTRINGS = [
  '晋级之路',
  'mkqpZv3fsCcnlpQu2tGM1A',
  'runs/',
  'runs/formal-',
  'runs/hard-retest',
  'runs/extension',
  'raw/',
  'raw/kimi',
  'raw/codex',
  'raw/m3',
]
const CANDIDATE_BAD_SUBSTRINGS = ['/Users/', 'mkqpZv3fsCcnlpQu2tGM1A']
const BAD_DOMAINS = [
  'unsplash',
  'picsum',
  'placeholder',
  'placehold',
  'via.placeholder',
  'lorem.space',
  'dummyimage',
]
const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
])
const VERIFY_SCRIPT = 'scripts/verify.mjs'

const errors = []
const warnings = []

async function fileExists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

async function walk(dir, callback) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(path, callback)
    } else {
      await callback(path, entry.name)
    }
  }
}

async function checkPublicAssets() {
  for (const asset of REQUIRED_PUBLIC_ASSETS) {
    const path = join(PUBLIC, asset)
    if (!(await fileExists(path))) {
      errors.push(`Missing public asset: ${asset}`)
    }
  }
}

async function checkBundles() {
  if (!(await fileExists(BUNDLES))) {
    errors.push('Missing public/bundles/')
    return
  }
  for (const kind of ['2d', '3d', 'promo']) {
    for (const model of ['kimi', 'codex', 'minimax-m3']) {
      const dir = join(BUNDLES, kind, model)
      if (!(await fileExists(dir))) {
        errors.push(`Missing bundle: ${kind}/${model}`)
        continue
      }
      for (const required of BUNDLE_REQUIRED[kind]) {
        if (!(await fileExists(join(dir, required)))) {
          errors.push(`Missing required bundle file: ${kind}/${model}/${required}`)
        }
      }
      const index = await readFile(join(dir, 'index.html'), 'utf8')
      if (!index.includes('/bundles/i18n.js')) {
        errors.push(`Bundle does not load the shared locale adapter: ${kind}/${model}`)
      }
      await walk(dir, async (path, name) => {
        const rel = path.replace(dir + '/', '')
        const allow = BUNDLE_ALLOWLIST[kind]
        if (rel.startsWith('assets/')) {
          if (kind !== 'promo') {
            errors.push(`Disallowed assets dir in ${kind}/${model}: ${rel}`)
          }
          return
        }
        if (kind === 'promo' && rel.startsWith('assets/')) return
        if (!allow.has(rel)) {
          errors.push(`Bundle file not in allowlist: ${kind}/${model}/${rel}`)
        }
        if (BAD_EXTENSIONS.some((ext) => name.endsWith(ext))) {
          errors.push(`Raw log-like file in bundle: ${kind}/${model}/${rel}`)
        }
      })
    }
  }
}

function listCandidateFiles() {
  try {
    return execSync('git ls-files --cached --others --exclude-standard -z', {
      cwd: ROOT,
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean)
  } catch {
    errors.push('Unable to enumerate candidate git files')
    return []
  }
}

async function checkTextContent(path, rel, publicContent) {
  if (!TEXT_EXTENSIONS.has(extname(path).toLowerCase()) && !['CNAME', '.gitignore'].includes(basename(path))) {
    return
  }

  const content = await readFile(path, 'utf8')
  if (rel !== VERIFY_SCRIPT) {
    for (const bad of CANDIDATE_BAD_SUBSTRINGS) {
      if (content.includes(bad)) errors.push(`Forbidden candidate substring "${bad}" in ${rel}`)
    }
    const remoteUrls = content.match(/https?:\/\/[^\s"'<>)}]+/gi) ?? []
    for (const url of remoteUrls) {
      const domain = BAD_DOMAINS.find((item) => url.toLowerCase().includes(item))
      if (domain) errors.push(`Placeholder domain "${domain}" in ${rel}`)
    }
  }

  if (publicContent) {
    for (const bad of PUBLIC_BAD_SUBSTRINGS) {
      if (content.includes(bad)) errors.push(`Forbidden public substring "${bad}" in ${rel}`)
    }
  }
}

async function checkCandidateFiles() {
  const candidates = listCandidateFiles()
  for (const rel of candidates) {
    const path = join(ROOT, rel)
    if (!(await fileExists(path))) continue
    const fileStat = await stat(path)
    const lowerName = basename(path).toLowerCase()
    if (fileStat.size > 100 * 1024 * 1024) {
      errors.push(`Candidate file exceeds 100MB: ${rel}`)
    }
    if (BAD_EXTENSIONS.includes(extname(lowerName)) || lowerName.startsWith('.env')) {
      errors.push(`Raw log or environment file in candidate set: ${rel}`)
    }
    if (rel === 'raw' || rel.startsWith('raw/') || rel.includes('/raw/')) {
      errors.push(`Raw directory in candidate set: ${rel}`)
    }
    const publicContent = rel === 'index.html' || rel.startsWith('src/') || rel.startsWith('public/')
    await checkTextContent(path, rel, publicContent)
  }
}

async function checkDistributionContent() {
  if (!(await fileExists(DIST))) return
  await walk(DIST, async (path) => {
    const rel = path.replace(ROOT + '/', '')
    await checkTextContent(path, rel, true)
  })
}

async function checkRouteManifest() {
  const appFile = await readFile(join(SRC, 'App.tsx'), 'utf8')
  if (!appFile.includes("renderLocalizedRoutes('')") || !appFile.includes("renderLocalizedRoutes('/en')")) {
    errors.push('App.tsx does not mount both localized route sets')
  }
  for (const route of SHARED_BASE_ROUTES) {
    if (!appFile.includes(`route('${route}')`)) errors.push(`Base route ${route} not declared in App.tsx`)
  }
  for (const route of [...CHINESE_ARTICLE_ROUTES, ...ENGLISH_ARTICLE_ROUTES, ...LEGACY_ENGLISH_ARTICLE_ROUTES]) {
    if (!appFile.includes(`path="${route}"`)) errors.push(`Explicit route ${route} not declared in App.tsx`)
  }

  const redirectFile = await readFile(join(SRC, 'components/RedirectHandler.tsx'), 'utf8')
  for (const route of ROUTES) {
    if (!redirectFile.includes(`'${route}'`)) errors.push(`Route ${route} missing from static redirect allowlist`)
  }

  const sitemap = await readFile(join(PUBLIC, 'sitemap.xml'), 'utf8')
  for (const route of SITEMAP_ROUTES) {
    const url = `https://kevinai.top${route === '/' ? '/' : route}`
    if (!sitemap.includes(`<loc>${url}</loc>`)) errors.push(`Route ${route} missing from sitemap.xml`)
  }
}

function normalizedTime(value) {
  return String(value ?? '').replace(/[^0-9:.]/g, '')
}

async function checkBilingualBenchmarks() {
  const zh = JSON.parse(await readFile(join(PUBLIC, 'data/benchmarks.json'), 'utf8'))
  const en = JSON.parse(await readFile(join(PUBLIC, 'data/benchmarks.en.json'), 'utf8'))
  if (zh.summary.table.length !== en.summary.table.length) {
    errors.push('Chinese and English benchmark tables have different row counts')
    return
  }
  zh.summary.table.forEach((row, index) => {
    for (const model of ['kimi', 'codex', 'minimax']) {
      if (row[model] !== en.summary.table[index][model]) {
        errors.push(`Bilingual benchmark score mismatch at row ${index + 1}/${model}`)
      }
    }
  })
  for (const task of ['2d', '3d', 'promo', 'vision']) {
    for (const model of ['kimi', 'codex', 'minimax']) {
      const zhModel = zh.tasks[task].models[model]
      const enModel = en.tasks[task].models[model]
      if (zhModel.score !== enModel.score) errors.push(`Bilingual score mismatch: ${task}/${model}`)
      if (normalizedTime(zhModel.time) !== normalizedTime(enModel.time)) {
        errors.push(`Bilingual time mismatch: ${task}/${model}`)
      }
    }
  }
}

async function checkPromptEvidence() {
  const promptCases = {
    '2d': { minLines: 70, minCharacters: 2200, marker: 'window.__SLINGSHOT_TEST__' },
    '3d': { minLines: 90, minCharacters: 3900, marker: 'window.__BREACH_TEST__' },
    'promo': { minLines: 90, minCharacters: 4000, marker: 'window.__ONEKICK_TEST__' },
    'vision': { minLines: 50, minCharacters: 14500, marker: '"id":"V050"' },
  }

  for (const [task, expectation] of Object.entries(promptCases)) {
    const publicPath = `evidence/prompts/${task}.txt`
    const content = (await readFile(join(PUBLIC, publicPath), 'utf8')).trimEnd()
    const lineCount = content.split('\n').length
    if (lineCount < expectation.minLines) {
      errors.push(`Prompt evidence is truncated: ${publicPath} has ${lineCount} lines`)
    }
    if (content.length < expectation.minCharacters) {
      errors.push(`Prompt evidence is truncated: ${publicPath} has ${content.length} characters`)
    }
    if (!content.includes(expectation.marker)) {
      errors.push(`Prompt evidence is missing marker ${expectation.marker}: ${publicPath}`)
    }

    const pageName = task === '2d' ? 'Lab2D' : task === '3d' ? 'Lab3D' : task === 'promo' ? 'LabPromo' : 'LabVision'
    const pageSource = await readFile(join(SRC, 'pages', `${pageName}.tsx`), 'utf8')
    if (!pageSource.includes(`promptPath="/${publicPath}"`)) {
      errors.push(`${pageName}.tsx does not expose the complete ${task} prompt`)
    }
  }

  const labSource = await readFile(join(SRC, 'pages/Lab.tsx'), 'utf8')
  if (labSource.includes('/recording-desk/') || labSource.includes('四类评测实机录制台')) {
    errors.push('Private recording desk is still linked from the public Lab page')
  }
  if (await fileExists(join(PUBLIC, 'recording-desk'))) {
    errors.push('Private recording desk still exists in public/recording-desk')
  }
}

async function checkOfficialModelBenchmarks() {
  const pageSource = await readFile(join(SRC, 'pages/ModelPriceBenchmark.tsx'), 'utf8')
  const labSource = await readFile(join(SRC, 'pages/Lab.tsx'), 'utf8')
  const requiredModels = ['Claude Fable 5', 'GPT-5.6 Sol', 'Kimi K3', 'GLM-5.2', 'MiniMax M3', 'DeepSeek V4 Pro']
  const requiredFacts = ['67.3', '90.4', '81.0', '62.1', '83.5', '37.1 · #3', 'data-official-source']

  for (const model of requiredModels) {
    if (!pageSource.includes(`model: '${model}'`)) {
      errors.push(`Official benchmark list is missing ${model}`)
    }
  }
  for (const fact of requiredFacts) {
    if (!pageSource.includes(fact)) {
      errors.push(`Official benchmark list is missing required fact: ${fact}`)
    }
  }

  const officialSourceCount = (pageSource.match(/href: 'https:\/\//g) ?? []).length - pricingSourceCount(pageSource)
  if (officialSourceCount !== 6) {
    errors.push(`Official benchmark list must contain six HTTPS sources, found ${officialSourceCount}`)
  }

  for (const forbidden of ['useBenchmarks', 'BenchmarkTable', 'data-benchmark-model', 'Hands-on benchmark', '四项质量评分']) {
    if (pageSource.includes(forbidden)) {
      errors.push(`Price comparison page still exposes the private score block: ${forbidden}`)
    }
  }
  if (!pageSource.includes('不能据此直接合成统一总榜') || !pageSource.includes('do not form one directly comparable leaderboard')) {
    errors.push('Official benchmark comparison warning is missing in one or both languages')
  }
  if (!labSource.includes('模型 API 价格与官方评测') || labSource.includes('模型 API 价格与实测评分')) {
    errors.push('Lab entry does not use the official benchmark wording')
  }
}

function pricingSourceCount(pageSource) {
  const pricingBlock = pageSource.match(/const pricingSources = \[([\s\S]*?)\n\]/)?.[1] ?? ''
  return (pricingBlock.match(/href: 'https:\/\//g) ?? []).length
}

async function checkVisionDataset() {
  const vision = JSON.parse(await readFile(join(PUBLIC, 'data/vision-cases.json'), 'utf8'))
  if (!Array.isArray(vision.cases) || vision.cases.length !== 50) {
    errors.push('Vision review dataset must contain exactly 50 cases')
    return
  }
  const ids = new Set()
  for (const item of vision.cases) {
    if (ids.has(item.id)) errors.push(`Duplicate vision case id: ${item.id}`)
    ids.add(item.id)
    if (!item.image?.startsWith('/assets/vision-images/')) {
      errors.push(`Unexpected public vision image path: ${item.id}`)
      continue
    }
    if (!(await fileExists(join(PUBLIC, item.image.slice(1))))) {
      errors.push(`Missing public vision image: ${item.id}`)
    }
  }

  const englishPath = join(SRC, 'data/visionEnglish.ts')
  if (!(await fileExists(englishPath))) {
    errors.push('Missing English vision question map: src/data/visionEnglish.ts')
    return
  }
  const englishSource = await readFile(englishPath, 'utf8')
  const englishIds = new Set(Array.from(englishSource.matchAll(/^\s*(V\d{3}):\s*\{/gm), (match) => match[1]))
  for (const id of ids) {
    if (!englishIds.has(id)) errors.push(`Missing English vision question: ${id}`)
  }
  for (const id of englishIds) {
    if (!ids.has(id)) errors.push(`English vision question has no source case: ${id}`)
  }
  if (!englishSource.includes('localizeVisionCase')) {
    errors.push('English vision question map does not export localizeVisionCase')
  }
}

async function checkWorkflow() {
  const wfPath = join(ROOT, '.github/workflows/deploy.yml')
  if (!(await fileExists(wfPath))) {
    warnings.push('Missing .github/workflows/deploy.yml')
    return
  }
  try {
    const { load } = await import('js-yaml')
    const workflow = await readFile(wfPath, 'utf8')
    load(workflow)
    if (/^\s*-\s+run:\s*(?:#.*)?$/m.test(workflow)) {
      errors.push('.github/workflows/deploy.yml contains an empty run step')
    }
  } catch {
    errors.push('.github/workflows/deploy.yml YAML parse failed')
  }
}

async function checkDistSize() {
  if (!(await fileExists(DIST))) {
    warnings.push('dist/ does not exist; run npm run build before verifying distribution')
    return
  }
  let totalBytes = 0
  await walk(DIST, async (path, name) => {
    const s = await stat(path)
    totalBytes += s.size
    if (s.size > 100 * 1024 * 1024) {
      errors.push(`Dist file exceeds 100MB: ${path.replace(ROOT + '/', '')}`)
    }
    if (BAD_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      errors.push(`Raw log file found in dist: ${path.replace(ROOT + '/', '')}`)
    }
    if (name === 'raw' || path.includes('/raw/')) {
      errors.push(`Raw directory found in dist: ${path.replace(ROOT + '/', '')}`)
    }
  })
  const totalMB = (totalBytes / 1024 / 1024).toFixed(2)
  if (totalMB > 500) {
    warnings.push(`dist/ total size is ${totalMB} MB; consider asset optimization`)
  }
  console.log(`dist/ total size: ${totalMB} MB`)
}

async function checkGitignore() {
  if (!(await fileExists(join(ROOT, '.gitignore')))) {
    errors.push('Missing .gitignore')
    return
  }
  const gitignore = await readFile(join(ROOT, '.gitignore'), 'utf8')
  for (const pat of ['node_modules/', 'dist/', 'screenshots/', '*.tsbuildinfo', 'KIMI_HANDOFF.md', 'KIMI_REVIEW_ROUND1.md']) {
    if (!gitignore.includes(pat)) {
      errors.push(`.gitignore does not include ${pat}`)
    }
  }
  try {
    const tracked = execSync('git status --short', { cwd: ROOT, encoding: 'utf8' })
    for (const line of tracked.split('\n')) {
      if (!line.trim()) continue
      const file = line.slice(3).trim()
      if (file.startsWith('node_modules/') || file.startsWith('dist/') || file.startsWith('screenshots/')) {
        errors.push(`Ignored file appears in git status: ${file}`)
      }
    }
  } catch {
    // git may not be initialized
  }
}

async function checkAbsoluteOG() {
  const head = await readFile(join(SRC, 'components/SEOHead.tsx'), 'utf8')
  if (!head.includes('https://kevinai.top/assets/images/kevin-avatar.png')) {
    errors.push('SEOHead OG image is not an absolute kevinai.top asset URL')
  }
}

async function main() {
  console.log('Running kevinai-top verification...\n')

  await checkPublicAssets()
  await checkBundles()
  await checkCandidateFiles()
  await checkDistributionContent()
  await checkRouteManifest()
  await checkBilingualBenchmarks()
  await checkPromptEvidence()
  await checkOfficialModelBenchmarks()
  await checkVisionDataset()
  await checkWorkflow()
  await checkDistSize()
  await checkGitignore()
  await checkAbsoluteOG()

  if (warnings.length) {
    console.log('Warnings:')
    warnings.forEach((w) => console.log(`  ! ${w}`))
  }

  if (errors.length) {
    console.log('\nErrors:')
    errors.forEach((e) => console.log(`  x ${e}`))
    process.exit(1)
  }

  console.log('\nAll checks passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
