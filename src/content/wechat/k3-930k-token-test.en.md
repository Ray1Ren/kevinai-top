<figure>
  <img src="/assets/wechat/k3-930k-token-test/01-01-cover-wide-en.png" alt="K3, M3, and Codex tested on the same tasks" loading="lazy" decoding="async">
  <figcaption>K3, M3, and Codex tested on the same tasks</figcaption>
</figure>

Hi everyone, I'm Kevin.

K3 launched today. When I saw the 1M context, the first thing I did was shove a big file into it.

The first attempt was 4.06MB of plain text, and it immediately threw an error:

```text
total message size 4060326 exceeds limit 2097152
```

A bit awkward. The 1M context is real, but there's also a 2MB gate on each individual message — two separate limits, not the same thing.

So I switched to a corpus of 930,000 fairly dense tokens, and hid 8 codewords at positions 1,000, 80,000, 240,000, all the way out to 928,000. At the end, I asked it to do one summation, one concatenation, and to report the first and last positions while it was at it.

I ran it once through Kimi Code, then wired K3 into Claude Code and ran it again.

Both sides got it right.

Kimi Code actually took in 930,386 prompt tokens; on the Claude Code side it was 930,503 input tokens. All 8 codewords, the positions, the summation, and the concatenation all hit, each run taking around 100 seconds.

<figure>
  <img src="/assets/wechat/k3-930k-token-test/02-02-1m-context-evidence-en.png" alt="Testing K3 with 930k tokens through two entry points" loading="lazy" decoding="async">
  <figcaption>Testing K3 with 930k tokens through two entry points</figcaption>
</figure>

K3's 1M genuinely works. I'm not ready to claim, based on one retrieval test, that it can already comprehend an entire million-token repository — that would be getting carried away. What this test does confirm is that 930,000 tokens went in, and not one of the 8 markers in the middle was lost.

Then I handed the exact same test to MiniMax M3.

OpenCode actually sent 947,635 input tokens; the server accepted them, and along the way it even hit the 32,000-token output cap once, auto-compacted, and kept going. In the end it found 6 of the 8 codewords. After switching to the Claude Code shell, M3 received 930,484 input tokens, took 86.6 seconds, found 7 of them — and still got the summation and concatenation wrong.

Being able to accept 1M only means the door is open. Whether it can accurately find the details inside has to be tested separately.

## The same K3 behaves a little differently in a different shell

I originally planned to test only Kimi Code.

Then it occurred to me: when people talk about whether a model is good, they often conflate the model with the Agent wrapped around it. The system prompt, tool definitions, how files get read, when tests get run — all of these change the outcome.

So I set up a `claude-k3` as well.

It uses Kimi's official compatibility endpoint, with the model set to `k3[1m]`, context set to 1048576, and effort at max. I gave it its own HOME, put the Key in the macOS Keychain, and left my original Claude Code configuration untouched.

If you just want to try it out, these are the key official settings — swap in your own Key:

```zsh
export ANTHROPIC_BASE_URL='https://api.kimi.com/coding/'
export ANTHROPIC_API_KEY='your-kimi-api-key'
export ANTHROPIC_MODEL='k3[1m]'
export CLAUDE_CODE_AUTO_COMPACT_WINDOW='1048576'
export CLAUDE_CODE_MAX_CONTEXT_TOKENS='1048576'
export CLAUDE_CODE_EFFORT_LEVEL='max'
claude
```

Since I use it long-term, I made it a separate `claude-k3` command so it wouldn't fight with my existing Claude login.

Then I ran all four combinations together:

1. Kimi Code + K3
2. Claude Code + K3
3. Codex + gpt-5.6-sol (xhigh)
4. OpenCode + MiniMax M3 (thinking)

Each got an empty directory, the same task spec, no internet access, no installing dependencies, and no peeking at anyone else's output files.

