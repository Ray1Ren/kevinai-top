Last episode, I had just sworn I was permanently unsubscribing from Company A.

The moment Opus 5 dropped this week, I turned right around and reopened the $100-a-month Max.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/01-m0679-en.gif" alt="Sticker | M0679 Eating my words" loading="lazy" decoding="async">
  <figcaption>Sticker | M0679 Eating my words</figcaption>
</figure>

The buy button was right there, but my hand hesitated. I had just said goodbye forever, and however unwilling I felt inside, in the end I gritted my teeth and clicked pay with my right hand. Afterward, I stared at the screen in silence for three seconds.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/02-m0339-en.jpg" alt="Sticker | M0339 Forget it — anger is bad for my health" loading="lazy" decoding="async">
  <figcaption>Sticker | M0339 Forget it — anger is bad for my health</figcaption>
</figure>

## So What Exactly Makes Opus 5 Strong This Time

In short: get the Fable 5 experience at half price, and beat up GPT-5.6-sol on the side.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/03-01.png" alt="Anthropic's official overall performance chart" loading="lazy" decoding="async">
  <figcaption>Anthropic's official performance chart</figcaption>
</figure>

Let me set the terms first: this chart and the ARC-AGI-3 one later are both Anthropic's official benchmarks, not my own tests this round.

When I flipped to the ARC-AGI-3 chart, I paused. It was the first time I'd seen it singled out for praise by an official release. But I didn't stop to marvel — my head had only one question: what on earth is ARC-AGI-3?

I had to dig around before I figured it out: it measures an AI's ability to explore unknown territory. The eval throws the model into a batch of mini-games it has never seen — no manual, no rules, not even what counts as winning.

The model can only click and try things on its own, switch tactics after hitting a wall, and slowly figure out how this strange world works. It clicked for me right away: while others might still be working out which button even moves, Opus 5 is already hunting for the route to clear the game.

That's when I understood how to read the official claim of "roughly 3× the next-best model": dropped into a completely unfamiliar place, Opus 5 figures out the rules faster than the rest.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/04-05-arc-agi-3.png" alt="Official ARC-AGI-3 chart" loading="lazy" decoding="async">
  <figcaption>Official ARC-AGI-3 chart</figcaption>
</figure>

Still, figuring out rules and actually building a game are two different things. This chart shows Opus 5 can find its way in unfamiliar environments; whether it can build a genuinely playable game from scratch has to wait for the head-to-head tests below.

Anthropic's official page also quotes partner feedback: for animation, games, and 3D, this is the best the Opus series has ever been.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/05-opus5-emergent-official-quote-focus.png" alt="Anthropic's official partner quote" loading="lazy" decoding="async">
  <figcaption>Anthropic's official partner quote</figcaption>
</figure>

This time I'm only verifying two more direct questions:

- Are the games Opus 5 builds actually fun to play?
- Put Fable 5 next to it — where exactly do the two sibling models differ?

Last episode I didn't include Company A's models in the formal tests. Now that I've re-subscribed, I'm testing Opus 5 and Fable 5 together in one go.

## Don't Want the Process? The Results Are Right Here — Leave a Like Before You Go

This round I set four tasks: build a 2D game, build a 3D game, generate a web page, and look at 50 images.

Why these four? The recent batches of models have improved noticeably at building 2D and 3D games. What used to merely run is now starting to look like a real finished product.

Front-end is a must-test too. Every vendor has been grinding the web-dev leaderboards lately, but the aesthetics of the pages they build vary wildly — something you can't see from the charts alone.

Image recognition and understanding is one I deliberately added this time. These days, talking to an agent often means tossing over a screenshot plus a few lines of text. If it misreads the image at step one, everything after — no matter how fast — is wasted.

Putting the four tasks together, what I want to see is their combined level at game-building, front-end coding, and image reading.

One caveat up front: this round only covers the four items above, not everything these models can do. The results below represent this round of testing only — take them as one reference point.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/06-v2-quality-overall-en.png" alt="Overall average quality score across the four tasks" loading="lazy" decoding="async">
  <figcaption>Overall average quality score across the four tasks</figcaption>
</figure>

<figure>
  <img src="/assets/wechat/opus-5-eight-models/07-v2-breakdown-2x2-en.png" alt="2×2 overview of per-task total scores" loading="lazy" decoding="async">
  <figcaption>2×2 overview of per-task total scores</figcaption>
