Hi everyone, I'm Kevin.

A few days ago, I opened that voice audition page again.

For the same line — "Beautiful!" — I was already on the fourth version.

This commentary set has 646 lines in total, so four versions means 2,584 audition slots. By the end, I no longer cared much about whether the voice sounded good. I just wanted to know whether it sounded like a goal had just been scored, or like a weather forecast, haha.

Then I flipped through One Kick's development log on the side.

Over 18 active days, I went back and forth with Claude, Codex, and MiniMax 1,289 times. The game now has 500 levels, the core test suite has run as many as 1,626 tests, and all of them pass.

Those numbers look lively. But what really took time was playtesting over and over, cutting features, revising the UI, and sitting with headphones on, listening to the same line again and again.

So people ask me: "Which AI mainly made this game?"

Every time, I don't know whose name to give. I use all three tools, but the work they do differs quite a lot.

The scores below are only my experience from this one project, One Kick — please don't take them as a model leaderboard.

<figure>
  <img src="/assets/wechat/ai-tools-500-levels/01-01-real-game-result.png" alt="One Kick's current real gameplay footage" loading="lazy" decoding="async">
  <figcaption>One Kick's current real gameplay footage</figcaption>
</figure>

## When work had just started, I had Claude give me a crash course

I'm an Android developer. When I started making mini games in June, I knew basically nothing about WeChat mini games, IAA, leaderboards, sharing rules, package size, or review submission.

At the beginning, I asked that kind of huge question too:

> Make me a football mini game.

Claude answered very completely. Gameplay, progression, social, monetization — it had everything. It looked the part, but I still had no idea what the first step should be.

Later I changed how I asked.

I would ask first: what does a player do in their first minute? Which single gameplay mode does version one keep? What should I leave untouched for now? What are the platform's red lines? What does it take to count as ready for acceptance?

After several rounds of asking back and forth like this, a vague idea slowly turned into something I could actually start on.

I would also take the same gameplay mode and have Claude give me several directions. Then I'd keep pushing: which one is most likely to drive new players away? What exactly will version one not do?

That last sentence has now become my standing question.

Because Claude has a habit: it loves making things sound complete. A judgment that could be explained in two sentences can sometimes become a whole page. What's more troublesome is that if my starting assumption was wrong, it may also follow that premise and fill out everything after it beautifully.

So now, when I see an analysis written especially smoothly, I pause first instead. Smooth on paper doesn't mean truly worth doing.

Long explanations and voiceover scripts — I have it help organize those too. After it's done organizing, I still read them aloud myself. Sentences I can't get out of my mouth keep getting cut.

Counting only this project, I give Claude 9.1.

## Once a task enters the repo, Codex is basically the one working

Once the direction is clear, I hand the task to Codex.

It reads the repo, finds the entry points, changes code, runs tests, and also captures screenshots of the changed pages so I can directly see the old-versus-new difference.

The batch generation of 500 levels, the core test suite of up to 1,626 tests, organizing the main package and subpackages, and round after round of UI revisions — much of that was done by it.

My favorite thing about it is that it never minds repetition.

Revising one popup five or six times means a person has to re-find the files, adjust the values, launch the game, and take screenshots again every single time — you get fed up fast. Codex can keep doing these things one after another, and can even put several versions of screenshots side by side. I just look at what feels off and tell it which direction to change.

Of course, when a task isn't stated clearly, it can also give you a real scare.

I once had a feature that had just been finished; the next day I got my hands on it, played it, and deleted the whole thing. The code wasn't broken and the tests passed — the feature simply wasn't worth keeping.

That can't be blamed entirely on the tool. Before starting, I myself hadn't locked down "what version one will not do" either.

There's another habit I've now developed. When Codex says "done," I don't get happy too early.

Green tests mean it's time to enter WeChat DevTools. A normal web page means it's time to get on a real device. A screenshot that looks pretty still has to be squeezed back into a 390-pixel-wide small screen for one more look.

It can also produce many images in one go, which is handy for exploring directions. For the images that finally go into the game and into the official account, I still prefer real device screenshots. Whenever characters, fingers, text, and lighting look even a bit too smooth, it's easy to clock as AI at a glance.

