(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('lang') !== 'en') return

  document.documentElement.lang = 'en'

  const copy = new Map([
    ['关卡', 'Level'], ['分数', 'Score'], ['弹药', 'Ammo'], ['剩余弹药', 'Ammo left'],
    ['生命', 'Health'], ['换弹', 'Reload'], ['射击', 'Fire'], ['开火', 'Fire'], ['拆除', 'Defuse'],
    ['暂停', 'Paused'], ['暂停中', 'Paused'], ['已暂停', 'Paused'], ['继续', 'Resume'],
    ['继续游戏', 'Resume game'], ['继续任务', 'Resume mission'], ['重新开始', 'Restart'],
    ['重开', 'Restart'], ['重开本关', 'Restart level'], ['重玩本关', 'Replay level'],
    ['返回主菜单', 'Main menu'], ['回到首页', 'Main menu'], ['下一关', 'Next level'],
    ['从头再来', 'Start over'], ['再来一次', 'Try again'], ['再来一局', 'Play again'],
    ['静音', 'Mute'], ['静音开关', 'Mute toggle'], ['切换静音', 'Toggle sound'], ['声音', 'Sound'],
    ['移动', 'Move'], ['观察', 'Look'], ['瞄准', 'Aim'], ['左键', 'Left click'], ['鼠标', 'Mouse'],
    ['拖拽观察', 'Drag to look'], ['任务目标', 'Objective'], ['当前目标', 'Current objective'],
    ['任务暂停', 'Mission paused'], ['任务完成', 'Mission complete'], ['开始任务', 'Start mission'],

    ['弹弓攻城', 'Sling Siege'], ['原创物理攻城游戏', 'Original physics siege game'],
    ['橡果工坊的星火石，对抗齿轮哨兵的废铁堡垒', 'Launch spark stones from the acorn workshop and bring down the gear guards’ scrap forts.'],
    ['按住星火石向后拖拽，松手发射', 'Pull the spark stone back, then release to launch.'],
    ['飞行中点击 / 按空格，触发一次雷霆震荡', 'Click or press Space in flight to trigger one shockwave.'],
    ['撞塌堡垒，消灭全部齿轮哨兵即可过关', 'Collapse the fort and defeat every gear guard.'],
    ['开始攻城', 'Start siege'], ['选择关卡', 'Choose a level'], ['堡垒告破！', 'Fort breached!'],
    ['全境光复！', 'All forts cleared!'], ['弹尽粮绝…', 'Out of ammo…'],
    ['拖拽发射 · 空中点击触发雷霆震荡 · 空格同样有效', 'Drag to launch · Click in flight for a shockwave · Space works too'],
    ['木栅哨站', 'Timber Outpost'], ['双塔仓库', 'Twin-Tower Depot'], ['石垒王座', 'Stone Throne'],
    ['暮岩前哨', 'Duskrock Outpost'], ['双塔风门', 'Twin-Tower Gate'], ['裂谷王台', 'Rift Keep'],
    ['拖住能量弹向后蓄力，松手轰塌右侧堡垒。飞行途中点击画面或按下空格，释放一次震荡脉冲。', 'Pull the energy orb back and release it into the fort. Click the screen or press Space in flight to fire one shockwave.'],
    ['拖拽瞄准', 'Drag to aim'], ['松开发射', 'Release to launch'], ['空中脉冲', 'Mid-air pulse'],
    ['战场已冻结', 'Battle paused'], ['调整一下策略，准备好再继续。', 'Take a moment to adjust your plan.'],
    ['堡垒已突破', 'Fort breached'], ['关卡完成', 'Level complete'], ['守卫全部被击退。', 'All guards are down.'],
    ['本局分数', 'Round score'], ['本局得分', 'Round score'], ['总分', 'Total score'], ['还有', 'Still'], ['个哨兵没倒下', 'guards remain'],
    ['最高分', 'Best score'], ['· 已解锁', '· unlocked'], ['暂停/继续', 'Pause / resume'],
    ['瞄准核心支柱，连锁撞塌堡垒', 'Aim for a load-bearing pillar and start a chain collapse.'],
    ['拖住左侧能量弹向后拉', 'Pull back the energy orb on the left.'],
    ['拖住能量弹向后拉，虚线会显示预估轨迹', 'Pull the energy orb back. The dotted line previews the trajectory.'],
    ['飞行中点击或按 Space 释放脉冲', 'Click or press Space in flight to release the pulse.'],
    ['游戏状态', 'Game status'], ['暂停游戏', 'Pause game'], ['暂停 / 继续', 'Pause / resume'],
    ['弹弓攻城游戏区', 'Sling Siege play area'], ['拖动左侧能量弹，松开发射', 'Drag the energy orb on the left and release to launch.'],

    ['破门点', 'Breach Point'], ['破 门 点', 'BREACH POINT'],
    ['肃清区域守卫', 'Clear the guards'], ['剩余敌人 5', 'Enemies left 5'], ['撤离倒计时', 'Time remaining'],
    ['拆除中…', 'Defusing…'], ['弹匣 / 备弹', 'Magazine / reserve'],
    ['肃清守卫（5名）→ 拆除北侧仓库的发光装置', 'Clear 5 guards → Defuse the device in the north warehouse'],
    ['情报：废弃海港仓库区内被安放了爆破装置，多名武装守卫驻守。', 'Intel: armed guards are protecting an explosive device inside the abandoned harbor warehouse.'],
    ['突入训练场，', 'Enter the training site, '], ['，随后靠近', ', then approach the '],
    ['长按拆除，在倒计时结束前完成任务。', ' and hold to defuse it before time runs out.'],
    ['瞄准 /', 'Aim /'], ['长按拆除装置', 'Hold to defuse'], ['暂停 (Esc)', 'Pause (Esc)'], ['静音 (M)', 'Mute (M)'],
    ['原创低多边形 · 海港仓库拆弹训练场', 'Original low-poly harbor defusal range'],
    ['左侧摇杆移动 · 右侧滑动观察', 'Move with the left stick · Swipe on the right to look'],
    ['右下按钮：开火 / 换弹 / 拆除', 'Bottom-right buttons: fire / reload / defuse'],
    ['暂无通关纪录 — 来创下第一个纪录', 'No clear time yet. Set the first record.'],
    ['点击后进入鼠标锁定视角；若浏览器拒绝锁定，可用鼠标拖拽观察、单击射击。', 'Click to lock the pointer. If the browser blocks it, drag to look and click to fire.'],
    ['倒计时与敌人已冻结', 'The timer and enemies are frozen.'],
    ['进入暮色海港训练场，穿过双通道仓区，清除守卫并拆除脉冲装置。', 'Enter the harbor training site, clear the warehouse guards, and defuse the pulse device.'],
    ['移动瞄准', 'Move and aim'], ['清除威胁', 'Clear threats'], ['长按拆除', 'Hold to defuse'],
    ['最佳记录', 'Best time'], ['· 最高得分', '· best score'], ['鼠标 / 拖拽', 'Mouse / drag'], ['音', 'Sound'],
    ['用时', 'Time'], ['命中率', 'Accuracy'], ['得分', 'Score'],
    ['行动简报', 'Mission brief'], ['靠近后长按 E', 'Hold E when close'],
    ['移动端提供双区触控与独立行动按钮。', 'Mobile controls use separate movement, look, and action zones.'],
    ['清除区域威胁', 'Clear the area'], ['沿黄色引导进入仓区', 'Follow the yellow guide into the warehouse'],
    ['剩余时间', 'Time left'], ['威胁', 'Threats'], ['长按 E 拆除装置', 'Hold E to defuse'],
    ['沿信标前进 · 清除全部红色目标', 'Follow the beacon · Clear every red target'],
    ['计时、敌人行动与拆除进度已冻结。', 'The timer, enemies, and defusal progress are paused.'],
    ['装置已解除', 'Device defused'], ['海港训练区恢复安全。', 'The harbor training area is secure.'],
    ['重新部署', 'Redeploy'], ['横屏可获得更宽视野，竖屏同样可玩', 'Landscape gives a wider view, but portrait mode is fully playable.'],
    ['触摸控制', 'Touch controls'], ['破门点 · 海港仓库拆弹训练', 'Breach Point · Harbor defusal training'],
    ['原创低多边形 3D 第一人称战术训练场。', 'An original low-poly 3D first-person tactical range.'],
    ['肃清区域内全部敌方目标后，靠近核心装置完成长按拆弹。', 'Clear every hostile target, then approach the core and hold to defuse it.'],
    ['原创低多边形 3D 第一人称战术训练场。\n      肃清区域内全部敌方目标后，靠近核心装置完成长按拆弹。', 'An original low-poly 3D first-person tactical range. Clear every hostile target, then approach the core and hold to defuse it.'],
    ['🔊 声音', '🔊 Sound'], ['长按', 'Hold'], ['/ 触屏拆弹按钮', '/ touch DEFUSE button'],
    ['长按拆弹', 'Hold to defuse'], ['最佳战绩：未记录', 'Best run: no record'], ['换弹…', 'Reloading…'],
    ['肃清仓库内全部敌方目标', 'Clear every hostile target in the warehouse'], ['存活敌人 4', 'Enemies alive 4'],
    ['靠近核心装置', 'Approach the core device'], ['WASD 移动 · 鼠标瞄准 · 左键开火', 'WASD move · Mouse aim · Left click fire'],
    ['拆弹', 'Defuse'], ['向仓库纵深推进', 'Advance into the warehouse'],

    ['一脚晋级', 'One Kick'], ['《一脚晋级》', 'One Kick'], ['500关', '500 levels'], ['500 关', '500 levels'],
    ['微信小游戏', 'WeChat mini game'], ['微信小程序', 'WeChat mini program'],
    ['跳到三步破门挑战', 'Skip to the three-move challenge'], ['跳到主要内容', 'Skip to main content'], ['跳到路线挑战', 'Skip to the route challenge'],
    ['开玩挑战', 'Play challenge'], ['500 关旅程', '500-level journey'], ['真实截图', 'Real screenshots'], ['真实关卡', 'Real levels'],
    ['立即开玩', 'Play now'], ['微信开玩', 'Play in WeChat'], ['暂停动效', 'Pause motion'], ['动效', 'Motion'],
    ['微信小游戏 · 足球路线解谜', 'WeChat mini game · Football route puzzle'],
    ['一滑到底', 'Slide until stopped'], ['足球滑到障碍、边界或球门才停，先看路线再动手。', 'The ball only stops at an obstacle, boundary, or goal. Read the route before moving.'],
    ['500 关逐层加规则', 'New rules across 500 levels'],
    ['泥地、转向、越位、队友/对手、对手门将、黄牌、传送门陆续登场，每关程序验证有解。', 'Mud, turn arrows, offside, teammates, opponents, keepers, yellow cards, and portals arrive over time. Every level is programmatically verified as solvable.'],
    ['微信里直接开踢', 'Play directly in WeChat'], ['搜《一脚晋级》即玩，小程序码在页底等你。', 'Search for One Kick in WeChat or scan the code at the bottom.'],
    ['微信搜《一脚晋级》', 'Search “One Kick” in WeChat'], ['看 500 关怎么升级', 'See how the rules evolve'],
    ['试玩 · 迷你球场', 'Playable mini pitch'], ['三步破门挑战', 'Three-move goal challenge'], ['步数 0', 'Moves 0'],
    ['三星目标 · 3 步内', 'Three-star goal · within 3 moves'], ['球进了！', 'Goal!'], ['三步破门，完美晋级。', 'Goal in three. Perfect clear.'],
    ['重新挑战', 'Try again'], ['看看 500 关怎么升级', 'See how the rules evolve'],
    ['拖动足球、在球场上滑动，或按方向键：朝球门滑出这一脚。路线会在你拖动时提前亮出来。', 'Drag the ball, swipe across the pitch, or use the arrow keys. The route lights up while you aim.'],
    ['提示路线', 'Show route'], ['关卡设计', 'Level design'], ['500 关，不是重复堆量', '500 levels with changing rules'],
    ['规则一层一层加进来，每一层都改写你对路线的判断。点开一级，看看它到底改变了什么。每一关上线前都经过程序验证：必有解。', 'Each new rule changes how the route works. Open a stage to see what it adds. Every published level is programmatically verified as solvable.'],
    ['基础移动', 'Basic movement'], ['前期', 'Early game'], ['中期', 'Mid game'], ['后期', 'Late game'],
    ['泥地', 'Mud'], ['转向箭头', 'Turn arrows'], ['越位', 'Offside'], ['队友/对手', 'Teammates / opponents'], ['队友 / 对手', 'Teammates / opponents'],
    ['对手门将', 'Opposing keeper'], ['黄牌', 'Yellow cards'], ['传送门', 'Portals'],
    ['前期 · 上手', 'Early · Learn'], ['中期 · 变奏', 'Mid · Adapt'], ['后期 · 决胜', 'Late · Finish'],
    ['它改写了', 'What changes'], ['路线卡', 'Route card'], ['保连卡', 'Streak card'],
    ['同一关，从开球到三星晋级', 'One level from kickoff to three stars'], ['开球前', 'Before kickoff'], ['一脚之后', 'After one move'],
    ['三星晋级', 'Three-star clear'], ['现在，轮到你开球了', 'Your turn to kick off'],
    ['复制游戏名，去微信搜索', 'Copy the name and search in WeChat'],
    ['本地原型展示，发布前需微信实扫确认', 'Local prototype. Verify the live code in WeChat before sharing.'],
    ['本页为本地原型展示，玩法、截图与小程序码以正式发布版本为准。', 'This is a local prototype. Gameplay, screenshots, and the mini-program code follow the live release.'],
    ['回到顶部：一脚晋级', 'Back to top: One Kick'], ['页面导航', 'Page navigation'], ['暂停装饰动效', 'Pause decorative motion'],
    ['6 乘 6 迷你球场。拖动足球或按方向键滑动足球，三步内进球。', 'A 6×6 mini pitch. Drag the ball or use the arrow keys to score within three moves.'],
    ['方向按钮', 'Direction buttons'], ['向上滑动', 'Slide up'], ['向左滑动', 'Slide left'], ['向右滑动', 'Slide right'], ['向下滑动', 'Slide down'],
    ['500 关规则旅程', 'Rules across 500 levels'], ['规则进阶列表', 'Rule progression'], ['道具', 'Items'], ['真实关卡截图', 'Real level screenshots'],
    ['上一张截图', 'Previous screenshot'], ['下一张截图', 'Next screenshot'], ['截图切换', 'Screenshot selector'],
    ['三步破门。', 'Score in three moves.'], ['现在开球', 'Kick off now'], ['先看路线再动手', 'Read the route before moving'],
    ['规则逐层加入', 'Rules build over time'], ['逐关验证', 'Verified level by level'], ['每关程序验证有解', 'Every level is verified as solvable'],
    ['热身挑战', 'Warm-up challenge'], ['步数', 'Moves'], ['球门', 'Goal'], ['队友', 'Teammate'], ['晋级', 'Clear'],
    ['路线判断完成', 'Route complete'], ['再挑战一次', 'Try again'], ['你的路线', 'Your route'],
    ['上', 'Up'], ['下', 'Down'], ['左', 'Left'], ['右', 'Right'], ['需要路线提示', 'Show route hint'],
    ['从起点依次向右、向上、向右。', 'From the start: right, up, right.'], ['支持拖动、触摸、方向键', 'Drag, touch, and arrow keys supported'],
    ['等你开球：三步内抵达右上方球门', 'Ready for kickoff: reach the upper-right goal in three moves'],
    ['滚动进入联赛', 'Scroll into the full season'], ['逐关验证有解', 'Every level is verified as solvable'], ['难在判断，不难在碰运气', 'Route reading, not luck'],
    ['先理解停点', 'Read the stopping point'], ['一滑到底 · 停在边界前', 'Slide until stopped · Stop before the boundary'],
    ['判断变化', 'What changes'], ['开局', 'Kickoff'], ['先读路线', 'Read the route'], ['移动后', 'After the move'], ['局面改变', 'New board state'], ['结果收束', 'Clear confirmed'],
    ['左右拖动回放', 'Drag sideways to replay'], ['微信搜', 'Search WeChat'], ['复制名称，去微信搜索', 'Copy the name and search in WeChat'],
    ['无需注册网页账号，直接在微信内搜索。', 'No web account needed. Search directly in WeChat.'], ['长按或微信扫码', 'Long-press or scan in WeChat'],
    ['先看路线，再动这一脚。', 'Read the route, then take the shot.'], ['回到开球区 ↑', 'Back to kickoff ↑'],
    ['路线足球 · 三步破门挑战', 'Route football · Three-move challenge'], ['再动这一脚。', 'then take the shot.'],
    ['右 → 上 → 右', 'Right → Up → Right'], ['现在试一脚', 'Try the challenge'], ['小场大判断', 'Small pitch, big decisions'],
    ['3 步', '3 moves'], ['本关标准解', 'Target solution'], ['每关验证有解', 'Every level is solvable'],
    ['热身赛 · 路线 01', 'Warm-up · Route 01'], ['三步送球入网', 'Score in three moves'], ['已用', 'Used'], ['步', 'moves'],
    ['按住足球向右拖，或使用方向键。', 'Drag the ball to the right or use the arrow keys.'],
    ['一场不断改写的赛季', 'A season of changing rules'], ['开场哨', 'Opening whistle'],
    ['一关，三次判断', 'One level, three decisions'], ['拖动下方进度，查看从读局、传递到三星晋级的完整过程。', 'Drag the control below to replay the route from kickoff to the three-star clear.'],
    ['01 · 先读局', '01 · Read the board'], ['观察角色与球门，预判每次滑行的落点。', 'Read the players and goal, then predict each stopping point.'],
    ['传递', 'Pass'], ['终场哨响之前', 'Before the final whistle'], ['下一脚，', 'The next move,'], ['由你决定路线。', 'you choose the route.'],
    ['无需拼手速。看清阻挡、算准落点，在不断加入的新规则里找到唯一的破门方式。', 'No twitch reflexes required. Read the blockers, calculate the stopping point, and find the scoring route as new rules arrive.'],
    ['打开微信，搜索游戏名称或扫描小程序码。', 'Open WeChat and search for the game name, or scan the mini-program code.'],
    ['一滑到底，路线决定胜负。', 'Slide until stopped. The route decides the result.'], ['回到开球点 ↑', 'Back to kickoff ↑'],
    ['主导航', 'Main navigation'], ['关卡规则', 'Level rules'], ['关卡过程', 'Level sequence'], ['上一步', 'Previous step'], ['下一步', 'Next step'],

    ['先看路线，', 'Read the route,'], ['再出这一脚', 'then take the shot'], ['重置', 'Reset'], ['重置挑战', 'Reset challenge'],
    ['《一脚晋级》把整片球场收进 6×6 格子：一脚滑出，足球沿直线冲到底，停在哪，全看你的判断。右边这块小球场就是真实玩法的缩小版——不用下载，现在就能踢。', 'One Kick turns the pitch into a 6×6 route puzzle. The ball slides until something stops it, and every stopping point depends on your choice. The mini pitch on the right is playable now.'],
    ['这一步踢完别停——往下滑，看 500 关怎么一层层加码。', 'Keep scrolling after this move to see how the rules build across 500 levels.'],
    ['一脚滑出，足球沿直线冲到底，撞到障碍、边界才停——或者径直进门。', 'Choose a direction and the ball slides until an obstacle, the boundary, or the goal stops it.'],
    ['思考的起点：动手之前，先算出这一脚会停在哪一格。', 'Start by predicting exactly where the ball will stop.'],
    ['500 关的节奏：新规则一层压一层，旧规则一个也不退场。', 'Across 500 levels, every new rule stacks on top of the old ones.'],
    ['真卡住了也有退路：', 'If you get stuck:'], ['帮你亮出一条可行路线，', 'reveals one playable route,'],
    ['替你保住连胜纪录。道具是扶手，不是拐杖——路线还是得你自己判断。', 'protects your streak. Items help, but the route is still your call.'],
    ['下面三张来自真实关卡「第 10 关 · 首轮决胜」：开球前、一脚之后、三星晋级。点两侧的卡，或用按钮切换，把这一局翻完。', 'These three shots come from the same real level: before kickoff, after one move, and the three-star clear. Tap the cards or use the buttons to replay the sequence.'],
    ['先看整块球场，想好路线再动手。', 'Read the whole pitch before making the first move.'], ['球停在哪，局面就变成什么样。', 'Each stopping point creates a new board state.'],
    ['压哨破门，下一轮见。', 'Beat the whistle and move to the next round.'],
    ['打开微信，搜索《一脚晋级》。500 关球场已经摆好，第一脚从你今天开始。', 'Open WeChat and search for One Kick. All 500 levels are ready for your first move.'],
    ['《一脚晋级》 · 微信小游戏 · 足球路线解谜', 'One Kick · WeChat mini game · Football route puzzle'],
    ['首屏：三步破门挑战', 'Opening section: three-move goal challenge'], ['《一脚晋级》游戏标志：奖杯、足球与金色徽章', 'One Kick logo with a trophy, football, and gold badge'],
    ['路线卡道具：一张画着球场与虚线路线的卡片', 'Route card showing a pitch and suggested path'], ['保连卡道具：一张画着角旗与火焰的卡片', 'Streak card showing a corner flag and flame'],
    ['截图一：开球前，点按放大查看', 'Image one: before kickoff. Tap to enlarge.'], ['截图二：一脚之后，点按放大查看', 'Image two: after one move. Tap to enlarge.'],
    ['截图三：三星晋级，点按放大查看', 'Image three: three-star clear. Tap to enlarge.'],
    ['真实关卡截图：第 10 关首轮决胜，开球前，剩余 6 脚，三星目标 4 脚内', 'Real level image before kickoff, with six moves left and a four-move three-star target'],
    ['真实关卡截图：一脚之后，足球停在新位置，剩余 5 脚', 'Real level image after one move, with the ball at a new stopping point and five moves left'],
    ['真实关卡截图：三星晋级，本关已晋级，金币加 35', 'Real level image after a three-star clear and a 35-coin reward'],
    ['《一脚晋级》微信小程序码', 'One Kick WeChat mini-program code'],

    ['开球', 'Kickoff'], ['实机回放', 'Gameplay replay'], ['比赛日 · 路线判断挑战', 'Match day · Route-reading challenge'],
    ['不是拼手速。看清停点，选准方向，足球会一滑到底。现在就在右边这块 6×6 球场上，把它送进球门。', 'This is a route puzzle, not a reflex test. Read the stopping points, choose a direction, and guide the ball into the goal on the 6×6 pitch.'],
    ['看规则怎样进场', 'See how each rule enters play'], ['三步破门', 'Score in three'],
    ['按住足球区域向任意方向拖动，松手后足球会滑到停点。', 'Drag from the ball in any direction, then release to slide to the stopping point.'],
    ['02 / 路线联赛', '02 / Route league'], ['从直线到完整规则', 'From straight lines to the full rule set'], ['关，', 'levels,'], ['不是重复堆量。', 'each with a new decision.'],
    ['先学会一滑到底，再逐层面对真正改变路线判断的足球规则。每关都经过程序验证，确保存在可完成路线。', 'Learn the slide-until-stopped move first, then adapt as football rules change the available routes. Every level is programmatically verified as solvable.'],
    ['每次选择一个方向，足球沿直线滑到障碍前或边界。第一件事不是动手，而是看清下一个停点。', 'Each direction sends the ball in a straight line to the next obstacle or boundary. Read that stopping point before moving.'],
    ['方向决定下一次选择的位置', 'The direction sets up your next decision'],
    ['泥地、转向、越位、队友 / 对手、对手门将、黄牌与传送门，不是装饰——它们会重写你眼前的路线。', 'Mud, turn arrows, offside, players, keepers, yellow cards, and portals all change the route in front of you.'],
    ['同一真实关卡 · 三个时刻', 'One real level · Three moments'], ['不是概念图。', 'These are not mockups.'], ['这球真的能进。', 'The route really works.'],
    ['从起脚前判断，到一次移动后的局面，再到三星晋级。点击阶段，或直接在手机画面上左右拖动。', 'Replay the same level before the first move, after one move, and at the three-star clear. Tap a stage or drag across the phone image.'],
    ['开局画面', 'Opening state'], ['下一场，就在微信', 'The next match is in WeChat'], ['路线已经看懂。', 'You have read the route.'], ['现在，正式开球。', 'Now take the first move.'],
    ['滑到底、找停点、破规则。打开微信，搜索公开名称进入《一脚晋级》。', 'Slide, find the stopping point, and solve each new rule. Open WeChat and search for One Kick.'],
    ['微信搜索', 'WeChat search'], ['一脚晋级，返回首屏', 'One Kick, return to the opening'], ['暂停页面自动动效', 'Pause automatic page motion'],
    ['一脚晋级正式品牌标志', 'Official One Kick logo'], ['核心玩法', 'Core gameplay'], ['三步破门试玩区', 'Playable three-move challenge'], ['当前步数', 'Current moves'],
    ['6乘6路线挑战。拖动、滑动、按方向键或使用方向按钮移动足球。', 'A 6×6 route challenge. Drag, swipe, use the arrow keys, or press a direction button.'],
    ['挑战控制', 'Challenge controls'], ['已走方向', 'Moves taken'], ['继续滚动了解五百关', 'Keep scrolling to explore all 500 levels'], ['关卡验证说明', 'Level verification note'],
    ['规则进阶探索器', 'Rule progression explorer'], ['选择一项关卡规则', 'Choose a level rule'], ['实机回放阶段', 'Gameplay replay stage'],
    ['上一个回放阶段', 'Previous replay stage'], ['下一个回放阶段', 'Next replay stage'], ['可拖动的实机截图回放', 'Draggable gameplay screenshot replay'],
    ['一脚晋级真实关卡开局截图，足球尚未移动', 'Real One Kick level before the ball moves'], ['同一真实关卡移动一次后的截图', 'The same real level after one move'],
    ['同一真实关卡三星晋级截图', 'The same real level at the three-star clear'], ['全部三张真实截图缩略图', 'Thumbnails for all three real screenshots'],
    ['查看开局截图', 'View the opening state'], ['开局截图缩略图', 'Opening state thumbnail'], ['查看移动后截图', 'View the state after one move'],
    ['移动后截图缩略图', 'After-one-move thumbnail'], ['查看三星晋级截图', 'View the three-star clear'], ['三星晋级截图缩略图', 'Three-star clear thumbnail'],
    ['微信搜索词', 'WeChat search term'], ['一脚晋级正式小程序码', 'Official One Kick mini-program code'], ['游戏道具展示', 'Game items'],
    ['一脚晋级路线卡道具', 'One Kick route card'], ['一脚晋级保连卡道具', 'One Kick streak card'],

    ['立即开踢', 'Play now'], ['足球会一滑到底。判断阻挡、利用落点，用标准路线', 'The ball slides until stopped. Read the blockers and use the target route'], ['把球送进门。', 'to reach the goal.'],
    ['看看规则如何升级', 'See how the rules evolve'], ['下半场继续', 'Keep scrolling'], ['500 关，', '500 levels,'],
    ['基础动作只需一滑；随后每一批规则加入，都在改变你对路线、落点和先后手的判断。每关都由程序验证有解。', 'The basic move is one swipe. Each later rule changes the route, stopping point, and move order. Every level is programmatically verified as solvable.'],
    ['上下左右，一滑到底。边界和角色决定落点，先读场再动脚。', 'Choose a direction and slide until stopped. Boundaries and players determine the stopping point.'],
    ['真实关卡，不靠反应。', 'A real level with no reflex test.'], ['看你先让谁动。', 'Choose who moves first.'],
    ['路线卡帮你看清下一步，保连卡留住赛场节奏。真正决定晋级的，仍是你对这片', 'A route card reveals the next move, while a streak card preserves momentum. You still decide how to solve the'],
    ['6×6 球场的判断。', '6×6 pitch.'], ['回到《一脚晋级》首页', 'Back to the One Kick home section'], ['《一脚晋级》正式标志', 'Official One Kick logo'],
    ['6乘6足球路线挑战。可拖动、滑动或使用方向按钮。', 'A 6×6 football route challenge. Drag, swipe, or use the direction buttons.'],
    ['足球', 'Football'], ['方向控制', 'Direction controls'], ['真实关卡开始状态', 'Real level at kickoff'], ['足球移动后的真实关卡状态', 'Real level after the ball moves'],
    ['三星晋级的真实关卡状态', 'Real level at the three-star clear'], ['路线卡道具', 'Route card item'], ['保连卡道具', 'Streak card item'],
    ['《一脚晋级》正式小程序码', 'Official One Kick mini-program code'],
  ])

  const regex = [
    [/^关卡 (\d+) · (.+)$/u, 'Level $1 · $2'],
    [/^(\d+) · (.+)$/u, 'Level $1 · $2'],
    [/^最高分 (\d+) · 已解锁 (\d+) 关$/u, 'Best $1 · $2 levels unlocked'],
    [/^剩余弹药奖励 \+(\d+)$/u, 'Ammo bonus +$1'], [/^历史最高 (\d+)$/u, 'Best score $1'],
    [/^剩余敌人 (\d+)$/u, 'Enemies left $1'], [/^存活敌人 (\d+)$/u, 'Enemies alive $1'],
    [/^步数 (\d+)$/u, 'Moves $1'], [/^第 (\d+) 关 · (.+)$/u, 'Level $1 · $2'],
    [/^力度 (\d+)%$/u, 'Power $1%'], [/^第 (\d+) 步/u, 'Move $1'],
    [/^(\d+) 步完成路线$/u, 'Route complete in $1 moves'], [/^进球！(\d+) 步完成挑战。$/u, 'Goal! Challenge complete in $1 moves.'],
    [/^进球！(\d+) 步完成挑战，已经晋级。$/u, 'Goal! Promoted in $1 moves.'],
    [/^标准路线完成 · (\d+) 步$/u, 'Target route complete · $1 moves'],
    [/^正在展示：(.+)$/u, 'Showing: $1'], [/^第 (\d+) 张：(.+)$/u, 'Image $1: $2'],
  ]

  const phraseReplacements = [
    ['《一脚晋级》', 'One Kick'], ['一脚晋级', 'One Kick'], ['破 门 点', 'BREACH POINT'], ['破门点', 'Breach Point'],
    ['木栅哨站', 'Timber Outpost'], ['双塔仓库', 'Twin-Tower Depot'], ['石垒王座', 'Stone Throne'],
    ['暮岩前哨', 'Duskrock Outpost'], ['双塔风门', 'Twin-Tower Gate'], ['裂谷王台', 'Rift Keep'],
    ['开球前', 'Before kickoff'], ['一脚之后', 'After one move'], ['三星晋级', 'Three-star clear'], ['开局，先读路线', 'Kickoff, read the route'],
    ['路线卡帮你看清下一步，保连卡留住赛场节奏。真正决定晋级的，仍是你对这片', 'A route card reveals the next move, while a streak card preserves momentum. You still decide how to solve the'],
    ['6×6 球场的判断。', '6×6 pitch.'],
    ['肃清全部守卫', 'clear every guard'], ['发光装置', 'glowing device'], ['向上', 'up'], ['向下', 'down'], ['向左', 'left'], ['向右', 'right'],
  ]

  function translate(value) {
    if (!value || !/[\u3400-\u9fff]/u.test(value)) return value
    const leading = value.match(/^\s*/u)?.[0] ?? ''
    const trailing = value.match(/\s*$/u)?.[0] ?? ''
    const trimmed = value.trim()
    let next = copy.get(trimmed)
    if (next === undefined) {
      next = trimmed
      for (const [pattern, replacement] of regex) next = next.replace(pattern, replacement)
      for (const [from, to] of phraseReplacements) next = next.replaceAll(from, to)
    }
    return `${leading}${next}${trailing}`
  }

  function translateElement(element) {
    for (const attribute of ['aria-label', 'title', 'alt', 'placeholder']) {
      const value = element.getAttribute?.(attribute)
      const translated = translate(value)
      if (value && translated !== value) element.setAttribute(attribute, translated)
    }
  }

  function translateTree(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      const parent = root.parentElement
      if (parent && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
        const translated = translate(root.nodeValue)
        if (translated !== root.nodeValue) root.nodeValue = translated
      }
      return
    }
    if (!(root instanceof Element) && root !== document) return
    if (root instanceof Element) translateElement(root)
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement
        if (parent && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
          const translated = translate(node.nodeValue)
          if (translated !== node.nodeValue) node.nodeValue = translated
        }
      } else if (node instanceof Element) {
        translateElement(node)
      }
      node = walker.nextNode()
    }
  }

  const path = window.location.pathname
  if (path.includes('/2d/')) document.title = 'Sling Siege · Playable benchmark build'
  if (path.includes('/3d/')) document.title = 'Breach Point · Playable benchmark build'
  if (path.includes('/promo/')) document.title = 'One Kick · Interactive promotion page'

  translateTree(document)
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'characterData') translateTree(mutation.target)
      mutation.addedNodes.forEach(translateTree)
      if (mutation.type === 'attributes' && mutation.target instanceof Element) translateElement(mutation.target)
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title', 'alt', 'placeholder'] })

  window.__BUNDLE_LOCALE__ = { language: 'en', translate }
})()