</figure>

**Conclusion one: Opus 5 ranks first on quality in all four tasks, and its overall average of 94.4 is also the highest of the field.** GLM 5.2 averages 70.8 across three tasks, second from the bottom; last place is MiniMax M3 at 70.4.

**Conclusion two: Opus 5 delivers the best results, but its cumulative cost across the three agent tasks is also the highest.**

Token consumption first. All three cumulative charts are ordered by quality rank, Top 1 to Top 8, so you can read cost directly against quality.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/08-v2-token-cumulative-summary-en.png" alt="Cumulative tokens across the three tasks" loading="lazy" decoding="async">
  <figcaption>Cumulative tokens across the three tasks</figcaption>
</figure>

Across the three tasks, Opus 5 added 1.432 million new tokens and 38.709 million cached-input tokens — both the highest of the field. Note that the 38.709 million is the cumulative cached input across turns, not a single context length. Why it piled up this high, I'll explain later alongside its call chain.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/09-v2-api-cost-cumulative-summary-en.png" alt="Cumulative API-equivalent price across the three tasks (estimated)" loading="lazy" decoding="async">
  <figcaption>Cumulative API-equivalent price across the three tasks (estimated)</figcaption>
</figure>

Converted at each vendor's listed API price, Opus 5's three-task total comes to about $43.39 — again the highest of the field; Fable 5 is $32.36. What's being compared here is the cumulative equivalent price of finishing this round's three agent tasks, not the models' unit prices themselves. In the token chart, new tokens = non-cached input + output; cached input is listed separately and is not added to new tokens.

All prices are estimates. Qwen 3.8 Max Preview has no official pricing yet; its three-task total of about $5.79 is estimated at Qwen 3.7 Max's official list price, without applying the limited-time half-price offer running through July 31. Kimi is converted at the USD/CNY central parity rate of 6.7939 on July 24, 2026.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/10-v2-cost-score-scatter-en.png" alt="API-equivalent price vs. average score across the three tasks" loading="lazy" decoding="async">
  <figcaption>Further left is cheaper; higher is better</figcaption>
</figure>

On the two-dimensional price-versus-score chart, Opus 5 sits at the top-right corner: highest quality, biggest cost. Its API unit price is lower than Fable 5's, but on complex tasks it thinks longer and burns more tokens, so the whole task ends up pricier. **A lower unit price does not mean a cheaper task.**

I went back through Opus 5's logs for all three tasks. After each version, it would run the build itself and fix what it found. On the slingshot game it fixed infinite scrolling and level overlap; on the 3D game it added collision and mobile touch controls; on the launch page it adjusted the composition back and forth several times. The three tasks ran 218 turns in total, 42 of them spent testing, screenshotting, or doing acceptance checks.

Putting the other three side by side makes it clearer:

| Model | Visible turns | Tool calls | Cached input per turn |
|---|---:|---:|---:|
| Opus 5 | 218 | 205 | 178K |
| Fable 5 | 114 | 111 | 94K |
| GPT-5.6 | ~78 | 75 | ~80K |
| Kimi K3 | 223 | 331 | 129K |

*Both Opus 5 and Fable 5 ran inside Claude Code, so they're directly comparable. GPT-5.6 and Kimi K3 came from different clients; turn counts are rough estimates from their respective logs.*

Opus 5's turn count is about 1.9× Fable 5's, and far above GPT-5.6's. Kimi K3 ran 5 turns more than it, so call volume alone explains only part of the gap. The other difference is starker: Opus 5 carried back an average of 178K cached tokens per turn, the highest of the four. It's willing to try more times, and it also keeps dragging a longer context along — that's how the time and cost pile up.

To me, this rhymes with the try-it-yourself, feel-out-the-rules drive we saw in ARC-AGI-3, and it may be one reason its finished products are more complete. But that's just a phenomenon I observed in this round's logs — Anthropic has never said Opus 5 trades more tokens for exploration ability.

**Conclusion three: Opus 5 is number one on quality, and it is genuinely on the slow side.**

<figure>
  <img src="/assets/wechat/opus-5-eight-models/11-v2-speed-cumulative-summary-en.png" alt="Cumulative time across the three tasks" loading="lazy" decoding="async">
  <figcaption>Cumulative time across the three tasks</figcaption>
