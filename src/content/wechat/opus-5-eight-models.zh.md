上期我刚说完，要永久退订 A 社。

这周 Opus 5 一发布，我转头又开了 100 美元一个月的 Max。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/01-m0679.gif" alt="小表情｜M0679 打脸" loading="lazy" decoding="async">
  <figcaption>小表情｜M0679 打脸</figcaption>
</figure>

购买按钮就在眼前，我的手却顿了一下。嘴上刚说完永别，心里纵然有一百个不情愿，可最后还是咬咬牙，右手点击了付款。买完后，我盯着屏幕沉默了三秒。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/02-m0339.jpg" alt="小表情｜M0339 算了生气伤身体" loading="lazy" decoding="async">
  <figcaption>小表情｜M0339 算了生气伤身体</figcaption>
</figure>

## 这次 Opus 5，到底强在哪里

总之就是：花半价拿到 Fable 5 的体验，再顺手把 GPT-5.6-sol 拳打脚踢一顿。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/03-01.png" alt="Anthropic 官方性能总榜" loading="lazy" decoding="async">
  <figcaption>Anthropic 官方性能图</figcaption>
</figure>

先划清口径：这张和后面的 ARC-AGI-3，都是 Anthropic 官方 benchmark，不是我这轮实测。

翻到 ARC-AGI-3 这张图时，我停了一下。这是我第一次见它被官方单独拎出来夸。可我当时没顾上感叹，脑子里只有一句：ARC-AGI-3 到底是啥？

我专门去查了一圈才弄明白，它测的是 AI 在未知领域里的探索能力。评测会把模型扔进一批从没见过的小游戏，不给说明书，不讲规则，连怎样才算赢都不告诉它。

模型只能自己点、自己试，撞墙了再换招，一点点摸清这个陌生世界的玩法。我一下就懂了：别人可能还在研究哪个按钮能动，Opus 5 已经开始找通关路线了。

这时我才知道，官方那句「约为次优模型的 3 倍」该怎么理解：到了一个完全陌生的地方，Opus 5 比别人更快摸清了规则。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/04-05-arc-agi-3.png" alt="ARC-AGI-3 官方图" loading="lazy" decoding="async">
  <figcaption>ARC-AGI-3 官方图</figcaption>
</figure>

不过，会摸规则和会做游戏是两回事。这张图说明 Opus 5 到了陌生环境会自己找路；它能不能从零做出一款真正能玩的游戏，还得看后面的同题实测。

Anthropic 的官方页面还引用了合作方评价：动画、游戏和 3D，是 Opus 系列目前最好的一次。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/05-opus5-emergent-official-quote-focus.png" alt="Anthropic 官方合作方引语" loading="lazy" decoding="async">
  <figcaption>Anthropic 官方合作方引语</figcaption>
</figure>

我这次只验证两件更直接的事：

- Opus 5 做出来的游戏，到底好不好玩
- 把 Fable 5 放在旁边，同门两个模型到底差在哪儿

上期我没有把 A 社模型放进正式实测。这次既然重新订了，就把 Opus 5 和 Fable 5 一次补齐。

## 不想看过程？评测结果放这儿了，走之前点个赞呀

这次我一共出了四道题：做一款 2D 游戏、做一款 3D 游戏、生成一个网页，再看 50 张图片。

为什么选这四项？最近发布的几批模型，做 2D、3D 游戏时进步很明显。以前只是能跑，现在已经开始有点像真正的成品了。

前端也必须测。最近各家都在刷网页榜，但它们做出来的页面审美差别很大，光看榜单很难看出来。

图片识别和理解是我这次特意加进来的。现在大家跟 Agent 沟通，经常就是丢一张截图，再补几句话。它要是第一步就看错了图，后面写得再快也白搭。

把这四道题放在一起，我想看的就是它们做游戏、写前端和看图片的综合水平到底怎么样。

先说明，这次只看上面四项，没有覆盖模型的所有能力。下面的结果只代表这轮测试，大家拿它当一个参考就好。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/06-v2-quality-overall.png" alt="四道题质量总均分" loading="lazy" decoding="async">
  <figcaption>四道题质量总均分</figcaption>