I didn't take their own "all done" claims as the result. At the end I ran hidden tests uniformly; the frontend and the game also had to pass through real Chrome, and I kept desktop and 390px mobile screenshots.

## The easy tasks look boring, but they really do catch things

The first group was 6 common utility functions: duration parsing, interval merging, deep path reading, concurrent map, LRU, and CSV.

24 hidden assertions in total. I deliberately planted edge cases: malformed quotes, prototype pollution, and a rule that no new task may be started after a failure.

The results:

- Kimi Code + K3: 24/24
- Claude Code + K3: 23/24
- Codex: 23/24
- OpenCode + MiniMax M3: 23/24

Both Claude Code + K3 and Codex treated `a"b,c` as valid CSV. M3 accepted the three malformed paths `a.`, `a[]`, and `a[foo]`.

These are exactly the kinds of things that slip past when you're reading code. Normal input runs fine, the demo doesn't blow up — the trouble only shows up when production meets dirty data.

The second group was a concurrent scheduler. Global concurrency, group concurrency, priorities, Promise deduplication, retry backoff, cancellation, and slot release — a lot of intertwined state.

This time both K3s and M3 scored 16/16. Codex got 15/16, tripping on a tiny equals sign: the spec said a retry was allowed only when `transient === true`, and it retried on other truthy values too.

Claude Code + K3 was quite cautious here, taking 963 seconds. Along the way it wrote itself a timing test, deadlocked the test on the first try, and fixed it afterwards. When a model gets serious, it trips over its own feet first, haha.

<figure>
  <img src="/assets/wechat/k3-930k-token-test/03-03-hidden-tests-en.png" alt="Hidden test results for the utility functions and concurrent scheduler" loading="lazy" decoding="async">
  <figcaption>Hidden test results for the utility functions and concurrent scheduler</figcaption>
</figure>

## On frontend work, Codex is still noticeably fast

The third group was a responsive game workbench.

The spec included 7/30/90-day switching, metrics and trend charts, a task list, an activity feed, light and dark themes, a Command Palette, a mobile menu — and explicitly banned gradients and background blur.

Kimi Code + K3 built an editorial-style data dashboard, 18/18, in 905 seconds. Lots of information, but not the usual card wall.

Claude Code + K3 also scored 18/18, with more polished visuals than native Kimi Code. I gave it 9.0. It even reviewed its own screenshot and caught that the Command Palette, despite having `hidden` added, was being overridden back by CSS — it fixed that before submitting.

The problem is slowness: 1767 seconds, nearly half an hour.

Codex took 423 seconds, and its page was the best-looking at first glance — I gave it 9.2. The one thing it missed was the `backdrop-filter` that the spec explicitly forbade.

M3's page surprised me a bit too. It built a dark editing-room look — large serif headlines, thin divider lines — and at first glance it's in the same tier as Codex and Claude Code + K3. I gave it 9.0. It took 1495 seconds, and the point it lost at the end was a painful one: the spec required the exact string `Playtime hours` to appear on the page, and it split `PLAYTIME` and `hours` into two separate places.

<figure>
  <img src="/assets/wechat/k3-930k-token-test/04-04-frontend-comparison-en.png" alt="The same frontend task built by all four combinations" loading="lazy" decoding="async">
  <figcaption>The same frontend task built by all four combinations</figcaption>
</figure>

My feeling about Codex is much the same as when we built *One Kick*: once the direction is clear, it produces a first version fast, and the layout is often better than I expected. The catch is that it misses one or two very specific edge cases, so the hidden tests can't be skipped.

## The mini-game told a similar story: looking good and being fully correct don't always come from the same contestant

The last group was a single-page Canvas mini-game called `Signal Drift`.

A spaceship orbits a center point; click, touch, or press Space to change direction. Collecting cyan beacons adds score and combo, hitting red mines costs a life. It also needed pause, restart, sound effects, mute, particles, a high score, and a fixed seed.