</figure>

Opus 5 spent 175.9 minutes across the three tasks; only Kimi K3's 238.5 minutes was longer. It isn't the slowest of the field, but waiting for it to hand in its paper is a real test of patience.

> By minute 60, I no longer cared when it would finish — I just wanted to confirm the progress bar was still alive.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/12-m4259-en.jpg" alt="Sticker | M4259 Yang Mi: Are You Okay?" loading="lazy" decoding="async">
  <figcaption>Sticker | M4259 Yang Mi: Are You Okay?</figcaption>
</figure>

This second section really boils down to three sentences: highest quality, highest cumulative cost, and on the slow side. If you can't be bothered with the process, you can leave here; if you still want to see the finished builds and the bugs, read on.

## Eight Models Crammed Into Two Months — Let's Straighten Out the Timeline First

There really are a lot of names in this wave. I had to line them up against the release records myself to keep them straight, so I just drew them into a timeline.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/13-model-timeline-8-way-en.png" alt="Eight-model release timeline" loading="lazy" decoding="async">
  <figcaption>Eight-model release timeline</figcaption>
</figure>

Five models are newly run this week: Opus 5, Fable 5, Grok 4.5, Qwen3.8-Max-Preview, and GLM 5.2.

Why pull in five at once? They're all brand-new models released in the last month or two, and the hype is hot right now. If I tested one per episode, by the time I got to the fifth, the first one's news would be stale. Better to throw the same problem set at all of them and run it in one go.

First, two pieces of new-model news: Qwen 3.8 and Grok 4.5.

There's an English sentence in Qwen 3.8's official announcement that, as it got passed around, had its direction completely flipped.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/14-qwen-second-only-highlight-crop.png" alt="Qwen's official original post, annotated version" loading="lazy" decoding="async">
  <figcaption>Qwen's official original post, annotated</figcaption>
</figure>

Some people online relayed the line as "beats Fable 5 on paper." "Beats" and "second only to" point in opposite directions. Whether it's just a hair behind or quite a ways back on the game tasks, we'll see directly from the finished builds later.

The other is Grok 4.5, released on July 17 by Elon Musk's xAI.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/15-grok45-xai-official-page.png" alt="The Grok 4.5 page on xAI's official site" loading="lazy" decoding="async">
  <figcaption>The Grok 4.5 page on xAI's official site</figcaption>
</figure>

Grok 4.5 added a new batch of science, engineering, and math data in training. The Grok Build I used this round already defaults to it — it can read images and call tools, with a 500K context.

Let me also account for the money. What follows are the memberships or plans I actually used this time, not each model's API unit price.

- **Opus 5:** Claude Max, $100/month; re-subscribed for this test.
- **Fable 5:** Shares the same $100/month Claude Max as Opus 5 — no separate purchase.
- **Grok 4.5:** Grok Build is currently free for a limited time; I also subscribe to SuperGrok at $30/month.
- **Qwen 3.8:** Alibaba Cloud Token Plan Standard; first-month discount of 139 yuan when I bought it.
- **GLM 5.2:** Shares the same 139-yuan first-month Token Plan as Qwen 3.8 — no separate payment; this is not an official Zhipu membership.
- **GPT-5.6-sol:** The Codex Pro membership carried over from last episode, about $200/month.
- **Kimi K3:** Kimi Code Allegro, 699 yuan/month, roughly $100.
- **MiniMax M3:** MiniMax Ultra, 469 yuan/month; I also use it for audio and everyday coding.

> My wallet: whose new model launched this week?

<figure>
  <img src="/assets/wechat/opus-5-eight-models/16-m0781-en.jpg" alt="Sticker | M0781 I'm broke" loading="lazy" decoding="async">
  <figcaption>Sticker | M0781 I'm broke</figcaption>
</figure>

## How I Tested These Eight Models

Each model ran through its corresponding CLI, with the highest reasoning tier available at the time switched on.

