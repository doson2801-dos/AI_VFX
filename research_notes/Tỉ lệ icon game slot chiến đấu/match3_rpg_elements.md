# Match-3 / Puzzle RPG: elemental tile distribution vs support tiles, and keeping elemental attacks meaningful

Scope note: about 17 tool calls. Several primary wikis (E&P Fandom, PAD Reddit wiki mirror, Small Giant help FAQ) were unreachable (HTTP 402/404/DNS). The numbers below come from official pages where noted, and otherwise from developer forum posts or community wikis. No numbers were invented. Where I did my own arithmetic, it is marked as an inference.

## Q1. What share of the board does each element/tile type get? Are spawns uniform? How common are heal/support tiles?

### Takeaway
The big puzzle RPGs use a small set of colors (5 to 7) and, by developer and community accounts, treat them as near-uniform random drops. Heal is usually one color among equals: the PAD heart orb is 1 of 6. Support effects mostly come from hero colors or skills, not from a separate rare tile. Gems of War's developer gave hard numbers on how color count changes accidental-match frequency. None of the games studied publishes an official per-color skyfall table.

### Cited Findings
- **Puzzle & Dragons:** 5 attribute orbs (Fire, Water, Wood, Light, Dark) plus Heart orbs. Matching hearts restores HP based on team RCV, so heal is a full color on the board alongside the damage colors. — [Mario Wiki: Orb (PAD SMB Edition)](https://www.mariowiki.com/Heart_Orb); [Wikipedia: Puzzle & Dragons](https://en.wikipedia.com/wiki/PazuDora)
- **PAD skill categories:** "Skyfall chance increase", "Enhanced skyfall" and "Locked skyfall" are active-skill categories, and orb changers include "Standard orbs" and "Hazards (Jammer/Poison/Mortal Poisons)". The guide gives no percentages. — [PAD Collaborative Community Guide](https://docs.google.com/document/d/e/2PACX-1vTe0RFt3wNHjFTdehvaGqHyQZUdOizKDxpdRGhd4GN8eXWvYMBno6ZsNoyZoz26h7lNyBU_IvXW0gvP/pub)
- **Gems of War:** developer "Mr.Strange" (official forum) said match games have "very well-established math" on board size versus color count. He called an 8x8 board with 7 colors "in a wonderful spot". Random match chance on 8x8 is about 9% with 7 colors, about 15% with 6 and about 26% with 5. Removing a color makes the board richer in accidental matches. He also said there is "no secret ai parameter adjusting the drop rate". These are averages over varied board states (developer statement, forum). — [Gems of War community forum](https://community.gemsofwar.com/t/noticing-obvious-end-game-unnatural-ai-matches-does-ai-count-4-5-matches-and-try-to-keep-them-even/11568)
- **Gems of War drop distribution:** players recall the developers saying drops after the initial setup are "equally distributed". One player recalls roughly 14% per color for the 6 colors and 16% for skulls ("IIRC", unverified). A player Monte Carlo of 10 million boards, assuming even distribution including skulls, gave about 24.8% chance of a native 4-match extra turn. All community-estimated. — [GoW forum: chance of another move](https://community.gemsofwar.com/t/what-is-the-chance-of-getting-another-move-after-clearing-the-board/34654)
- **Gems of War skulls:** skulls are a separate "damage" gem type that deals direct attack damage instead of charging mana. Matching 4 or 5 of a kind grants an extra turn. — [Tampere Univ. PlayLab review](https://blogs.tuni.fi/playlab/game-reviews/gems-of-war-match-three-with-a-twist/); [Gems of War patch preview 1.0.6](https://gemsofwar.com/patch-preview-1-0-6/)
- **Marvel Puzzle Quest:** 6 basic colors (Red, Green, Blue, Yellow, Purple, Black). Every basic match deals damage and gives AP of that color. Team-Up tiles act like basic tiles but give Team-Up AP. Special tiles (Attack, Countdown, Protect, Strike, Repeater) are created by powers rather than spawned. Charged tiles deal 3x damage and give 3 AP. Critical tiles match as any color and deal extra damage. The official FAQ gives no spawn rates. — [MPQ official help: tile types](https://d3go.helpshift.com/hc/en/3-marvel-puzzle-quest/faq/109-what-types-of-tiles-are-there)
- **Empires & Puzzles:** 5 element colors (Fire, Nature, Ice, Holy, Dark). Healing and support are hero special skills, not dedicated board tiles. Official guidance says a rainbow (5-color) team "covers healing, cleanse, buffs" and spreads mana over five colors. — [Empires & Puzzles official: rainbow vs mono](https://www.empiresandpuzzles.com/news/when-to-use-rainbow-vs-mono-teams)
- **Indie developer moving off pure random:** in a game with 8 gem colors, the developer found uniform random refills often spawned pre-made 3-matches. That gave volatile free damage, and once an enemy took the player from full HP to 0 in one hit. The fix was weighted spawn rates (sum the weights, roll, subtract) with per-color rate adjustments (a rate of 0 removes a color), plus an anti-cluster rule. If two adjacent gems share a color, the new gem can't take it. Otherwise the chance of matching an adjacent color is halved. The developer reported much less volatile results. — [Realms Aligned devlog](https://rethagos.itch.io/realms-aligned/devlog/645543/on-the-falling-of-gems-too-much-randomness-is-bad)
- **Practitioner guidance:** use weighted spawn tables, not equal chances, and adjust them dynamically. — [Azumo: logic behind match-3](https://azumo.com/insights/the-logic-behind-match-3-games). Level designers set color count and drop chances while building the level skeleton. — [Gamigion: match-3 level design principles](https://www.gamigion.com/match-3-level-design-principles/)

### Inferences
- Across PAD, E&P, MPQ and GoW, heal is never rarer than a damage color. It is either a full equal-weight color (PAD hearts) or not a tile at all (E&P, MPQ: heal comes from skills). A design where Heal and Shield are separate icons competing equally with 4 elements plus Sword is closer to PAD's model.
- The GoW figures (7 colors 9%, 6 colors 15%, 5 colors 26% on 8x8) show match frequency is very sensitive to the number of distinct symbols. A 4x4 grid with 8 icons is far smaller and has more symbols than any of these, so matches will be much rarer than in those games unless weights are skewed.
- My own arithmetic, assuming only straight lines of 3 count: a 4x4 grid has 16 line windows of length 3 (8 horizontal, 8 vertical). With uniform 1/8 per icon, the chance a window is all one icon is 1/64, so the expected number of 3-in-a-line windows per spin is about 0.25. If one icon has weight p, its per-window chance is p², so a single element at 1/8 appears in a line about 16/512 ≈ 0.03 times per spin. If chains mean adjacency clusters instead, the rates are higher and should be simulated.

### Gaps
- No official or datamined per-color skyfall table was found for PAD, E&P, MPQ or Puzzle Quest. The PAD Reddit "orbmath" wiki mirror and the E&P Fandom wiki were unreachable.
- No published spawn data was found for Puzzle Combat, Toon Blast RPG hybrids or Hero Wars.
- No published percentage was found for PAD "skyfall chance increase" skills; the guide lists the category without values.

## Q2. Mechanics that keep elemental attacks frequent and meaningful

### Takeaway
The standard tools are: element advantage at x2/x0.5; tiles of a color dealing damage only if a team member of that color is present (E&P troops by element), or damage scaled by the team's best character in that color (MPQ); stacking same-color heroes ("mono") to boost that color's tile damage; mana meters fed by matching your color; orb changers and skyfall boosts; and combo multipliers.

### Cited Findings
- **E&P element advantage:** strong hits do 2x and weak hits do 0.5x. Fire beats Nature, Nature beats Ice, Ice beats Fire, and Holy and Dark are strong against each other. Mono/stacked teams boost tile and troop damage of that color, and the boost grows with each hero of the color. The official page warns mono "depends on the board: if your color doesn't show up in matches, you stall". The extra raid bonus shrinks slightly as more same-element heroes are stacked (no figures given). — [E&P official: rainbow vs mono](https://www.empiresandpuzzles.com/news/when-to-use-rainbow-vs-mono-teams)
- **E&P mana:** heroes charge mana when troops of their own element hit enemies. — [search summary of E&P combat sources incl. Fandom Combat](https://empiresandpuzzles.fandom.com/wiki/Combat) (page itself unreachable, HTTP 402)
- **E&P mana speed (community wiki):** tiles needed to charge are Very Slow 13.5, Slow 12, Average 10, Fast 8, Very Fast 6.5. Mana troops shorten these: at level 11 (+9%), Very Fast takes 6 tiles; at level 23 (+13%), Average takes 9. Ghosted tiles that hit no enemy give double mana. Community-sourced. — [E&P Fandom: Mana](https://empiresandpuzzles.fandom.com/wiki/Mana?oldid=6051); [empuzzled mana speed guide](https://empuzzled.com/blog/empires-and-puzzles-mana-speed-guide-breakpoints-troops-tiles)
- **PAD attribute advantage:** "effective damage is doubled, weak damage is halved." Fire beats Wood, Wood beats Water, Water beats Fire, and Light and Dark beat each other. — [PAD Collaborative Community Guide](https://docs.google.com/document/d/e/2PACX-1vTe0RFt3wNHjFTdehvaGqHyQZUdOizKDxpdRGhd4GN8eXWvYMBno6ZsNoyZoz26h7lNyBU_IvXW0gvP/pub)
- **PAD combo multiplier:** 100% + (N−1) × 25%, so 3 combos give x1.5 and 5 combos give x2. Published by a fan wiki for the SMB Edition and described the same way by the main-game Reddit community wiki. Community-derived. — [Mario Wiki: PAD SMB damage calculations](https://www.mariowiki.com/Puzzle_&_Dragons:_Super_Mario_Bros._Edition_damage_calculations)
- **PAD orb changers:** active skills convert orbs of one color into another, or convert the whole board into one or several colors. — [Mario Wiki: Orb](https://www.mariowiki.com/Orb_(Puzzle_%26_Dragons:_Super_Mario_Bros._Edition))
- **MPQ color damage:** matching 3 of a color deals damage based on the highest damage multiplier in that color on your team, and characters do more match damage on their power colors. The tile shows the icon of the character dealing the most damage in that color. — [GiantBomb MPQ guide](https://giantbomb.com/marvel-puzzle-quest/3030-44108/guide/); [d3go forum: strongest color](https://forums.d3go.com/discussion/comment/261119)
- **MPQ AP:** each basic match gives AP in its color, which pays for powers (mana-style). Charged tiles give 3 AP. — [MPQ official help: tile types](https://d3go.helpshift.com/hc/en/3-marvel-puzzle-quest/faq/109-what-types-of-tiles-are-there)
- **Gems of War:** matching a troop's color charges its mana and full mana unlocks its ability. Skulls are the generic damage gem. A 4-skull match also gives an extra turn, and the mana surge from it turns into a 2x critical. — [Tampere PlayLab review](https://www.tuni.fi/playlab/gems-of-war-match-three-with-a-twist)

### Inferences
- In E&P, MPQ and GoW every color is useful (damage or mana) to its own hero, but colors off your team are weak or dead. That is what makes element choice meaningful, and it is also what makes needed colors feel rare. Guaranteed-value systems such as mana from any hit, ghosted tiles giving double mana, and orb changers soften this.
- The Sword icon maps to GoW's skulls: a color-neutral damage tile. Heal maps to PAD hearts. Lucky maps loosely to MPQ Critical tiles (wild, matches as any color).

### Gaps
- No published MPQ AP costs or exact match-damage tables were retrieved.
- No official per-skill skyfall boost percentages were found for PAD.
- Nothing was retrieved on Puzzle Quest (original or Legends) gem rates.

## Q3. Player/designer commentary on rare-color frustration and the solutions

### Takeaway
The frustration is real and acknowledged even in official material ("if your color doesn't show up... you stall"). Players often suspect rigged drops, and developers deny hidden drop manipulation. The fixes are: fewer colors, color removal or conversion, rainbow teams, weighted and anti-cluster spawns, and mana gained from any match.

### Cited Findings
- E&P's official article says mono teams risk stalling when their color doesn't appear, and recommends rainbow teams for reliability. — [E&P official](https://www.empiresandpuzzles.com/news/when-to-use-rainbow-vs-mono-teams)
- GoW players accused the game of non-random AI-favoring drops ("The drops should be random, they are clearly not"). The developer denied any hidden drop parameter and explained the effect as color-removal math. — [GoW forum](https://community.gemsofwar.com/t/noticing-obvious-end-game-unnatural-ai-matches-does-ai-count-4-5-matches-and-try-to-keep-them-even/11568)
- An informal player estimate says the AI appears to get extra turns about 95% of the time versus about 1 in 4 for a human. Anecdotal perception, not data. — [GoW forum](https://community.gemsofwar.com/t/what-is-the-chance-of-getting-another-move-after-clearing-the-board/34654)
- Pure-random refills caused volatile one-shot swings in an indie RPG, solved with weighted spawns and anti-clustering. — [Realms Aligned devlog](https://rethagos.itch.io/realms-aligned/devlog/645543/on-the-falling-of-gems-too-much-randomness-is-bad)

### Inferences
- For a slot-battle (no player swapping), the player can't manipulate the board, so rare-color frustration would be stronger than in swap games. Levers seen in these games that transfer well:
  - per-icon weights (with Lucky as a wild);
  - fewer effective symbols, for example treating Lucky as matching anything;
  - a meter that fills from any match;
  - an x2/x0.5 element advantage so that a rarer element hit feels big.

### Gaps
- No GDC talk or postmortem with spawn-rate numbers for a commercial puzzle RPG was found within the call budget.
