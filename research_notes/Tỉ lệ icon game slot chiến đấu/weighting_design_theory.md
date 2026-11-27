# Symbol weighting theory for slot-like randomness (4x4 slot-battle, 14 lines)

Context: 4x4 grid, chains of 3+ along rows/cols/diagonals, 14 lines. Lines = 4 rows + 4 columns + 2 long diagonals (length 4) + 4 short diagonals (length 3). Current weights: Sword 40, Heal 13, Shield 13, Fire 8, Earth 8, Volt 6, Frost 6, Lucky 6 (of 100).

Note on method: several primary pages (Liquipedia PRD, Dota 2 Fandom wiki, Simon Laroche's Tetris randomizer history, Harrigan & Dixon PAR-sheet paper) could not be fetched (403/402/redirect/binary PDF). Facts from those are marked as "search snippet" where only the search summary was seen. All math in "Inferences" sections is my own derivation from the stated grid, not from a source.

## 1. How casino slot math structures symbol tiers, hit frequency, volatility, and mid-tier visibility

### Takeaway
Slots set hit frequency by putting most reel weight on low-pay symbols (and blanks), with top symbols occupying 1–2 stops per reel; typical hit frequency ranges from ~8% (high-volatility classic) to 30–45% (Megaways), and modern video slots push 25–40% of RTP into features so the base game can stay frequent-but-small. Stacks and wilds are the standard tools for making higher-tier symbols land as lines more often than their raw weight would allow.

### Cited Findings
- Hit frequency = winning combinations / total combinations x 100; total combinations = product of stops per reel (e.g. 3 reels x 10 stops = 1,000; 250 paying = 25%). — [PokerNews / search summary](https://www.pokernews.com/casino/casino-terms/hit-frequency.html); [Slot Math Models 101](https://mmccaa-site.pages.dev/blog/slot-math-model-par-sheet-en)
- Industry hit-frequency table (blog source, treat as rough): classic 3-reel high-vol 8–12% (~1 in 8–13); classic low-vol 15–25%; cluster pays 20–30% (~1 in 3–5); 5-reel video 25–35%; Megaways 30–45%. — [Slot Math Models 101](https://mmccaa-site.pages.dev/blog/slot-math-model-par-sheet-en)
- Example 3-reel virtual-reel distribution (128 virtual stops): 7 = 2 stops (1.56%), BAR3 = 5 (3.91%), BAR2 = 8 (6.25%), BAR1 = 12 (9.38%), Cherry = 18 (14.06%), Blank = 83 (64.84%); hit frequency 14.92%. Top-to-bottom paying-symbol weight ratio ≈ 9:1. — [Slot Math Models 101](https://mmccaa-site.pages.dev/blog/slot-math-model-par-sheet-en)
- Example 64-stop reels: Diamond 1/1/1, Seven 2/2/3, Triple BAR 3/3/3, Double BAR 4/5/4, Single BAR 6/6/7, Cherry 8/8/8, Blank 40/39/38. Note per-reel variation (Seven gets 3 stops on reel 3, Double BAR 5 on reel 2) — weights differ per reel to shape outcomes. — [Slot Math Models 101](https://mmccaa-site.pages.dev/blog/slot-math-model-par-sheet-en)
- Typical 96% RTP 5-reel video slot split: low-pay base wins 35% of RTP, high-pay base wins 20%, wild-substitution wins 10%, scatters 5%, free spins 25%, bonus 5%; base game 60–75%, features 25–40%. — [Slot Math Models 101](https://mmccaa-site.pages.dev/blog/slot-math-model-par-sheet-en)
- Example bonus frequency: 1 in 200 spins triggers 10 free spins. The same article's scatter trigger table (4%/6%/8% per reel → 1 in 286/87/39) is internally inconsistent with its own binomial formula (6% per reel, 3+ of 5 ≈ 0.197% ≈ 1 in 507), so do not reuse those table numbers. — [Slot Math Models 101](https://mmccaa-site.pages.dev/blog/slot-math-model-par-sheet-en)
- Hit frequency (how often a spin pays) is distinct from volatility (also accounts for win size); hit frequency sets the balance between how often and how big wins are. — [PokerNews](https://www.pokernews.com/casino/casino-terms/hit-frequency.html); [USPTO 12494107](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12494107)
- Adjusting symbol weights is how designers balance lower- vs higher-paying symbols. — [USPTO 12272207](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12272207)
- Stacked symbols occupy several consecutive positions on a reel, so one reel result fills more of a payline; they also add anticipation as reels stop. Sources disagree on net hit-frequency effect: designers typically offset stacked high-value symbols with lower frequency elsewhere. No primary source quantifies the trade-off. — [Casinos.com stacked symbols](https://www.casinos.com/slot-features/stacked-symbols); [DCReport stacked/expanding wilds](https://www.dcreport.org/2025/05/21/secrets-of-stacked-and-expanding-wild-symbols); [USPTO 9449470 upgradable symbol stacks](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9449470)
- Patents describe symbol conversions driven by stacks (a stack converts neighbouring reels) and stack multipliers — i.e. "converter" mechanics are an established slot tool. — [USPTO 10403093](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10403093); [US11620870B2 stacked reel multipliers](https://patents.google.com/patent/US11620870)
- PAR sheets record not only symbol counts but their positions; e.g. blanks adjacent to a 7 matter separately (relevant to near-miss design). — [UNR thesis (Ennis)](https://www.cse.unr.edu/~fredh/papers/thesis/008-ennis/paper-final-no-code.pdf) via search summary

### Inferences
- Exact chain math for this grid (i.i.d. cells, symbol probability p, ignoring wild): a length-4 line has ≥3 consecutive same symbol with P = 2p³ − p⁴; a length-3 line with P = p³. Expected chain-lines per spin for one symbol: E(p) = 10·(2p³ − p⁴) + 4·p³ = **24p³ − 10p⁴**. For small values, "seen roughly once every N spins" ≈ 1/E.
- With current weights: Sword (0.40) E ≈ 1.28 chain-lines/spin; Heal/Shield (0.13) E ≈ 0.050 → ~1 in 20 spins each; Fire/Earth (0.08) E ≈ 0.0119 → ~1 in 84; Volt/Frost/Lucky (0.06) E ≈ 0.0051 → ~1 in 198. Weight ratio Sword:Volt = 6.7x becomes a chain ratio ≈ 250x. Sword produces ~90% of all chains (1.28 of ~1.42 per spin).
- Compared with slot practice: slots tolerate a ~9:1 top/bottom weight ratio because a 3-reel line needs one specific symbol per reel and the top symbol is supposed to be a jackpot (rare by design). In a battle game every element is a "feature" the player should see, so the slot analogy fits better with slot *features* (target 1 in tens of spins) than with jackpots (1 in thousands).
- Floor from sum-to-1 constraint: with 8 symbols, even perfectly uniform weights (p = 0.125) give each symbol E ≈ 0.044 → ~1 in 22.5 spins, total ≈ 0.36 chain-lines/spin. So with 8 symbols and i.i.d. cells, it is impossible for every element to appear "every few spins" from raw weights alone; you need fewer symbols, wilds/converters, or non-i.i.d. spawning (stacks, clusters, bags).

### Gaps
- No primary par sheet with stacked-symbol frequencies was retrievable; Harrigan & Dixon PAR-sheet paper PDF could not be parsed.
- No authoritative source found for exact base-game hit frequency targets in modern video slots beyond the blog table.

## 2. Compressing the weight spread when chain probability ~ p³; target feature frequency

### Takeaway
Because frequency scales with the cube of weight, designers should pick target frequencies per tier first and invert the formula to get weights (p ≈ (1/(24N))^(1/3) for this grid). Slot practice puts features at ~1 in a few hundred spins with large payoffs, but frequent small hits at 1 in 3–5 spins; for a combat game where elements are core verbs, the "frequent small hit" band is the relevant reference.

### Cited Findings
- Base-game hits in cluster/video slots land roughly 1 in 3–5 spins (20–35% hit frequency); bonus features around 1 in 200 spins in the worked example. — [Slot Math Models 101](https://mmccaa-site.pages.dev/blog/slot-math-model-par-sheet-en)
- Slot designers tune reel strips, symbol weights, paytables and bonus frequency jointly to reach target RTP and volatility (weights and payouts are levers together, not separately). — [Birjand guide (consumer-level)](https://exh.birjand.ac.ir/?p=5072); [USPTO 12412447](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/12412447)
- Patent "Variable symbol sets for variable win frequency gaming" — using different symbol sets to vary win frequency (title only seen; contents not read). — [USPTO 10713903](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10713903)

### Inferences
- Inverse formula (this grid, i.i.d.): target "once every N spins" per element → **p ≈ (1/(24N))^(1/3)** (p⁴ term adds ~5% error at p≈0.15). Values: N=5 → p≈0.20; N=8 → 0.17; N=10 → 0.16; N=15 → 0.14; N=20 → 0.128; N=30 → 0.11; N=50 → 0.094.
- Compression rule of thumb: to make frequency ratio R between two tiers, weight ratio must be R^(1/3). Want Sword 4x as frequent as Volt? weight ratio only 4^(1/3) ≈ 1.6. Want 10x? ratio ≈ 2.15. Current 6.7x weight ratio → ~250–300x frequency ratio.
- Budget check: Σp = 1 forces a trade-off. Example 8-symbol set targeting Sword ~0.9 chains/spin is impossible alongside 7 elements each at N≤10 (7×0.16 = 1.12 > 1). Practical options: (a) Sword ~0.22–0.25 with seven others ~0.11 (each element ~1 in 30, Sword ~1 in 2.5); (b) reduce symbol count to 5–6 so others can reach 0.15–0.17; (c) keep weights but add a wild / converter (see Q4).
- Measure "feature frequency" as P(element chains at least once in a spin) and also "spins until first chain of element X in an encounter"; for combat feel the gap distribution matters as much as the mean (see Q3).

### Gaps
- No published game-design rule of thumb found specifying "each special effect should be visible every N turns" for match/slot-battle games; targets must come from the brief and playtests.

## 3. Bad-luck protection, PRD, pity, bags — applied to symbol spawns

### Takeaway
PRD (linear ramping chance that resets on success), gacha soft/hard pity, and bag randomizers all cap or thin the long tail of droughts while keeping the long-run average. They trade unpredictability and "streaky" moments for consistency; players generally perceive this as fairer because humans expect random sequences to be more evenly spread than true randomness produces.

### Cited Findings
- Dota 2 PRD: on the nth trial since last proc, P(n) = C·n; a proc resets n. C has no closed form and is computed iteratively. Example: Bash nominal 25% → C ≈ 0.0847, guaranteed by trial 12 (1/C ≈ 11.8); per-hit chances ≈ 8.5%, 17%, 25.5%… Purpose: reduce long streaks of procs and long droughts. Warcraft III (origin) encoded incorrect C for high chances. — [Diplograph: Dota 2 PRD](https://diplograph.net/notes/games/randomness/dota-2-prd)
- Additional C values from search snippet only (page not opened): 5% → C ≈ 0.38%, 10% → ≈1.5%, 15% → ≈3.2%. — [dota2.ru mechanics (snippet)](https://dota2.ru/mechanics/view/71-slucajnoe-raspredelenie-v-dota-2/); formula P(X=k) = k!·C·∏(1/i − C) via [Liquipedia (snippet; page returned 403)](https://liquipedia.net/dota2/Random_Number_Generation)
- Genshin Impact soft pity (community-derived, HoYoverse does not publish): 5★ character soft pity begins ~pull 74 (weapon ~63, 4★ ~9); after soft pity each pull adds ~10x base rate. Hard pity at 90. Reported table: 0.6% for pulls 1–73, 2.2% at 74, 5.8% at 75, 8.8% at 76, ≥33% by 80. — [KQM Library gacha](https://library.keqingmains.com/evidence/general-mechanics/gacha); search summary of [Sportskeeda](https://www.sportskeeda.com/esports/genshin-impact-pity-soft-pity-guide-banners)
- Hearthstone: a legendary within every 40 packs (per-set) and in the first 10 packs of a new set, per esports.gg citing a Blizzard support article; forum users dispute whether the 40-pack timer is officially confirmed. — [esports.gg](https://esports.gg/guides/hearthstone/hearthstone-pity-timer); contradicted/disputed by [Blizzard forums](https://us.forums.blizzard.com/en/hearthstone/t/its-official-no-pity-timer/10106)
- Tetris: original used unbiased random (long floods and droughts); NES-era fix rerolled repeats, reducing floods but not droughts; modern 7-bag guarantees an I-piece gap of at most 12 pieces; a 2026 preprint simulation found max I-drought exactly 12 under 7-bag vs mean ~44 maximum under uniform RNG (not peer-reviewed). — [FlowingData summary of Laroche](https://flowingdata.com/2019/09/23/history-of-tetris-randomizers); [preprints.org 202601.2206](https://www.preprints.org/manuscript/202601.2206). One blog claims a 20-piece I-drought still has ~3% chance under 7-bag, which contradicts the 12-piece hard cap — treat as wrong/misreported: [gamertagmythras](https://gamertagmythras.com/blog/tetris/tetris-randomizers-explained)
- Independent rolls: expected chests for k gems = k/p, but the tail is unbounded; in Red Blob's example the mode is 10 chests yet 3% of players need >50. With many players, some get very bad luck. — [Red Blob Games: loot drops](https://www.redblobgames.com/articles/probability/loot-drops.html)
- Bag without storing an array: P(item) = remaining items / remaining draws — needs two counters; it naturally acts as pity. Variation is large when k is small relative to bag size; bags can repeat across the seam between shuffles. Tetris uses 7- or 14-piece bags; Cogmind switched to shuffle; Path of Exile evenly spaces evasion instead of rolling. — [Red Blob Games](https://www.redblobgames.com/articles/probability/loot-drops.html)
- Shuffle bag: fill with desired proportions, draw until empty, refill; a 20% crit = bag of 1 crit + 4 non-crits. Bag must be large enough to stay unpredictable but small enough to avoid being shortchanged. — [Tutsplus shuffle bags](https://code.tutsplus.com/shuffle-bags-making-random-feel-more-random--gamedev-1249t); [Sean Monstar](https://seanmonstar.com/blog/a-less-random-generator/); [Dungeon of the Endless forum](https://community.amplitude-studios.com/amplitude-studios/dungeon-of-the-endless/forums/47-game-design/threads/17720-more-even-randomization-through-shuffle-bags?page=1)
- Sid Meier (GDC 2010): players losing at stated 3:1 odds felt cheated; Civilization Revolution adjusted outcomes using previous results so streaks of losses at favorable odds were reduced; "psychology over simulation". Details of exact mechanism vary across write-ups. — [GameDev.net notes](https://www.gamedev.net/blogs/entry/2111213-the-psychology-of-game-design-sid-meier); [Shacknews: Meier & Pardo](https://www.shacknews.com/article/62807/sid-meier-and-rob-pardo); [Nautilus](https://nautil.us/how-designers-engineer-luck-into-video-games-236363)

### Inferences
- PRD for symbol spawns: keep a per-element "drought counter" d (spins since that element last chained or appeared on the board). Weight multiplier w_eff = w_base · (1 + k·d), reset on chain. Or apply PRD at the outcome level: if element X hasn't chained for d spins, force-seed one line with 2 copies of X (near-guarantee) with probability C·d. Outcome-level is easier to tune because chain prob is ~p³ (raising spawn weight by 2x only raises chain freq ~8x, which overshoots quickly).
- Bag for cell spawns: a 16-cell board drawn from a bag of, e.g., 48 tokens with fixed counts per element guarantees each element appears on the board in proportion over 3 spins; but presence ≠ chain, so bags reduce "never saw Frost" but not "never chained Frost".
- Pros: caps droughts, makes rare elements feel reliable, perceived fairness (Meier, Spotify). Cons: predictable/exploitable ("Volt is due"), lowers excitement of surprise, reduces genuine streaks; hidden manipulation may feel unfair if discovered — consider surfacing it (e.g. a visible element meter).

### Gaps
- Could not verify full Dota PRD C table from a primary page (Liquipedia/Fandom blocked).
- No source found on pity systems applied specifically to slot symbols in non-gambling games.

## 4. Alternatives to raw weights

### Takeaway
Slots and roguelike slot games use per-reel strips, stacks, wilds, symbol converters and player-built pools rather than one global weight table; each changes the effective p per line (not just per cell), which is the lever that matters when frequency ~ p³.

### Cited Findings
- Per-reel weighting is standard: identical symbol sets with different counts per reel (e.g. Seven 2/2/3, Double BAR 4/5/4). — [Slot Math Models 101](https://mmccaa-site.pages.dev/blog/slot-math-model-par-sheet-en)
- Wild substitution is a significant RTP line in modern slots (~10% of a 96% RTP example). — [Slot Math Models 101](https://mmccaa-site.pages.dev/blog/slot-math-model-par-sheet-en)
- Symbol conversion based on stacks (stack converts symbols on other reels) is patented slot mechanics. — [USPTO 10403093](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/10403093)
- Luck be a Landlord: player-constructed symbol pool, 152 symbols; community notes synergies need multiple copies of one symbol and become less likely as more symbols are added (dilution). Exact rarity percentages not found. — [Steam discussion](https://steamcommunity.com/app/1404850/discussions/0/3128289956327877528); [App Store listing](https://apps.apple.com/app/id6450724928)
- Quarriors (dice-bag deckbuilder): discarded dice return to the bag when empty — the same refill cycle as a shuffle bag; a deck has only so many possibilities, unlike dice. — [Game Developer: Randomness in Quarriors](https://gamedeveloper.com/design/randomness-quarriors)

### Inferences
- Wild math (this grid): a wild with cell probability w that substitutes for any element makes that element's effective p ≈ p + w for chain purposes (ignoring all-wild lines). With w = 0.06 (current Lucky, if repurposed as wild): Volt 0.06 → 0.12 → E rises from ~0.005 to ~0.037 (~7x); Sword 0.40 → 0.46 → ~1.5x. Wilds therefore compress the spread naturally, helping rare tiers far more in relative terms.
- Element converter: "after spin, convert 1–2 random Sword cells into the least-seen element" directly raises rare-element chain odds without changing the base table; tune by count converted.
- Clustered spawning (non-i.i.d.): spawn each new cell with probability q of copying a neighbour (like stacked symbols). Raises all chain rates; pair with lower Sword weight to keep total chain rate in budget.
- Guaranteed element per spin: reserve 1–2 cells per spin for a non-Sword element (bag-drawn) — ensures visibility but not chains; a "guaranteed pair" (2 adjacent same element) gives roughly p-level (not p³) chain odds per spin for that element.
- Escalation per spin (PRD on weight) — see Q3; prefer outcome-level ramp because of the cube.
- Player-built pool (Landlord-style) shifts the tier problem to player choice; dilution warning applies — more distinct symbols reduce each one's chain rate (here: 8 symbols already sit at the uniform floor of ~1 in 22 each).

### Gaps
- No quantified data on Luck be a Landlord rarity tiers or spawn odds.

## 5. Psychology: rarity perception, near-miss, variety vs consistency

### Takeaway
Players overestimate streakiness and judge clumped true randomness as unfair; near-misses activate reward circuitry and increase motivation to continue even though they feel unpleasant; designers commonly bend randomness toward perceived fairness.

### Cited Findings
- Clark et al. 2009 (Neuron, n=15 non-problem gamblers): near-misses recruited striatum and insula (also active for wins); near-misses were rated less pleasant than full misses but increased desire to play, most when the player had personal control. — [PMC2658737](https://pmc.ncbi.nlm.nih.gov/articles/PMC2658737); [Science News](https://www.sciencenews.org/article/gamblers-brains-almost-counts)
- Follow-up in regular gamblers: near-miss reward-circuit response, with midbrain response associated with gambling severity. — [PMC2861872](https://pmc.ncbi.nlm.nih.gov/articles/PMC2861872); [SfN 2010](https://www.sfn.org/publications/latest-news/2010/05/04/problem-gamblers-provoked-by-near-misses-to-gamble-more)
- Spotify (Nov 2025): pure random shuffle was used for five years, but "statistical randomness doesn't always translate into perceived randomness"; new default "Fewer Repeats" penalizes recently played tracks appearing early. — [Spotify Engineering](https://engineering.atspotify.com/2025/11/shuffle-making-random-feel-more-human)
- Players treat 2:1 and 20:10 differently and feel cheated losing at favorable odds; Meier biased outcomes to match perception. — [GameDev.net](https://www.gamedev.net/blogs/entry/2111213-the-psychology-of-game-design-sid-meier); [Game Informer](https://gameinformer.com/b/news/archive/2010/03/12/sid-meier-gamers-arent-logical)
- Timing matters, not only counts: two sequences of 3 gems in 10 chests can feel different. — [Red Blob Games](https://www.redblobgames.com/articles/probability/loot-drops.html)

### Inferences
- In this game, "2 Volts in a line + a third elsewhere" is a near-miss; with Sword at 40%, near-misses on rare elements are also rare, so even the anticipation layer is dominated by Sword. Compressing weights raises both near-misses and chains of rare elements.
- Ethics: near-miss exploitation is associated with problem gambling; for a non-gambling combat game, use near-misses for readability/anticipation (highlight 2-in-a-row) rather than to artificially manufacture them.
- Variety vs consistency: a dominant basic attack (Sword) gives consistent combat rhythm; rare elements give variety. A reasonable structure is "reliable baseline + each special visible within a short window" (bounded gap via pity), rather than raw rarity. Whether it is fun must be playtested — automated tests cannot judge this.

### Gaps
- No study found on perceived rarity thresholds (e.g. "if an effect appears less than once per X turns players forget it exists") for games; would need playtest data.
- "Characteristics of Games" (Elias, Garfield, Gutschera) was suggested but not consulted; no citable excerpt obtained.