| Model | Tools & tier this round | Context |
|---|---|---|
| Opus 5, Fable 5 | Claude Code 2.1.220, max | 1M |
| Grok 4.5 | Grok Build CLI 0.2.112, high | 500K |
| Qwen 3.8 | Qwen Code 0.21.0, Preview | 1M |
| GLM 5.2 | Qwen Code 0.21.0, thinking | 1M |
| Kimi K3 | Kimi Code 0.26.0, max | 1M |
| GPT-5.6-sol | Codex CLI, xhigh | 258K |
| MiniMax M3 | mmx / OpenCode path | 1M |

What I'm testing is the "model + CLI" combination. Everyone gets the same task and the same batch of assets, and I don't add hints midway; the clock runs from launch to stop, with thinking, testing, and bug-fixing all counted.

Once the builds were done, I masked the model names and play-tested them one by one. For games I looked at quality and speed; for image reading I checked answers directly. In the combined charts, some scores for GPT-5.6-sol, K3, and MiniMax M3 carry over from last episode.

## Task 1: Build a 2D Angry Birds-Style Mini-Game

To allow a side-by-side comparison with last episode, I reused the same task. If you missed the last one, no problem: it asks the model to build an original 2D slingshot physics mini-game. The gameplay will remind people of Angry Birds, but the characters, art, and sound effects all have to be made from scratch.

The specific requirements are just as plain: at least three levels, drag to charge, release to fire, buildings that can collapse, and a skill you can trigger while the ball is still mid-air.

On the same task, the top two are only 1 point apart, while third place onward quickly spreads out. Keep this gap in mind — it gets more interesting when we look at the actual gameplay.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/17-v2-2d-total-en.png" alt="2D 'Slingshot Siege' total-score chart" loading="lazy" decoding="async">
  <figcaption>2D 'Slingshot Siege' total-score chart</figcaption>
</figure>

<figure>
  <img src="/assets/wechat/opus-5-eight-models/18-v2-2d-detail-en.png" alt="2D game four-dimension scores" loading="lazy" decoding="async">
  <figcaption>2D game four-dimension scores</figcaption>
</figure>

Opus 5 scored 95.0, first place — and it's also the build I played the longest on this task.

It doesn't just recolor the balls. Some can dive-bomb, some detonate on the spot, and some split into three. Switch ball types and your playstyle has to change with it — each level stops being the same rubber-band pull repeated.

I'd planned to play each build for a few minutes and move on. With Opus, I tried every ball type and then played a few more levels.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/19-2d-opus5-abilities.gif" alt="Three crystal cores: dive, blast, triple-split" loading="lazy" decoding="async">
  <figcaption>Three crystal cores: dive, blast, triple-split</figcaption>
</figure>

Collapsing buildings also chain into each other. Hit one spot and the structure next to it may come down too.

The price of fun is slowness. It took 55.2 minutes — I refilled my tea twice in the middle.

Its sibling Fable 5 took only 13.2 minutes — the fastest of the field — and scored 84.8. One hands in the paper early; the other grinds away slowly. Same task, and the waiting time differs by more than a factor of four.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/20-2d-fable5.gif" alt="Fable 5's 2D gameplay" loading="lazy" decoding="async">
  <figcaption>Fable 5's 2D gameplay</figcaption>
</figure>

K3 finally finished this time too. With the 40-minute limit removed, it took 92.3 minutes and scored 88.3. The standardized screen recording pressed space just 180 ms after launch, so the targeted detonation triggered too early and both shots blew up mid-air. I almost mistook a gameplay mechanic for a bug. Once a real person took over, all three levels were clearable, with a total score of 7990.

GPT-5.6-sol is scored directly at 94.0 this time. It has one small issue that really steals the show: after the ball flies off, the rubber band stays glued to it, like a piece of gum you can't shake off. It doesn't stop you from clearing levels, but you see it on every single launch.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/21-2d-gpt56-last-round.gif" alt="GPT-5.6-sol's 2D gameplay from last episode" loading="lazy" decoding="async">
  <figcaption>GPT-5.6-sol's 2D gameplay from last episode</figcaption>
</figure>

GLM 5.2 scored 74.0. The visuals barely lost points, but the gameplay foundation wasn't finished: time progression inside the game gets cut off.

## Task 2: Build a 3D First-Person Shooter

The player moves, aims, and shoots inside a warehouse, clears out all enemies, then long-presses a device to complete the defusal. All assets are generated by the model itself.