</figure>

<figure>
  <img src="/assets/wechat/opus-5-eight-models/07-v2-breakdown-2x2.png" alt="四道题单项总分 2×2 总览" loading="lazy" decoding="async">
  <figcaption>四道题单项总分 2×2 总览</figcaption>
</figure>

**第一个结论：Opus 5 四道题质量全是第一，总均分 94.4 也是全场最高。** GLM 5.2 按三项平均为 70.8，排在倒数第二；垫底的是 MiniMax M3 的 70.4。

**第二个结论：Opus 5 效果最好，但这三道 Agent 题的累计成本也是最高的。**

先看 Token 消耗。三张累计图都按质量榜 Top 1 到 Top 8 排，方便直接对着质量看代价。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/08-v2-token-cumulative-summary.png" alt="三题累计 Token" loading="lazy" decoding="async">
  <figcaption>三题累计 Token</figcaption>
</figure>

Opus 5 三题累计新增 143.2 万 Token，缓存输入 3870.9 万，两项都是全场最高。注意，这里的 3870.9 万是各轮缓存输入的累计值，不是单次上下文长度。它为什么会堆到这么高，后面结合调用链再说。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/09-v2-api-cost-cumulative-summary.png" alt="三题累计 API 等效价格（预估）" loading="lazy" decoding="async">
  <figcaption>三题累计 API 等效价格（预估）</figcaption>
</figure>

再按各家 API 标价折算，Opus 5 三题累计约 43.39 美元，还是全场最高；Fable 5 为 32.36 美元。这里比较的是完成本轮三道 Agent 题的累计等效价格，不是模型单价本身。Token 图里的新增 Token＝非缓存输入＋输出，缓存输入单列，不和新增 Token 相加。

价格全部是预估。Qwen 3.8 Max Preview 暂无正式价格，三题累计约 5.79 美元（按 Qwen 3.7 Max 官方原价计算，预估），未采用截至 7 月 31 日的限时 5 折价；Kimi 按 2026 年 7 月 24 日美元兑人民币中间价 6.7939 折算。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/10-v2-cost-score-scatter.png" alt="三题 API 等效价格与平均评分" loading="lazy" decoding="async">
  <figcaption>越左越省，越高越好</figcaption>
</figure>

放到价格和评分的二维图里看，Opus 5 在最右上角：质量最高，代价也最大。它的 API 单价虽然低于 Fable 5，但复杂任务里想得更久、消耗的 Token 更多，最后整项任务反而更贵。**单价更低，不等于整项任务更便宜。**

我又翻了一遍 Opus 5 的三项日志。它每做完一版，都会自己跑一下，发现问题再改。弹弓游戏修了无限滚动和关卡重叠，3D 游戏补了碰撞和手机触控，发布页也来回调过几次构图。三项一共跑了 218 轮，其中 42 次在做测试、截图或验收。

把另外三家放在一起看，会更直观：

| 模型 | 可见轮次 | 工具调用 | 每轮缓存输入 |
|---|---:|---:|---:|
| Opus 5 | 218 | 205 | 17.8 万 |
| Fable 5 | 114 | 111 | 9.4 万 |
| GPT-5.6 | 约 78 | 75 | 约 8.0 万 |
| Kimi K3 | 223 | 331 | 12.9 万 |

*Opus 5 和 Fable 5 都跑在 Claude Code 里，可以直接比较。GPT-5.6 和 Kimi K3 来自不同客户端，轮次按各自日志粗算。*

Opus 5 的轮次差不多是 Fable 5 的 1.9 倍，也远多于 GPT-5.6。Kimi K3 比它还多 5 轮，所以调用次数只能解释一部分。另一个差别更明显：Opus 5 每轮平均带回 17.8 万缓存 Token，四家最高。它既愿意多试几次，也会把更长的上下文一路带下去，时间和成本就这样堆起来了。

我觉得，这和前面 ARC-AGI-3 里自己试、自己摸规则的劲头有点像，也可能是它成品更完整的原因之一。不过这只是我从这次日志里看到的现象，Anthropic 没说过 Opus 5 会用更多 Token 换探索能力。

