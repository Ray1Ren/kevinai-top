# CONTENT_SOURCES.md

## 真实素材来源

所有源文件只读；派生文件写入 `public/assets/`，不修改原文件。

### 人物与品牌

- Kevin 头像：本地已生成图像，经圆形裁切去除四角绿色后作为 `public/assets/images/kevin-avatar.png`。
- 正式小程序码：`Kevin AI局_首发_20260715/assets/一脚晋级_公众号小程序码_ch_mp1.png`。
- 四项总榜图：`弹弓攻城三方同题实测_20260718/assets/00-four-task-benchmark.png`。

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

## 文案与数据来源

- Kevin 公开自述：`Kevin AI局_首发_20260715/01_首篇发布稿.md`
- 四项最终质量分与用时：`弹弓攻城三方同题实测_20260718/KIMI_FINAL_ARTICLE_PROMPT.md`
- 宣传页评测：`一脚晋级宣传页-K3-M3-Codex-20260718/RESULTS.md`
- 2D 评测：`弹弓攻城-K3-M3-Codex-20260717/RESULTS.md`
- 3D 评测：`破门点3D-K3-M3-Codex-20260718/RESULTS.md`
- 识图评测：`K3-M3-Codex-视觉识别-20260718/REPORT.md`、`FINAL_SCORE_V2.json`

## 公开事实边界

- Kevin 是 Android 研发；做《一脚晋级》前对小游戏基本不了解。
- 2026-06-13 开始，第二天初版可玩；从开始到正式上线共 24 天。
- 《一脚晋级》公开口径 500 关。
- 核心判断：AI 擅长批量生成和快速试错，人负责判断、审美、取舍与验收。
- GitHub：`https://github.com/Ray1Ren`
- 域名：`kevinai.top`
- 本站不声称拥有任何外部文章或公众号内容；设计参考仅作为外部视觉参考使用。