First and second place are only 0.3 points apart — nearly a tie. The most obvious difference once you get your hands on them is how smooth the shooting feels.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/22-v2-3d-total-en.png" alt="3D 'Breach Point' total-score chart" loading="lazy" decoding="async">
  <figcaption>3D 'Breach Point' total-score chart</figcaption>
</figure>

<figure>
  <img src="/assets/wechat/opus-5-eight-models/23-v2-3d-detail-en.png" alt="3D game four-dimension scores" loading="lazy" decoding="async">
  <figcaption>3D game four-dimension scores</figcaption>
</figure>

Opus 5 scored 91.3, first place.

Its UI is the most comfortable of the bunch. Health sits in the top-left; the countdown, remaining enemies, and current objective all run along the top; ammo stays bottom-right. There's no ring of numbers crammed around the crosshair, so I don't have to squint sideways for information while shooting.

The gun feel is also the best of the bunch. After you pull the trigger, recoil, muzzle feedback, the hit-marker cross, and the ammo change land almost as one. Short rhythm, fast feedback — there's a real pistol-like crispness to it, nothing like clicking a mouse at a 3D model.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/24-3d-opus5.gif" alt="Opus 5's 3D gameplay" loading="lazy" decoding="async">
  <figcaption>Opus 5's 3D gameplay</figcaption>
</figure>

My gripe: while running, the tops and surfaces of the cargo crates flicker slightly. The automated checks reported nothing, and static screenshots don't show it — only when you actually run around does that flicker catch your eye.

> Automated checks: all green. My eyes: why are the crates still disco-dancing?

<figure>
  <img src="/assets/wechat/opus-5-eight-models/25-3d-opus5-yellow-crate-flicker.gif" alt="Yellow crate close-up: the surface starts flickering after running" loading="lazy" decoding="async">
  <figcaption>Yellow crate close-up: the surface starts flickering after running</figcaption>
</figure>

Fable 5 has the same kind of flicker, only more noticeable, and finished at 83.3.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/26-3d-fable5.gif" alt="Fable 5's 3D gameplay" loading="lazy" decoding="async">
  <figcaption>Fable 5's 3D gameplay</figcaption>
</figure>

The shooting and enemy hit feedback are all there — but the moment the character moves, the flickering crate textures steal the show.

For the rest, I'll only cover what would affect your choice.

Qwen 3.8 is the dark horse on this task at 87.8 — though it also ground away for 69 minutes.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/27-3d-qwen38.gif" alt="Qwen 3.8's 3D gameplay" loading="lazy" decoding="async">
  <figcaption>Qwen 3.8's 3D gameplay</figcaption>
</figure>

In this clip you can see muzzle feedback, enemies dropping on hit, the red damage vignette, ammo changes, and reloading. The 87.8 dark-horse look isn't just pretty on the leaderboard.

In this recording I walk straight toward the defusal device. Partway there I realize I've floated up to the second floor — the stairs never got used. As soon as the character gets near the platform, the height starts rising abnormally; that's the actual bug caught on camera. The stairs: guess I'll just go, then?

<figure>
  <img src="/assets/wechat/opus-5-eight-models/28-3d-qwen38-elevator-bug.gif" alt="Floating up to the second floor after walking straight" loading="lazy" decoding="async">
  <figcaption>Floating up to the second floor after walking straight</figcaption>
</figure>

Grok 4.5 took only 17.9 minutes and scored 73.2. GLM 5.2 scored 62.8. I won't belabor their flaws — go experience them in the Lab yourselves.

## Task 3: Opus 5's Image-Reading Genuinely Shocked Me

When I have an agent modify a game, I often just throw screenshots and error screens at it. Once an image is misread, the analysis that follows can easily veer off track all the way.

This task tests image reading only — no copywriting, no aesthetics. 50 images, four choices per question, answers fixed in advance.

After all 50 images, the leader hadn't missed a single one. More interesting: much of the score gap behind it started from one inconspicuous little target tucked in the corner of a picture.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/29-v2-vision-total-en.png" alt="50-image vision task total-score chart" loading="lazy" decoding="async">
  <figcaption>50-image vision task total-score chart</figcaption>
</figure>

<figure>
  <img src="/assets/wechat/opus-5-eight-models/30-v2-vision-detail-en.png" alt="Vision task four-dimension scores" loading="lazy" decoding="async">
  <figcaption>Vision task four-dimension scores</figcaption>