**第三个结论：Opus 5 的质量第一，运行速度也确实偏慢。**

<figure>
  <img src="/assets/wechat/opus-5-eight-models/11-v2-speed-cumulative-summary.png" alt="三题累计耗时" loading="lazy" decoding="async">
  <figcaption>三题累计耗时</figcaption>
</figure>

Opus 5 三题累计跑了 175.9 分钟，只有 Kimi K3 的 238.5 分钟比它更久。它不是全场最慢，但等它交卷，确实很考验耐心。

> 跑到第 60 分钟，我已经不关心它什么时候结束，只想确认进度条还活着。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/12-m4259.jpg" alt="小表情｜M4259 杨幂你没事吧" loading="lazy" decoding="async">
  <figcaption>小表情｜M4259 杨幂你没事吧</figcaption>
</figure>

第二部分到这里其实就三句话：质量最高，累计成本最高，速度也偏慢。懒得看过程的，到这儿已经可以撤了；还想看成品和 Bug，继续。

## 两个月挤进来八个模型，先把时间线理清楚

这波名字确实多，我自己也是对着发布记录捋了一遍才理顺，索性画成一条时间线。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/13-model-timeline-8-way.png" alt="八模型发布时间线" loading="lazy" decoding="async">
  <figcaption>八模型发布时间线</figcaption>
</figure>

本周新增实跑的是五家：Opus 5、Fable 5、Grok 4.5、Qwen3.8-Max-Preview、GLM 5.2。

为什么一次拉五家？它们全是这一两个月刚发的新模型，热度正高。一家一期拆开测，等我测到第五家，第一家的新闻都过期了。干脆同一套题拉到一起，一次跑完。

先插播两条新模型消息：Qwen 3.8 和 Grok 4.5。

Qwen 3.8 官宣里有一句英文，传着传着，方向都反了。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/14-qwen-second-only-highlight-crop.png" alt="Qwen 官方原帖标注版" loading="lazy" decoding="async">
  <figcaption>Qwen 官方原帖标注</figcaption>
</figure>

网上有人把这句话传成了「纸面超过 Fable 5」。「超过」和「仅次于」差了一个方向。它到底只差一点，还是游戏题上差得不少，后面直接看成品。

另一个是马斯克旗下 xAI 7 月 17 日刚发布的 Grok 4.5。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/15-grok45-xai-official-page.png" alt="xAI 官网的 Grok 4.5 页面" loading="lazy" decoding="async">
  <figcaption>xAI 官网的 Grok 4.5 页面</figcaption>
</figure>

Grok 4.5 训练时新加了一批科学、工程和数学数据。我这轮用的 Grok Build 已经默认换成它，能看图、能调工具，上下文 50 万。

钱也顺手交代一下。下面写的是我这次实际走的会员或计划，不是各模型的 API 单价。

- **Opus 5：** Claude Max，100 美元/月；这次为测试重新订阅。
- **Fable 5：** 与 Opus 5 共用同一份 100 美元/月的 Claude Max，没有再单独买一份。
- **Grok 4.5：** Grok Build 目前处于限免；我同时订了 SuperGrok，30 美元/月。
- **Qwen 3.8：** 阿里云 Token Plan Standard，我买时首月优惠 139 元。
- **GLM 5.2：** 与 Qwen 3.8 共用同一份首月 139 元的 Token Plan，没有再单独付费；这不是智谱官方会员。
- **GPT-5.6-sol：** 上一期沿用的 Codex Pro 会员，约 200 美元/月。
- **Kimi K3：** Kimi Code Allegro，699 元/月，约合 100 美元。
- **MiniMax M3：** MiniMax Ultra，469 元/月；我平时也会拿它做音频和日常 Coding。

> 钱包：这周又是谁发布新模型？

<figure>
  <img src="/assets/wechat/opus-5-eight-models/16-m0781.jpg" alt="小表情｜M0781 没钱啦" loading="lazy" decoding="async">
  <figcaption>小表情｜M0781 没钱啦</figcaption>
</figure>

## 这八个模型，我是怎么测的