On this project, I give Codex 9.0.

<figure>
  <img src="/assets/wechat/ai-tools-500-levels/02-03-codex-real-evidence.png" alt="Codex's real development and testing records" loading="lazy" decoding="async">
  <figcaption>Codex's real development and testing records</figcaption>
</figure>

## The code hadn't worn me down yet — the 2,584 audition slots arrived first

What MiniMax did most on this project was Chinese voice acting.

Tutorial guidance, goal commentary, failure encouragement, teammate roasting, homepage easter eggs — I would first produce a few voice profiles and emotions, then decide how the character should actually talk.

With a dozen or so lines, this was pretty relaxing. At several hundred lines, it felt completely different.

One earlier commentary set had 646 lines, and I did four full audition rounds. The program first found 72 potentially problematic lines out of the 646; after regenerating them, only 9 were actually recommended for replacement in the end.

The biggest benefit of this kind of tool is very direct: volume scales fast, and Chinese voices are easy to try. For one person wanting to re-version several hundred game voice lines, it's basically impossible without it.

The trouble is just as direct.

For the same line, if the speed, pauses, or stress differ by even a little, the character feels different. Sometimes the script clearly says last-minute winner, but the voice sounds like a weather forecast. Sometimes I just want it a bit more fired up, and it acts like it's dying to shout the microphone apart.

I also had it try BGM. The first time, I didn't lock the requirements down, and it literally sang my English prompt into the song.

I froze for two seconds when I heard it, then had to dutifully add an instrumental-only requirement, plus one more vocal check, haha.

My current approach is: set the character's temperament first, then write the lines. MiniMax produces voices in bulk, and all versions go onto the same audition page. I listen and choose, write the picks into the asset table, and finally go back into the game and listen once more.

The voice factory can be handed to it. The director's job — I still don't dare hand that over for now.

Besides voice, I've also connected to MiniMax-M3 through opencode for implementation tasks that are highly repetitive with clear boundaries. The price is relatively low, and once the requirements are written tightly, the cost-performance is decent. When requirements are still changing every day, I generally don't call it in first.

On this project, I give MiniMax 8.3.

<figure>
  <img src="/assets/wechat/ai-tools-500-levels/03-04-minimax-real-audition.png" alt="MiniMax's real audition page with four versions of 646 lines" loading="lazy" decoding="async">
  <figcaption>MiniMax's real audition page with four versions of 646 lines</figcaption>
</figure>

## Later, I stopped letting the three tools fight over the same problem

Now, when making a new gameplay mode, I usually first clarify the scope with Claude, and have it look for loopholes in the rules too.

Once the direction is set, I hand it to Codex to build into a playable demo. Tests and screenshots come out along with it.

Only if the mode needs a lot of voice work does MiniMax come in to lay down candidates.

On my side, the work is actually very concrete: play on the phone, stare at the images, listen with headphones, then decide whether to keep it, change it, or delete it outright.

At every step, I try to leave something visible. Gameplay has a demo, UI has screenshots, voice has an audition page, code has test results, and review submission means looking at the real backend.

If all that's left is chat logs, a few days later even I can easily lose track of whether something was really finished, or just very completely discussed.

If you already know how to develop and only lack a partner who can keep working inside the repo, I would start with Codex.

If you've just entered an unfamiliar field where gameplay and scope change every day, Claude is better at helping me get the questions asked clearly.

If the project has a large amount of Chinese voice acting, MiniMax is worth wiring in early. Build the audition page at the same time too — otherwise, a few hundred audio clips later, you'll really listen until you start questioning your life.

This is how I use these three tools now.

They can give me a pile of candidates very quickly, but that final call still has to be me tapping on the phone myself, looking with my eyes, listening with headphones.

One Kick is the one below. It's now at 500 levels.

If any level feels bad to play, just leave me the level number. If any voice line sounds weird, feel free to tell me too.

<figure>
  <img src="/assets/wechat/ai-tools-500-levels/04-07.png" alt="Scan the code to try One Kick" loading="lazy" decoding="async">
  <figcaption>Scan the code to try One Kick</figcaption>
</figure>

Kevin