</figure>

Opus 5 got all fifty right for a perfect 100. On the 15 hardest questions, I ran it three times in a row and it never once changed its answer. **Across both episodes combined, it's the only perfect score.**

Fable 5 scored 96.0. Qwen 3.8 scored 94.8 — not far from Fable, and the rumored "already surpassed" did not happen. At least on this batch of game and interface images, the actual order still has Fable in front.

Grok 4.5's median time per question was just 9.9 seconds, yet it missed 5. On two hard questions, three consecutive runs gave three different answers. Final score: 88.1.

GLM 5.2 was a technical no-show. The access channel it currently runs through doesn't support image input; I tried twice, half an hour in total, and still got no output. This only shows restricted access — it can't be used to judge the model's own vision ability.

After the scores, you still have to open up the wrong answers. Of Grok 4.5's 5 misses, 3 were counting questions; Fable 5 and Qwen 3.8 also went down together on the snowy-headcount image. Below are the 2 most typical ones.

### Image 1: The Person on the Far Left — All Three Missed Them

**Original question: how many people can you see in the snow in total?**<br>
What's being tested: counting in a complex scene | Options: 6, 7, 8, 9

<figure>
  <img src="/assets/wechat/opus-5-eight-models/31-v007.png" alt="The snowy-headcount missed question" loading="lazy" decoding="async">
  <figcaption>Snowy headcount: the correct answer is 8</figcaption>
</figure>

The result is interesting: Fable 5, Qwen 3.8, and Grok 4.5 all answered 7 on the first pass; Opus 5 said 8 all three times. That little figure on the far left once again became the easiest one to miss.

### Image 2: The B by the Insect's Mouth — Grok Saw Compound Eyes

**Original question: what part does label B point to in the insect diagram?**<br>
What's being tested: scientific schematic | Options: mouthparts, legs, compound eyes, antennae

<figure>
  <img src="/assets/wechat/opus-5-eight-models/32-v037.png" alt="The insect-anatomy missed question" loading="lazy" decoding="async">
  <figcaption>Insect labeling: the correct answer is "mouthparts"</figcaption>
</figure>

Grok 4.5 read the mouthparts as compound eyes, with 91% confidence; the other three all answered correctly.

Put these 2 images side by side, and Opus 5's perfect score is more than just a 100 on a chart. Small-target counting and professional schematics — it didn't drop the ball on either.

## Task 4: No Assets Given — A Direct Test of Each Model's Front-End Aesthetics

Last time I tested a page for my own product, where the brand, structure, and business requirements were all nailed down, leaving the models little room to improvise. The result showed completeness, but not each model's own taste.

So this time I switched to a more open-ended task: build a product launch page for a fictional mechanical keyboard, the "Shenglü 75." All eight ran it fresh, side by side.

Not a single asset image was provided. The keyboard's shape, materials, lighting, and five colorways all had to be drawn in code. What I wanted to see was equally direct: who typesets better, who understands materials and color, and who can make a nonexistent product feel premium.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/33-v2-aesthetic-total-en.png" alt="Product launch page total-score chart" loading="lazy" decoding="async">
  <figcaption>Product launch page total-score chart</figcaption>
</figure>

<figure>
  <img src="/assets/wechat/opus-5-eight-models/34-v2-aesthetic-detail-en.png" alt="Product launch page four-dimension scores" loading="lazy" decoding="async">
  <figcaption>Product launch page four-dimension scores</figcaption>
</figure>

After viewing all eight launch pages, the one that truly wowed me was Opus 5's. Despite getting zero asset images, it rendered a nonexistent keyboard in full as a tactile 3D centerpiece.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/35-aes-opus5-visual-transition.gif" alt="Opus 5's launch page transitions" loading="lazy" decoding="async">
  <figcaption>Opus 5's launch page transitions</figcaption>
</figure>

Scrolling down is where the craft shows. Keycaps, switches, and the base unfold layer by layer, then the keys settle back onto the board one by one. The whole animation is silky smooth, and the metallic sheen shifts with your viewing angle.

