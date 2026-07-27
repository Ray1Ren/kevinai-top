<figure>
  <img src="/assets/wechat/k3-930k-token-test/01-01-cover-wide.png" alt="K3、M3 与 Codex 同题实测" loading="lazy" decoding="async">
  <figcaption>K3、M3 与 Codex 同题实测</figcaption>
</figure>

大家好，我是 Kevin。

K3 是今天刚发的。看到 1M 上下文，我先往里塞了一份大文件。

第一次塞了 4.06MB 普通文本，马上报错：

```text
total message size 4060326 exceeds limit 2097152
```

有点尴尬。1M 上下文是真的，单条消息还有 2MB 的门，两个限制不是一回事。

后来我把语料换成 93 万个比较密的 token，在第 1000、8 万、24 万，一直到第 92.8 万的位置藏了 8 个代号。最后再让它做一次求和、一次拼接，顺便报出第一个和最后一个位置。

我用 Kimi Code 跑了一遍，又把 K3 接进 Claude Code 跑了一遍。

两边都对了。

Kimi Code 实际吃进去 930386 个 prompt token，Claude Code 这边是 930503 个 input token。8 个代号、位置、求和和拼接全部命中，时间都在 100 秒左右。

<figure>
  <img src="/assets/wechat/k3-930k-token-test/02-02-1m-context-evidence.png" alt="K3 两种入口的 93 万 token 实测" loading="lazy" decoding="async">
  <figcaption>K3 两种入口的 93 万 token 实测</figcaption>
</figure>

K3 的 1M 确实能用。我还不敢因为一道检索题就说它已经能看懂整个百万 token 仓库，那有点飘；这次能确认的是，93 万 token 送进去了，中间的 8 个点一个没丢。

后来我把同一份题又交给 MiniMax M3。

OpenCode 实际送入 947635 个 input token，服务端接收了，中间还撞到一次 32000 token 输出上限，自动压缩后继续跑。最后 8 个代号找对 6 个。换成 Claude Code 外壳后，M3 收到 930484 个 input token，用了 86.6 秒，找对 7 个，求和和拼接仍然错。

能接收 1M，只说明门开了。里面的细节能不能找准，还得单独测。

## 同一个 K3，换个壳以后不太一样

我原本只准备测 Kimi Code。

后来想到，平时聊模型好不好用，经常把模型和外面的 Agent 混在一起。系统提示、工具定义、怎么读文件、什么时候跑测试，这些都会改结果。

所以我又配了一个 `claude-k3`。

它用 Kimi 官方的兼容地址，模型写 `k3[1m]`，上下文设成 1048576，effort 用 max。我给它单独放了一个 HOME，Key 放进 macOS Keychain，原来的 Claude Code 配置没动。

临时试用的话，官方给的关键配置就这些，Key 换成自己的：

```zsh
export ANTHROPIC_BASE_URL='https://api.kimi.com/coding/'
export ANTHROPIC_API_KEY='你的 Kimi API Key'
export ANTHROPIC_MODEL='k3[1m]'
export CLAUDE_CODE_AUTO_COMPACT_WINDOW='1048576'
export CLAUDE_CODE_MAX_CONTEXT_TOKENS='1048576'
export CLAUDE_CODE_EFFORT_LEVEL='max'
claude
```

我自己长期用，所以做成了单独的 `claude-k3` 命令，避免和原来的 Claude 登录打架。

然后四个组合一起跑：

1. Kimi Code + K3
2. Claude Code + K3
3. Codex + gpt-5.6-sol（xhigh）
4. OpenCode + MiniMax M3（thinking）

每家一个空目录，同一份任务书，不能联网，不能装依赖，也不能看别人做出来的文件。

我没有拿它们自己的“全部完成”当结果。最后统一跑隐藏测试，前端和游戏还要过真实 Chrome，再留桌面和 390px 手机截图。

## 简单题看着没意思，真能抓到东西

第一组是 6 个常用函数：时长解析、区间合并、深路径读取、并发 map、LRU 和 CSV。

一共 24 个隐藏断言。我特意放了畸形引号、原型污染、失败后不能再启动任务这些边界。

结果是：

- Kimi Code + K3：24/24
- Claude Code + K3：23/24
- Codex：23/24
- OpenCode + MiniMax M3：23/24

Claude Code + K3 和 Codex 都把 `a"b,c` 当成了合法 CSV。M3 则接受了 `a.`、`a[]`、`a[foo]` 这三条畸形 path。

这些都属于看代码时很容易滑过去的东西。正常输入能跑，Demo 也不会炸，等到线上碰到脏数据才麻烦。

第二组是并发调度器。里面有全局并发、group 并发、优先级、Promise 去重、重试退避、取消和槽位释放，很多状态连在一起。

这次两个 K3 和 M3 都是 16/16。Codex 是 15/16，漏在一个很小的等号上：题目要求只有 `transient === true` 才能重试，它把其他 truthy 值也重试了。

Claude Code + K3 在这里挺谨慎，花了 963 秒。中间它还给自己写过一个时序测试，第一次把测试写成死锁，后来才修好。模型认真起来，也会先把自己绊一下哈哈哈。

<figure>
  <img src="/assets/wechat/k3-930k-token-test/03-03-hidden-tests.png" alt="常用函数与并发调度器的隐藏测试结果" loading="lazy" decoding="async">
  <figcaption>常用函数与并发调度器的隐藏测试结果</figcaption>
</figure>

## 做前端时，Codex 还是快得很明显

第三组是响应式游戏工作台。