每家模型都用对应的 CLI，并打开当时能用的最高推理档。

| 模型 | 本轮工具与档位 | 上下文 |
|---|---|---|
| Opus 5、Fable 5 | Claude Code 2.1.220，max | 1M |
| Grok 4.5 | Grok Build CLI 0.2.112，high | 500K |
| Qwen 3.8 | Qwen Code 0.21.0，Preview | 1M |
| GLM 5.2 | Qwen Code 0.21.0，thinking | 1M |
| Kimi K3 | Kimi Code 0.26.0，max | 1M |
| GPT-5.6-sol | Codex CLI，xhigh | 258K |
| MiniMax M3 | mmx / OpenCode 路径 | 1M |

我测的是「模型 + CLI」这套组合。大家拿同一道题和同一批素材，中途我不补提示；从启动到停手都计时，思考、测试、修 Bug 全算。

成品做完后，我把模型名遮住，一个个试玩。游戏看质量和速度，识图直接对答案。合并榜里 GPT-5.6-sol、K3 和 MiniMax M3 的部分成绩沿用上期。

## 第一题，做一款 2D《愤怒的小鸟》类小游戏

为了和上一期横向比较，这次沿用了同一道题。没看过上期也没关系：它就是让模型做一款原创 2D 弹弓物理小游戏。玩法会让人想到《愤怒的小鸟》，但角色、画面和音效都要自己做。

具体要求也很直白：至少三关，拖拽蓄力，松手发射，建筑能倒，球飞到半空还能放技能。

同一道题，前两名只差 1 分，第三名往后却很快拉开。先记住这个差距，后面看实机时会更有意思。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/17-v2-2d-total.png" alt="2D《弹弓攻城》项目总分榜" loading="lazy" decoding="async">
  <figcaption>2D《弹弓攻城》项目总分榜</figcaption>
</figure>

<figure>
  <img src="/assets/wechat/opus-5-eight-models/18-v2-2d-detail.png" alt="2D 游戏四维得分" loading="lazy" decoding="async">
  <figcaption>2D 游戏四维得分</figcaption>
</figure>

Opus 5 拿了 95.0，排第一，也是这一题我玩得最久的一份。

它不只是给球换个颜色。有的能俯冲，有的能直接炸开，还有的会一分为三。换一种球，打法也得跟着变，每一关就不再只是重复拉皮筋。

本来我打算每份玩几分钟就换。到了 Opus 这里，我把几种球都试了一遍，又多打了几关。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/19-2d-opus5-abilities.gif" alt="三种晶核：俯冲、爆震、三裂" loading="lazy" decoding="async">
  <figcaption>三种晶核：俯冲、爆震、三裂</figcaption>
</figure>

建筑倒塌后还会连锁波及。砸中一处，旁边的结构也可能跟着垮。

好玩的代价是慢。它做了 55.2 分钟，我中途把茶续了两遍。

同门的 Fable 5 只用 13.2 分钟，全场最快，分数是 84.8。一个先交卷，一个慢慢磨。同一道题，等待时间差了四倍多。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/20-2d-fable5.gif" alt="Fable 5 的 2D 实机" loading="lazy" decoding="async">
  <figcaption>Fable 5 的 2D 实机</figcaption>
</figure>

K3 这次也终于跑完了。撤掉 40 分钟时限后，它用了 92.3 分钟，拿到 88.3。统一录屏曾在发射 180 毫秒后就按空格，结果定点引爆触发太早，两发都炸在半空。我差点把一个玩法机制当成 Bug。真人上手后，三关都能通，总分打到 7990。

GPT-5.6-sol 这次直接按 94.0 计。它有个很抢戏的小问题：球飞出去了，皮筋还黏在球上，像一根甩不掉的橡皮糖。不影响通关，但每次发射都会看到。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/21-2d-gpt56-last-round.gif" alt="GPT-5.6-sol 上期 2D 实机" loading="lazy" decoding="async">
  <figcaption>GPT-5.6-sol 上期 2D 实机</figcaption>
</figure>

GLM 5.2 为 74.0。画面没怎么扣分，玩法底子却没做完整：游戏内的时间推进会被截断。