Switching among the five colorways isn't a simple recolor either. When you tap Dusk-Mountain Purple, Moon White, Deep Indigo, Rouge, or Ink Black, the new colorway ripples across the keyboard row by row, like a wave spreading over water from one side — even the keycaps come alive with it.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/36-aes-opus5-color-switch.gif" alt="Opus 5's launch page colorway switching" loading="lazy" decoding="async">
  <figcaption>Opus 5's launch page colorway switching</figcaption>
</figure>

What's rarer: none of the five colorways is a web-filter-style reskin. Each one's brightness, materials, and keycap pairing stay close to a real mechanical keyboard — the kind of colorways a brand would actually sell. Watching them switch back and forth, I found it hard to imagine this 3D keyboard was entirely code rendered in a web page.

I scrolled this page back and forth quite a few times and was genuinely a little stunned. This animation is hard to convey through screenshots alone. I really recommend opening the complete build in the [Lab](/en/lab). Scrolling through it yourself says more than me praising it here all day.

Fable 5 took another approach. Metallic reflections, gold ESC and spacebar, per-key dimensional layering, a starfield particle background — everything stacked toward texture. It spent just 30 minutes and scored 87.8.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/37-aes-fable5.gif" alt="Fable 5's launch page in action" loading="lazy" decoding="async">
  <figcaption>Fable 5's launch page in action</figcaption>
</figure>

GPT-5.6-sol took 13.3 minutes and scored 90.3. Looking at the actual page, it felt about the same to me as Fable 5: nothing went wrong, but nothing wowed me either — the whole page still carries a fairly heavy AI flavor.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/38-aes-gpt56-smooth.gif" alt="GPT-5.6-sol's launch page in action" loading="lazy" decoding="async">
  <figcaption>GPT-5.6-sol's launch page in action</figcaption>
</figure>

Kimi K3 took 69.3 minutes and scored 82.3. Its purple-and-white keyboard grabs you at first glance — big centerpiece, clean lighting, restrained purple accents — and the page's completeness and brand feel are both solid.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/39-aes-kimi-k3.gif" alt="Kimi K3's launch page in action" loading="lazy" decoding="async">
  <figcaption>Kimi K3's launch page in action</figcaption>
</figure>

Grok 4.5 scored 81.2 and made the page that most looks like it's actually selling something. A navbar, a golden headline "Hear the Keys Fall into Rhythm," plus a spec strip — 75%, tri-mode, 30 days, ¥1299 — it looks ready to go on sale tomorrow.

MiniMax M3 took just 12.9 minutes — the fastest of the field — and also the lowest score, 71.2.

## One Last Look at the Bill

Finally, I tallied token consumption and cost. Converted at listed API prices, Opus 5 comes to $43.39 and Fable 5 to $32.36 — a difference of $11.03.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/40-v2-cost-opus5-fable5-en.png" alt="Opus 5 vs. Fable 5 API-equivalent cost comparison" loading="lazy" decoding="async">
  <figcaption>Opus 5 vs. Fable 5 API-equivalent cost comparison</figcaption>
</figure>

This is an API-equivalent cost. Max didn't actually charge this amount; how the quota converts, Anthropic hasn't disclosed, and I didn't keep per-task usage screenshots.

The gap comes mainly from 2D. Opus 5 took 55.2 minutes and $17.13; Fable 5 took 13.2 minutes and $6.07. I waited 42 extra minutes and paid $11.06 more. The 3D game and the launch page differ by only a few cents.

## Which Model to Pick

### First Pick, GPT-5.6-sol: Steady Overall, Great Value

If I could only pick one for most people today, I'd start with GPT-5.6-sol. It didn't steal the show on any single task, but it rarely drops the ball overall. 94.0 on 2D, 89.2 on 3D, 90.3 on the launch page — basically all in the top tier.

And it doesn't come with Opus 5's wait-an-hour-at-any-moment pressure. Weighing quality, speed, and the subscription cost I already carry, using it first for everyday coding, games, and front-end work makes more sense.

### Second Pick, Kimi K3: The Open-Source-First Choice

K3's overall level is genuinely high. 88.3 on 2D after the time limit was removed, 91.0 on 3D, 96.7 on vision, and 82.3 on aesthetics.

Across the four tasks, it's the open-source number one on this problem set. If open source matters more to you, K3 is my first recommendation. Its main problem is slowness. If you're really going to build a full project with it, budget enough time.