题目里有 7/30/90 天切换、指标和趋势图、任务列表、活动流、明暗主题、Command Palette、移动菜单，还明确不许用渐变和背景模糊。

Kimi Code + K3 做了一个编辑部式的数据台，18/18，用了 905 秒。信息很多，但不是常见的卡片墙。

Claude Code + K3 也是 18/18，画面比原生 Kimi Code 更精致。我给 9.0 分。它还自己看截图发现 Command Palette 明明加了 `hidden`，却被 CSS 顶回来了，修完才交。

问题是慢，1767 秒，差不多半小时。

Codex 用了 423 秒，页面第一眼最好看，我给 9.2 分。它唯一漏的是题目明说不能用的 `backdrop-filter`。

M3 的页面也让我有点意外。它做的是深色编辑室，衬线大标题、细线分区，第一眼和 Codex、Claude Code + K3 在同一档，我给 9.0 分。它用了 1495 秒，最后丢的一分很冤：规格要求页面精确出现 `Playtime hours`，它把 `PLAYTIME` 和 `hours` 分开放了。

<figure>
  <img src="/assets/wechat/k3-930k-token-test/04-04-frontend-comparison.png" alt="四个组合做出的同题前端" loading="lazy" decoding="async">
  <figcaption>四个组合做出的同题前端</figcaption>
</figure>

我对 Codex 的感觉还是和做《一脚晋级》时差不多：方向说清楚以后，它做第一版很快，版式也经常比我预想的好。麻烦是它会漏一两个很具体的边界，所以隐藏测试不能省。

## 小游戏也差不多：能看和全对，不总在同一个人身上

最后一组是单页 Canvas 小游戏 `Signal Drift`。

飞船绕着中心转，点击、触摸或按 Space 改方向。吃青色 beacon 加分和 combo，撞红色 mine 掉命。还要有暂停、重开、音效、静音、粒子、最高分和固定 seed。

统一脚本会真的开始游戏、改方向、暂停、碰撞、打到死亡、重开，再刷新页面检查最高分。

Kimi Code + K3 是 22/22，画面很简洁，我给 8.0 分。

Claude Code + K3 是 21/22，画面细一点，我给 8.6 分。它漏在内部时间：暂停以后调用 `step(1000)`，分数和位置都没动，但内部时间还是从 0 走到了 1 秒。

Codex 是 21/22，画面明显最像成品，我给 9.2 分。它吃到 beacon 时先把内存里的最高分更新了；game over 再判断要不要保存时，条件已经不成立，所以 localStorage 一直没写。肉眼试玩很容易以为没问题，刷新一下就露馅。

M3 是 22/22，用了 228 秒。功能过得很干净，画面就克制多了：深蓝底、轨道、飞船和少量粒子，能玩，也像一个刚做完核心循环的原型。我给 7.8 分。

<figure>
  <img src="/assets/wechat/k3-930k-token-test/05-05-game-comparison.png" alt="四个组合做出的 Signal Drift" loading="lazy" decoding="async">
  <figcaption>四个组合做出的 Signal Drift</figcaption>
</figure>

这一轮还有个挺真实的插曲。

Claude Code + K3 给自己写了 50 多条 Node 检查，全部通过。接着它开 Chrome 验证手机布局。页面结果已经写出来，Chrome 进程就是不退出。它又换 `--no-sandbox`，再换 390px iframe，还是不退出。

我最后在 24 分钟把这轮停了，再用统一 Playwright 脚本重新判。

所以 80.8 分钟这个总耗时，我没有把等待删掉。工具会不会把浏览器关好，本来就是使用体验的一部分。

## 跑完以后，我会怎么选

这几个分只代表 7 月 17 日这轮同机测试：

- Kimi Code + K3：9.1
- Claude Code + K3：8.5
- Codex：8.9
- OpenCode + MiniMax M3：8.4

Kimi Code + K3 的 9.1 来自 80/80 和 1M 上下文，扣在慢。

Claude Code + K3 的前端挺惊喜，复杂问题也稳，但 80.8 分钟实在有点久。它适合已经习惯 Claude Code，又正好需要 K3 1M 的人。我不会把它当日常默认入口。

Codex 这轮只有 76/80，我平时还是会用得最多。19.8 分钟能把四组都做完，前端和小游戏又最好看。任务后面跟着隐藏测试，它漏的几个点还能继续修。

M3 的位置比较居中。40.4 分钟拿到 78/80，前端也好看，作为 OpenCode 里的日常模型完全能用；这次 1M 检索漏了两项，我不会因为配置里写着 1,000,000 就把整仓库细节全交给它。

<figure>
  <img src="/assets/wechat/k3-930k-token-test/06-06-scoreboard.png" alt="四个组合的得分、耗时与视觉评分" loading="lazy" decoding="async">
  <figcaption>四个组合的得分、耗时与视觉评分</figcaption>
</figure>

如果明天还要继续干活，我大概会这么分：

1. 长文档、大仓库、并发状态机，先让 Kimi Code + K3 看。
2. 前端、小游戏和连续改版，让 Codex 先做。
3. Claude Code + K3 留作兼容入口，需要 1M 时再开，不常驻。
4. OpenCode + M3 适合放在中间，做复杂实现或多一个前端候选，最后照样跑统一测试。

我现在的用法很简单：让 AI 多做几版、把边界跑一遍，再由我看截图、试玩、决定留哪个。工具会变，最后这一步暂时省不了。

完整的 80 项结果、93 万 token 原始响应、桌面和手机截图都放在审阅页里。哪一项想看得更细，可以直接按 case 找，不用只信这篇文章哈。

Kevin