## 第二题，做一款 3D 第一人称射击游戏

玩家在仓库里移动、瞄准、开枪，清掉所有敌人，最后长按装置完成拆除。全部素材由模型自己生成。

第一名和第二名只差 0.3 分，几乎打平。上手后最明显的区别，是开枪顺不顺。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/22-v2-3d-total.png" alt="3D《破门点》项目总分榜" loading="lazy" decoding="async">
  <figcaption>3D《破门点》项目总分榜</figcaption>
</figure>

<figure>
  <img src="/assets/wechat/opus-5-eight-models/23-v2-3d-detail.png" alt="3D 游戏四维得分" loading="lazy" decoding="async">
  <figcaption>3D 游戏四维得分</figcaption>
</figure>

Opus 5 为 91.3，排第一。

它的 UI 是几款里最舒服的。生命放在左上角，倒计时、剩余敌人和当前目标都在顶部，弹药留在右下角。准星附近没有塞一圈数字，我开枪时不用斜着眼找信息。

枪感也是几款里最好的。扣下扳机后，后坐、枪口反馈、命中叉和弹药变化几乎连在一起。节奏短，反馈快，真有一点手枪的利落感，不像拿鼠标去点一个 3D 模型。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/24-3d-opus5.gif" alt="Opus 5 的 3D 实机" loading="lazy" decoding="async">
  <figcaption>Opus 5 的 3D 实机</figcaption>
</figure>

槽点是我跑动时，货箱顶部和表面会轻微闪动，自动检查没报错，静态截图也看不出来，只有实际跑起来，眼睛才会被那一下晃到。

> 自动检查：全绿；我的眼睛：箱子怎么还在蹦迪？

<figure>
  <img src="/assets/wechat/opus-5-eight-models/25-3d-opus5-yellow-crate-flicker.gif" alt="黄箱近景：跑动后表面开始闪" loading="lazy" decoding="async">
  <figcaption>黄箱近景：跑动后表面开始闪</figcaption>
</figure>

Fable 5 的同类闪动更明显，最终拿到 83.3。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/26-3d-fable5.gif" alt="Fable 5 的 3D 实机" loading="lazy" decoding="async">
  <figcaption>Fable 5 的 3D 实机</figcaption>
</figure>

开枪和敌人受击的反馈都做出来了，只是人物一移动，货箱贴图的闪动就会更抢眼。

其他几家只说会影响选择的部分。

Qwen 3.8 是这题的黑马，87.8，但也磨了 69 分钟。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/27-3d-qwen38.gif" alt="Qwen 3.8 的 3D 实机" loading="lazy" decoding="async">
  <figcaption>Qwen 3.8 的 3D 实机</figcaption>
</figure>

这段里，枪口反馈、命中倒地、受击红边、弹药变化和换弹都能看到。87.8 的黑马相，不只是榜单上好看。

这段录屏里，我对准拆除装置直直往前走。走着走着才发现，人已经飘到二楼了，楼梯压根没用上。人物一靠近平台，高度就开始异常抬升，这才是画面里真正撞到的 Bug。楼梯：那我走？

<figure>
  <img src="/assets/wechat/opus-5-eight-models/28-3d-qwen38-elevator-bug.gif" alt="直走后飘上二楼" loading="lazy" decoding="async">
  <figcaption>直走后飘上二楼</figcaption>
</figure>

Grok 4.5 只用 17.9 分钟，分数为 73.2。GLM 5.2 为 62.8。他俩的槽点我就不赘述了，大家去实验室自行体会。

## 第三题，我被 Opus 5 的读图能力，震惊到了

我平时让 Agent 改游戏，经常直接把截图和报错界面扔过去。图一旦看错，后面的分析很容易一路跑偏。

这道题只测读图，不看文案和审美。50 张图，每题四选一，答案提前定好。

50 张图跑完，榜首一题没错。更有意思的是，后面的分差，很多都从画面角落里一个不起眼的小目标开始。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/29-v2-vision-total.png" alt="50 图视觉识别项目总分榜" loading="lazy" decoding="async">
  <figcaption>50 图视觉识别项目总分榜</figcaption>