The unified script actually starts the game, changes direction, pauses, collides, plays until death, restarts, then refreshes the page to check the high score.

Kimi Code + K3 scored 22/22. The visuals are very clean; I gave it 8.0.

Claude Code + K3 scored 21/22, with slightly finer visuals; I gave it 8.6. What it missed was internal time: after pausing, calling `step(1000)` left the score and position untouched, but the internal clock still advanced from 0 to 1 second.

Codex scored 21/22, and its visuals were clearly the most finished — I gave it 9.2. When it collected a beacon, it updated the in-memory high score first; when it later checked at game over whether to save, the condition no longer held, so localStorage was never written. Playing by eye, you'd easily think everything was fine — one refresh gives it away.

M3 scored 22/22 in 228 seconds. Functionally it passed very cleanly; the visuals are far more restrained: dark blue background, orbit, spaceship, and a few particles. Playable, and it looks like a prototype that just finished its core loop. I gave it 7.8.

<figure>
  <img src="/assets/wechat/k3-930k-token-test/05-05-game-comparison-en.png" alt="Signal Drift built by all four combinations" loading="lazy" decoding="async">
  <figcaption>Signal Drift built by all four combinations</figcaption>
</figure>

There was also a pretty telling episode in this round.

Claude Code + K3 wrote itself more than 50 Node checks, all passing. Then it opened Chrome to verify the mobile layout. The page results were already written out, but the Chrome process just wouldn't exit. It switched to `--no-sandbox`, then to a 390px iframe — still no exit.

I finally stopped this round at the 24-minute mark and re-judged it with the unified Playwright script.

So for the 80.8-minute total, I didn't trim away the waiting time. Whether a tool closes its browser properly is part of the usage experience.

## After running all this, here's how I'd choose

These scores only represent this round of same-machine testing on July 17:

- Kimi Code + K3: 9.1
- Claude Code + K3: 8.5
- Codex: 8.9
- OpenCode + MiniMax M3: 8.4

Kimi Code + K3's 9.1 comes from 80/80 and the 1M context; it lost points on speed.

Claude Code + K3's frontend was a pleasant surprise and it's steady on complex problems, but 80.8 minutes is really a bit long. It suits people who are already used to Claude Code and happen to need K3's 1M. I wouldn't make it my daily default entry point.

Codex only got 76/80 this round, yet it's still the one I'll use the most day to day. It finished all four groups in 19.8 minutes, and its frontend and game were the best-looking. With hidden tests trailing behind each task, the few points it missed can still be fixed later.

M3 sits somewhere in the middle. 78/80 in 40.4 minutes, with good-looking frontend — perfectly usable as a daily model inside OpenCode. But with two misses on the 1M retrieval this time, I won't hand over every detail of an entire repository just because the config says 1,000,000.

<figure>
  <img src="/assets/wechat/k3-930k-token-test/06-06-scoreboard-en.png" alt="Correctness scores across 80 checks for all four combinations" loading="lazy" decoding="async">
  <figcaption>Correctness scores across 80 checks for all four combinations</figcaption>
</figure>

If I had to keep working tomorrow, I'd roughly split it like this:

1. Long documents, large repos, concurrent state machines — give them to Kimi Code + K3 first.
2. Frontend, mini-games, and iterative redesigns — let Codex go first.
3. Claude Code + K3 stays as a compatibility entry point — open it when 1M is needed, don't keep it resident.
4. OpenCode + M3 fits in the middle — for complex implementations or as one more frontend candidate, with the same unified tests at the end.

My current workflow is simple: have the AI produce several versions, run the edge cases, then I look at screenshots, play with the results, and decide which one to keep. Tools will change; this last step can't be skipped for now.

The full 80-item results, the raw 930k-token responses, and the desktop and mobile screenshots are all on the review page. If you want a closer look at any item, you can find it by case — no need to take this article's word alone.

Kevin