### Third Pick, Qwen 3.8: 139 Yuan First Month, Good for a Taste

Qwen 3.8 is a new model on the domestic open-source track. This round it hit 87.8 on 3D and 94.8 on vision — already biting at the heels of the top tier.

When I bought it, the Token Plan's first-month discount was 139 yuan. At that price, experiencing a domestic agent model is great value — and it deserves a chance on the field.

The boundaries need stating too: it's still a Preview, and the 3D task took 69 minutes. Cheap doesn't mean fast — but at this price it's genuinely worth a try.

### Fourth Pick, Opus 5: Fine to Watch From the Sidelines — No Need to Force It

Opus 5 took first on all four tasks. Its 3D scenes, UI, and gun feel are also the best of this round. Impressive as it is, I'm content to stand aside and admire the scores.

If I someday hit a complex 3D or front-end job that other models can't handle, I'll consider calling on it then. For everyday use, there's no need to force your way onto first place.

## Final Thoughts

Opus 5 is genuinely the strongest this round, but I won't whitewash Company A because of it.

Building a good model is the engineers' skill; a company striking a high-and-mighty pose toward its users is another matter. Don't expect that shipping a strong model and tossing out a few pretty charts will make everyone forget old scores. Users aren't chives who get amnesia after reading a benchmark, and they're certainly not PR staff who pay money and still have to spin for it. **A strong product is not a get-out-of-jail-free card for arrogance.**

<figure>
  <img src="/assets/wechat/opus-5-eight-models/41-m0302-en.jpg" alt="Sticker | M0302 Haven't you been dramatic long enough?" loading="lazy" decoding="async">
  <figcaption>Sticker | M0302 Haven't you been dramatic long enough?</figcaption>
</figure>

My biggest takeaway after this review: iteration in this industry is still accelerating, and each vendor is betting on a somewhat different direction — **any one of them could pull something new out of the bag in the next version.** Today's number one may not still be sitting there a few months from now, and nobody dares guarantee whose turn is next.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/42-m2857-en.jpg" alt="Sticker | M2857 Heart-flutter index rising" loading="lazy" decoding="async">
  <figcaption>Sticker | M2857 Heart-flutter index rising</figcaption>
</figure>

A couple of days ago, a transcript of Liang Wenfeng's investor meeting leaked. 21 Finance pulled together the chip-related parts, and the wording there is blunt: **domestic AI chips as a whole are still about two years behind;** Huawei's 950 supernode needs four cards to match one NVIDIA card; and to get the same job running, **he can accept a price even 50% to 100% higher.** The full circulating transcript has one more critical line: DeepSeek is willing to buy the Huawei 950, and willing to work with Huawei to get the ecosystem up and running.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/43-21finance-huawei950-focus-underlined.png" alt="Key screenshot from 21 Finance's original piece: Huawei 950 supernode, price and performance assessment" loading="lazy" decoding="async">
  <figcaption>Screenshot of 21 Finance's original piece</figcaption>
</figure>

Let me toss out a few quick takes: pairing domestic models with domestic compute may be the more correct — and steadier — path.

1. **Less hostage to overseas compute.** When it matters, we need our own cards and our own supply in hand, so nobody can grab us by the throat.

2. Foster a positive cycle between domestic models and domestic compute: only when domestic models commit to domestic chips for the long haul will chipmakers have real demand; as the chips keep improving, models get steadier homegrown compute in return. AI and semiconductors holding each other up — once this cycle truly starts spinning, China's AI industry becomes more competitive.

3. **Keep overseas overvaluation, compute price hikes, and blind expansion from propagating all the way into China.** Even if the AI bubble abroad keeps inflating, don't let it spread here.

<figure>
  <img src="/assets/wechat/opus-5-eight-models/44-m0257-en.jpg" alt="Sticker | M0257 Stand up — no kneeling" loading="lazy" decoding="async">
  <figcaption>Sticker | M0257 Stand up — no kneeling</figcaption>
</figure>

The full web builds, scores, and test data from this round are all available in the [Lab](/en/lab).

Sources: Anthropic's "Introducing Claude Opus 5" (July 24, 2026), Qwen's official original post, Reuters, 21 Finance (July 23, 2026), and Yicai.

If this piece saved you from wasting money even once, a like and a Wow are the biggest support you can give me!