</figure>

<figure>
  <img src="/assets/wechat/opus-5-eight-models/30-v2-vision-detail.png" alt="视觉识别四维得分" loading="lazy" decoding="async">
  <figcaption>视觉识别四维得分</figcaption>
</figure>

Opus 5 五十题全对，拿到 100。最难的 15 题，我连续跑了三遍，它一次都没改答案。**两期合在一起看，它是唯一的满分。**

Fable 5 为 96.0。Qwen 3.8 为 94.8，离 Fable 不远，也没有出现网传的「已经超过」。至少在这批游戏和界面图片里，实际顺序仍是 Fable 在前。

Grok 4.5 的单题中位时间只有 9.9 秒，却错了 5 题。两道难题连做三遍，答案都不一样，最后为 88.1。

GLM 5.2 技术性缺席。它当前走的接入通道不支持图片输入，我试了两次，共跑半小时，仍然没有输出。这只能说明接入受限，不能拿来判断模型本身的识图能力。

分数看完，还是得点开错题。Grok 4.5 的 5 道错题里，3 道都是计数；Fable 5 和 Qwen 3.8 也一起栽在雪地人数这张图上。下面挑 2 张最典型的看。

### 第一张：最左边那个人，三家一起漏了

**原题：雪地里一共能看到多少个人？**<br>
考察点：复杂场景计数｜选项：6 人、7 人、8 人、9 人

<figure>
  <img src="/assets/wechat/opus-5-eight-models/31-v007.png" alt="雪地人数计数错题" loading="lazy" decoding="async">
  <figcaption>雪地人数：正确答案 8 人</figcaption>
</figure>

结果很有意思：Fable 5、Qwen 3.8 和 Grok 4.5 首轮都答 7；Opus 5 三遍都是 8。最左边那个小人，又成了最容易漏掉的一个。

### 第二张：昆虫嘴边这个 B，Grok 看成了复眼

**原题：昆虫图中的 B 标签指向什么部位？**<br>
考察点：科学示意图｜选项：口器、足、复眼、触角

<figure>
  <img src="/assets/wechat/opus-5-eight-models/32-v037.png" alt="昆虫结构标注错题" loading="lazy" decoding="async">
  <figcaption>昆虫标注：正确答案「口器」</figcaption>
</figure>

Grok 4.5 把口器看成复眼，置信度给到 91%；另外三家都答对。

这 2 张图放在一起看，Opus 5 的满分就不只是榜单上的 100。小目标计数和专业示意图，它都没有掉链子。

## 第四题，不给素材，直接测各家的前端审美

上一次测的是自家产品页面，品牌、结构和业务要求都定得很死，模型能自由发挥的地方不多。成品能看完成度，却看不出各家自己的审美。

这次我干脆换了一道更开放的题：给一款虚构机械键盘「声律 75」做产品发布页。八家同场重跑。

一张素材图都不给。键盘造型、材质、光影和五种配色，全靠代码画。我要看的也很直接：谁更会排版，谁更懂材质和配色，谁能把一个不存在的产品做出高级感。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/33-v2-aesthetic-total.png" alt="产品发布页项目总分榜" loading="lazy" decoding="async">
  <figcaption>产品发布页项目总分榜</figcaption>
</figure>

<figure>
  <img src="/assets/wechat/opus-5-eight-models/34-v2-aesthetic-detail.png" alt="产品发布页四维得分" loading="lazy" decoding="async">
  <figcaption>产品发布页四维得分</figcaption>
</figure>

八个产品发布页全部看完，最让我惊艳的，其实就是 Opus 5 这一份。明明一张素材图都没给，它却把一把不存在的键盘完整画成了有质感的 3D 主体。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/35-aes-opus5-visual-transition.gif" alt="Opus 5 发布页转场" loading="lazy" decoding="async">
  <figcaption>Opus 5 发布页转场</figcaption>
</figure>

往下滚的时候最见功夫。键帽、轴体和底座一层层展开，按键再一颗颗铺回键盘，整套动效非常丝滑，金属反光也跟着视角变化。

