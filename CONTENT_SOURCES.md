# CONTENT_SOURCES.md

## 真实素材来源

所有源文件只读；派生文件写入 `public/assets/`，不修改原文件。

### 人物与品牌

- Kevin 头像：本地已生成图像，经圆形裁切去除四角绿色后作为 `public/assets/images/kevin-avatar.png`。
- 正式小程序码：`Kevin AI局_首发_20260715/assets/一脚晋级_公众号小程序码_ch_mp1.png`。
- 四项用时图：同目录下 `18-duration-benchmark.png`。
- 文章分项图：同目录下 `14-total-2d.png`、`14-detail-2d.png`、`16-total-web.png`、`16-detail-web.png`、`17-total-vision.png`、`17-detail-vision.png`。
- 历史总榜图和旧 3D 分数图仍含早期分数，已停止导入；网站总榜和 3D 分数由最终数据直接渲染。

### 《一脚晋级》真实画面

来源内容包：`Kevin AI局_首发_20260715/imgs/06~11-real-*.png`

- `06-real-new-home.png` → `game-home.png`
- `07-real-level-100-route.png` → `game-level-100.png`
- `08-real-global-rank.png` → `game-rank.png`
- `09-real-rank-promotion.png` → `game-promotion.png`
- `10-real-animal-event.png` → `game-animal-event.png`
- `11-real-reward-bank.png` → `game-reward-bank.png`

### 四类评测演示素材

来源内容包：`弹弓攻城三方同题实测_20260718/assets/`

- 2D：`01-k3-gameplay.gif`、`02-codex-gameplay.gif`、`03-m3-gameplay.gif`
- 3D：`04-k3-3d-gameplay.gif`、`05-codex-3d-gameplay.gif`、`06-m3-3d-gameplay.gif`
- 宣传页：`08-k3-promo.gif`、`09-codex-promo.gif`、`10-m3-promo.gif`
- 识图：`11-image-recognition-dataset.jpg`、`12-image-recognition-dataset.jpg`

### 原样可交互产物

来源内容包（只读，复制时通过 allowlist 过滤）：

- 2D：`弹弓攻城-K3-M3-Codex-20260717/runs/{kimi,codex,mmx-m3-reexam}`
- 3D：`破门点3D-K3-M3-Codex-20260718/runs/{kimi,codex,opencode-m3-repair}`
- 宣传页：`一脚晋级宣传页-K3-M3-Codex-20260718/runs/{kimi,codex,mmx-m3}`

公开目录统一命名为 `public/bundles/{2d,3d,promo}/{kimi,codex,minimax-m3}/`，仅保留运行所需的 `index.html`、CSS、JS 与本地资源。

### 50 图视觉识别公开数据

- 来源内容包：`K3-M3-Codex-视觉识别-20260718/`
- 公开文件：`public/data/vision-cases.json`、`public/assets/vision-images/`
- 仅公开题面、冻结图片、选项、真值与三家最终答案；原始运行日志、stdout、stderr、raw 目录和私有 manifest 不公开。

### Kimi K3 中英文文章

- 中文事实源：新版公众号文章 `https://mp.weixin.qq.com/s/EO2wmTxd4vbCi1bjsKWgUw`，本地底稿为 `弹弓攻城三方同题实测_20260718/03_KimiCode公众号稿.md`。
- 网站路由：中文 `/notes/kimi-k3-subscription-review`；英文文章目录 `/en/articles`，英文正文 `/en/articles/kimi-k3-review`。
- 中文文章素材在 `public/assets/article-kimi-k3/`。英文正文只使用已核对为英文或无文字的共享图，以及 `public/assets/article-kimi-k3-en/` 下的英文专属裁切图和分享图；方向题使用从原始街景裁出的 `vision-arrow-crop.png`，模型仍然看到未裁切原图。
- 英文旧路由 `/en/notes` 与 `/en/notes/kimi-k3-subscription-review` 保留兼容跳转，不再作为 canonical。
- 发布时刻：`2026-07-19T00:00:00Z`，即北京时间 / 新加坡时间 08:00；中英文同时开放。

### 首篇开发日记中英文版

- 中文事实源：`Kevin AI局_首发_20260715/01_首篇发布稿.md`；线上永久链接为 `https://mp.weixin.qq.com/s/t3BFROP2PcSpKNHW6vN6zA`。
- 发布标题：`AI 做小游戏：1 天能玩，24 天上线`；发布时间为 2026 年 7 月 15 日。
- 网站路由：中文 `/notes/ai-game-24-days`；英文 `/en/articles/ai-game-24-days`。
- 中文信息图来自同目录 `imgs/01` 至 `imgs/05`；英文信息图由 `scripts/build-first-article-assets.mjs` 按同一组日期、数字和机制重新排版，不覆盖中文原图。
- 6 张真实游戏截图和 3 段早期试音只做本地复制，不改原文件。英文版保留真实中文游戏界面，并用英文图注说明当前 WeChat 正式版仍是中文界面。
- 文章内小程序码使用独立渠道 `scene=ch=web_note1`，文件为 `public/assets/first-article/one-kick-code-ch_web_note1.png`；不要替换首页和链接页原有渠道码。

## 文案与数据来源

- Kevin 公开自述：`Kevin AI局_首发_20260715/01_首篇发布稿.md`
- 四项最终质量分、用时、说明与结论（唯一对外数据口径）：`弹弓攻城三方同题实测_20260718/03_KimiCode公众号稿.md`
- 最终数字直接取公众号稿与 `public/data/benchmarks*.json`；旧总榜图和旧 3D 图不得继续作为核验依据。
- 2D、3D、宣传页与识图目录中的 `RESULTS.md`、`REPORT.md`、`FINAL_SCORE_V2.json` 仅保留为过程证据；如与最终公众号稿冲突，以公众号稿为准。

## 公开事实边界

- Kevin 是 Android 研发；做《一脚晋级》前对小游戏基本不了解。
- 2026-06-13 开始，第二天初版可玩；从开始到正式上线共 24 天。
- 《一脚晋级》公开口径 500 关。
- 核心判断：AI 擅长批量生成和快速试错，人负责判断、审美、取舍与验收。
- GitHub：`https://github.com/Ray1Ren`
- 域名：`kevinai.top`
- 本站不声称拥有任何外部文章或公众号内容；设计参考仅作为外部视觉参考使用。