五种配色的切换也不是简单换个颜色。点下暮山紫、月白、黛青、胭脂、玄墨时，新配色会沿着键盘一排排荡开，像水面上的波纹从一侧漫过去，连键帽都跟着活了起来。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/36-aes-opus5-color-switch.gif" alt="Opus 5 发布页配色切换" loading="lazy" decoding="async">
  <figcaption>Opus 5 发布页配色切换</figcaption>
</figure>

更难得的是，五套配色都不是网页滤镜式的换皮。每套的明暗、材质和键帽搭配都很贴近真实机械键盘，像是品牌真会拿出来卖的配色。看着它们来回切换，我很难想象这把 3D 键盘全是代码在网页里渲染出来的。

我把这页来回滚了好几遍，确实有被小小震撼到。这套动效光看截图很难说清。我很推荐你直接去[实验室](/lab)看看完整成品。亲手滚一遍，比我在这里夸半天更直观。

Fable 5 用了另一套办法。金属反光、金色 ESC 和空格键、逐键立体层次、星空微粒背景，全往质感上堆。它只花 30 分钟，拿到 87.8。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/37-aes-fable5.gif" alt="Fable 5 发布页实机" loading="lazy" decoding="async">
  <figcaption>Fable 5 发布页实机</figcaption>
</figure>

GPT-5.6-sol 用了 13.3 分钟，拿到 90.3。实际看下来，它和 Fable 5 给我的感觉差不多：没出什么错，也没有哪一处让我觉得惊艳，整页的 AI 味还是挺重。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/38-aes-gpt56-smooth.gif" alt="GPT-5.6-sol 发布页实机" loading="lazy" decoding="async">
  <figcaption>GPT-5.6-sol 发布页实机</figcaption>
</figure>

Kimi K3 用了 69.3 分钟，拿到 82.3。它这套紫白键盘第一眼很抓人，主体够大，光影干净，紫色点缀也很克制，整页的完成度和品牌感都不错。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/39-aes-kimi-k3.gif" alt="Kimi K3 发布页实机" loading="lazy" decoding="async">
  <figcaption>Kimi K3 发布页实机</figcaption>
</figure>

Grok 4.5 为 81.2，做得最像真要卖货的商业页面。导航栏、金色标题「听键入律」，还有 75%、三模、30 天、¥1299 的参数带，看起来明天就能上架。

MiniMax M3 只用 12.9 分钟，是全场最快，分数也是最低，71.2。

## 最后再看一眼账单

最后算了下 Token 消耗和成本。Opus 5 按 API 标价折算 43.39 美元，Fable 5 是 32.36 美元，相差 11.03 美元。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/40-v2-cost-opus5-fable5.png" alt="Opus 5 与 Fable 5 API 等价成本对照" loading="lazy" decoding="async">
  <figcaption>Opus 5 与 Fable 5 API 等价成本对照</figcaption>
</figure>

这是 API 等价成本。Max 没有实际扣这笔钱；额度怎么换算，Anthropic 没公开，我也没留逐题 Usage 截图。

差价主要来自 2D。Opus 5 用了 55.2 分钟，成本 17.13 美元；Fable 5 用了 13.2 分钟，成本 6.07 美元。我多等 42 分钟，也多了 11.06 美元。3D 和产品发布页只差几分钱。

## 模型选择建议

### 第一推荐，GPT-5.6-sol：综合稳，性价比高

如果今天只让我给大多数人选一个，我会先给 GPT-5.6-sol。它没有靠某一道题抢镜，但整体很少掉链子。2D 为 94.0，3D 为 89.2，产品发布页为 90.3，基本都在第一档。

它也没有 Opus 5 那种动不动等一小时的压力。把质量、速度和我现有的订阅成本放在一起看，日常编码、做游戏和前端，先用它更合理。

### 第二推荐，Kimi K3：开源路线优先选

K3 的综合水平确实高。2D 撤掉时限后拿到 88.3，3D 是 91.0，识图 96.7，审美也有 82.3。

四项放在一起，它是这套题里的开源第一。如果更看重开源，我会优先推荐 K3。它的问题主要是慢。真要用它做完整项目，时间得给够。

### 第三推荐，Qwen 3.8：139 元首月，适合尝鲜

Qwen 3.8 是国产开源路线的新模型。这轮 3D 拿到 87.8，识图为 94.8，已经能和第一档模型咬得很近。

我买的时候，Token Plan 首月优惠是 139 元。这个价格拿来体验国产 Agent 模型，性价比很不错，也值得给它一个上场机会。

边界也要说清：它目前仍是 Preview，3D 那题也跑了 69 分钟。便宜不等于快，但这个价格确实值得试。

### 第四推荐，Opus 5：当个看客就好，没必要硬上

四道题，Opus 5 都是第一。3D 场景、UI 和枪感，也是这轮最好的一家。厉害归厉害，我站旁边看看成绩就够了。

以后真碰上别的模型做不好的复杂 3D 或前端，我再考虑找它。平时用不到，没必要为了第一名硬上。

## 最后

Opus 5 这轮确实最强，但我不会因此替 A 社洗白。

模型做得好，是工程师的本事；公司对用户摆出一副高高在上的姿态，是另一回事。别指望发个强模型、甩几张漂亮榜单，大家就把旧账忘了。用户不是看完 benchmark 就会失忆的韭菜，更不是花了钱还要替它圆话的公关。**产品强，不是傲慢的免死金牌。**

<figure>
  <img src="/assets/wechat/opus-5-eight-models/41-m0302.jpg" alt="小表情｜M0302 矫情那么些天还不够吗" loading="lazy" decoding="async">
  <figcaption>小表情｜M0302 矫情那么些天还不够吗</figcaption>
</figure>

做完评测后，我最大的感受是：这行的迭代还在加速，而且各家押的方向不太一样，**谁都有可能在下个版本，掏出新东西。**今天的第一名，过几个月未必还坐在那儿，接下来轮到谁，现在没人敢打包票。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/42-m2857.jpg" alt="小表情｜M2857 心动指数上升了" loading="lazy" decoding="async">
  <figcaption>小表情｜M2857 心动指数上升了</figcaption>
</figure>

前两天有一份梁文锋投资人会议实录流出来。21 财经整理了其中关于芯片的部分，里面的说法很直白：**国产 AI 芯片整体大约还差两年，**华为 950 超节点要用四张卡顶英伟达一张；为了把同一件事跑起来，**价格就算贵 50% 到 100%，他也可以接受。**流传的完整实录里还有一句更关键：DeepSeek 愿意买华为 950，也愿意和华为一起把生态跑通。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/43-21finance-huawei950-focus-underlined.png" alt="21 财经原文重点截图：华为 950 超节点、价格与性能判断" loading="lazy" decoding="async">
  <figcaption>21 财经原文截图</figcaption>
</figure>

我简单抛几个观点：国产模型搭配国产算力，可能才是更正确、也更稳的一条路。

1. **少受海外算力牵制。**关键时候，我们手里得有自己的卡、自己的供给，才不至于被人卡住脖子。

2. 促进国产模型和算力的正循环：国产模型愿意长期用国产芯片，芯片厂商才有真实需求；芯片继续进步，模型也能拿到更稳的本土算力。AI 和半导体互相托一把，这个循环真跑起来，中国的 AI 产业才会更有竞争力。

3. **避免海外的高估值，算力涨价和盲目扩展一路传到国内。**哪怕国外的 AI 泡沫继续变大，也别让它蔓延到国内。

<figure>
  <img src="/assets/wechat/opus-5-eight-models/44-m0257.jpg" alt="小表情｜M0257 站起来不准跪" loading="lazy" decoding="async">
  <figcaption>小表情｜M0257 站起来不准跪</figcaption>
</figure>

这次的完整网页成品、分数和测试数据，都放在[实验室](/lab)里。

资料来源：Anthropic《Introducing Claude Opus 5》（2026 年 7 月 24 日）、Qwen 官方原帖、路透、21 财经（2026 年 7 月 23 日）和第一财经。

如果这篇能帮你少花一次冤枉钱，点个赞、在看，就是对我最大的支持！
