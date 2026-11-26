# Match-3 Core Board Mechanics and Game Feel

Evidence labels used in every section:
- **[Official]** studio help center or studio staff.
- **[Trade]** trade press, analyst, or academic source.
- **[Tutorial]** one developer's implementation. It shows a workable value, not what commercial titles use.
- **[Fan/guide]** fan wiki or third-party tips site, not confirmed by the studio.
- **[Snippet]** read only as a search excerpt because the full page could not be fetched. Verify before relying on it.

Everything under "Inferences" is analysis, not a sourced fact. All suggested numbers there are starting points for tuning.

## What is the core loop and turn structure, and in what order do swap validation, matching, gravity, refill, and cascades resolve?

### Takeaway
The documented structure is: swap, validate, then loop (clear, gravity, refill, re-scan) until stable, then check for available moves and shuffle if none. Sources agree on this skeleton, but none of the reference studios publishes its exact order for simultaneous matches or special-piece chains.

### Cited Findings
- [Trade] Formal rule model: a swap of adjacent gems is legal only if it creates a horizontal or vertical line of 3+ identical gems; all matched gems pop at once; gems above fall; new gems appear at the top; cascades repeat until no matches remain; the game ends when no legal move exists. This models Bejeweled-style play — [Gualà, Leucci, Natale, "Bejeweled, Candy Crush and other Match-Three Games are (NP-)Hard"](https://ar5iv.labs.arxiv.org/html/1403.5830)
- [Trade] The same paper notes that a separate NP-hardness claim for Candy Crush (Walsh, 2014) relies on a different rule for simultaneous chains. Simultaneity is therefore a real rule choice that changes outcomes — [Gualà et al.](https://ar5iv.labs.arxiv.org/html/1403.5830)
- [Tutorial] Phaser flow: swap, check; if no match, animate back and shake camera; if match, loop score/clear, gravity, top refill, re-check; after the cascade, test for valid moves and shuffle if none — [Generalist Programmer, Phaser match-3 tutorial](https://generalistprogrammer.com/tutorials/phaser-match-3-puzzle-tutorial)
- [Tutorial] A `busy` flag is set when a swap begins and cleared when the swap or cascade finishes, on both valid and invalid paths — [Generalist Programmer](https://generalistprogrammer.com/tutorials/phaser-match-3-puzzle-tutorial)
- [Trade] Design-space survey of input: adjacent swap is the most common form; alternatives include rotating 3 or 4 cells, line swipe, grid swipe, and click/chain matching — [Jonathan Bailey, "Match Game Mechanics: An exhaustive survey," Game Developer, 2015](https://gamedeveloper.com/design/match-game-mechanics-an-exhaustive-survey)
- [Trade] Refill variables: selection (random, fixed order, difficulty-adjusted, shuffled batch), entry location, quantity, timing, and gravity direction. Bailey lists Candy Crush Saga as an example of block selection used to adjust difficulty — [Bailey](https://gamedeveloper.com/design/match-game-mechanics-an-exhaustive-survey)

### Inferences
- Recommended resolution order for the prototype:
  1. Lock input.
  2. Animate swap.
  3. If either piece is a special-swap case, resolve that combo; otherwise scan the full board.
  4. If no match and no special activation, reverse the swap, consume no move, unlock.
  5. Consume one move.
  6. Group matched cells into shapes, and decide which special each group creates.
  7. Clear all groups in the same step, counting a cell in both a horizontal and vertical run once.
  8. Apply damage to blockers, then queue triggered specials.
  9. Resolve the special queue until empty.
  10. Apply gravity, then refill.
  11. Re-scan. If matches exist, increment the cascade counter and return to step 6.
  12. When stable, run end-of-turn blocker behavior (for example spreading), then evaluate win/lose, then check for deadlock and shuffle, then unlock.
- Evaluate win/lose only after the board settles, so a cascade on the final move can still win. This is a common tutorial recommendation seen in search excerpts and is the player-friendly option.
- Place a newly created special at the swapped cell when that cell is in the group; otherwise use a deterministic cell (such as the group's lowest, then leftmost). No source documents the commercial rule.

### Gaps
- No studio source documents exact resolution order, tie-breaks, or special-piece spawn position.
- No source confirms whether reference titles allow input during cascades. Tutorials lock input; commercial behavior should be checked by hands-on observation.

## What special pieces exist, what creates them, how do combos work, and how do rule sets differ?

### Takeaway
Royal Match and Homescapes share nearly the same officially documented combo table (line, area, homing flyer, color clear). The Candy Crush guides retrieved list no 2x2 homing piece (absence in these guides, not a confirmed rule), while Toon Blast guides describe group-size thresholds rather than swap shapes.

### Cited Findings
**Creation shapes**
- [Official] Homescapes: 4 in a line = Rocket; 2x2 square = Paper Plane; 5 or 6 in L/T = Bomb; 5 in a row or column = Rainbow Ball. Rocket, Bomb, and Plane activate by tap; Rainbow Ball activates by swiping toward an adjacent piece type, removing all of that type. The Plane removes one random piece, often prioritizing locked elements or goals, and destroys neighbors at takeoff — [Playrix Help: Power-ups](https://playrix.helpshift.com/hc/a/14-homescapes/faq/16313-power-ups-and-how-to-use-them)
- [Fan/guide, Snippet] Royal Match: 5 in line = Light Ball; 5 in L/T = TNT; 2x2 = Propeller. Guides conflict on TNT radius (two-tile radius vs 3x3) — [Pocket Gamer](https://www.pocketgamer.com/royal-match/tips-and-tricks); [Gamer Tweak](https://gamertweak.com/get-use-tnt-royal-match)
- [Fan/guide, Snippet] Candy Crush Saga: 4 in a row = striped; T/L = wrapped; 5 in a line = color bomb. Wrapped explodes a 3x3 area twice; color bomb clears all candies of the swapped color — [GameRevolution](https://www.gamerevolution.com/guides/60253-candy-crush-saga-candy-combinations); [Candy Crush fan wiki](https://candycrush.fandom.com/wiki/Candy)
- [Fan/guide, Snippet] Toon Blast group sizes: Rocket 5, Disco Ball 9. Bomb is reported as 7 by some guides and 6 by another — [Gamezebo](https://www.gamezebo.com/walkthroughs/toon-blast-tips-cheats-and-strategies/); [Pocket Gamer](https://www.pocketgamer.com/toon-blast/toon-blast-cheats-tips-and-tricks/)

**Combo table (official for Royal Match and Homescapes)**

| Pair | Royal Match | Homescapes |
|---|---|---|
| Line + Line | Full row and column | One row and one column, regardless of direction |
| Line + Area | 3 rows and 3 columns | 3 rows and 3 columns |
| Area + Area | All items within 4-tile radius | Double blast radius |
| Flyer + Flyer | 3 Propellers, each hits a random element | 3 planes, each at a different tile |
| Flyer + Line/Area | Carries the piece to a random tile; clears neighbors on takeoff | Carries the piece to a random tile |
| Color + Line/Area/Flyer | Most common color becomes that power-up | Most common piece type becomes that power-up |
| Color + Color | Clears all items, removes one layer from every element | Clears all pieces, removes one obstacle layer |

Sources: [Royal Match Help](https://dreamgames.helpshift.com/hc/az/3-royal-match/faq/7-power-up-combinations); [Playrix Help: Combinations](https://playrix.helpshift.com/hc/a/14-homescapes/faq/16363-what-power-up-combinations-are-available-in-the-game)

**Candy Crush combos**
- [Fan/guide, Snippet] Striped + wrapped clears 3 rows and 3 columns; wrapped + wrapped makes a 5x5 blast; color bomb + striped or wrapped converts that candy's color into the special and activates them; color bomb + color bomb clears the board, with sources differing on details and exceptions — [GameRevolution](https://www.gamerevolution.com/guides/60253-candy-crush-saga-candy-combinations); [Candy Crush fan wiki](https://candycrush.fandom.com/wiki/Candy)

**Toon Blast combos**
- [Fan/guide, Snippet] Rocket + Bomb clears 3 lines vertically and 3 horizontally — [Toon Blast guide results via Pocket Gamer](https://www.pocketgamer.com/toon-blast/toon-blast-cheats-tips-and-tricks/)

### Inferences
- A Royal Match "4-tile radius" matches a 9x9 square minus center (80 tiles), and one search excerpt states 80 tiles. Treat this as likely, not officially confirmed.
- A generic original set could be: Line (4), Area (L/T), Seeker (2x2), Prism (5). Rename pieces and use original visuals and effects.
- Shape priority is needed when a group qualifies for several specials. Suggested order: 5-line, L/T, 2x2, 4-line. This follows piece power and is not sourced.
- Seeker targeting is the main decision-support feature: Playrix officially says the Plane often targets locked elements or goals, and a third-party Royal Match guide excerpt describes similar density-based targeting, so targeting should prefer objective cells.

### Gaps
- Gardenscapes was not separately verified. It is a Playrix title, but its rules should not be assumed identical to Homescapes.
- One search excerpt said a single striped candy clears both a row and a column. This conflicts with the row-or-column behavior of equivalent line pieces and may describe striped + striped. Not verified.
- No official King or Peak (Toon Blast) rules page was retrieved. The Candy Crush fan wiki returned HTTP 402 on fetch.

## What blocker and objective types exist, and how do they create decisions?

### Takeaway
King's stated design view is that harder levels should use blockers demanding prioritization and decisions. Detailed blocker rules in this research come mostly from excerpts and fan sources, so the family taxonomy below is an analytical grouping.

### Cited Findings
- [Trade, Snippet] King designers tend to use blockers requiring prioritization and decision-making when crafting harder levels, and new levels mix recent and long-established blockers (interview with senior product manager John Davies) — [PocketGamer.biz](https://www.pocketgamer.biz/crafting-candy-crushs-difficulty-blockers-level-design-ai-and-the-complexity-staircase)
- [Trade] King presented a method for analyzing blockers as difficulty drivers, creating a common language. Talk contents were not accessed — [GDC Vault: "Blockers: Analyzing Difficulty Drivers in Candy Crush Games"](https://gdcvault.com/play/1026813/Blockers-Analyzing-Difficulty-Drivers-in); [GDC preview](https://gdconf.com/news/come-gdc-summer-and-learn-kings-new-method-balancing-match-3-game-difficulty)
- [Fan/guide, Snippet] Candy Crush examples: jelly squares cleared by matching on them; licorice cages lock candies; licorice swirls can move and fall; chocolate multiplies if not broken in a move. Exact page attribution within the search set was not pinned — [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/CandyCrush); [Yahoo designer interview](https://news.yahoo.com/candy-crush-saga-cheat-sheet-114244835.html)
- [Trade] Survey examples: non-clearing tiles, floating blockers (Candy Crush icing), and sinkers that clear only on reaching the bottom. Win conditions include clear grid, match count, score, specific matches, or clear a specific tile — [Bailey](https://gamedeveloper.com/design/match-game-mechanics-an-exhaustive-survey)
- [Trade, Snippet] Royal Match obstacles include grass, cupboards, mailboxes, and royal eggs, each with distinct clearing rules (single-author analysis) — [Ekin Melis Sezer, Medium](https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b)
- [Trade, Snippet] In Royal Kingdom, obstacles that move vertically or horizontally changed special-level play, and defeating an obstacle just before it spreads creates a "near win/fail" moment — [Deconstructor of Fun](https://www.deconstructoroffun.com/blog/2024/07/01/royal-kingdom-will-it-outgrow-its-big-brothers-influence)
- [Trade] Royal Match's first 91 levels introduce 11 new blocks. Worlds follow 2-3 learning levels, a hard spike, sometimes a super-hard peak, then a bonus level — [Gamigion](https://www.gamigion.com/royal-match-level-design-insights/)

### Inferences
Analytical blocker families and the decision each creates:

| Family | Rule pattern | Player decision |
|---|---|---|
| Layered | N hits to remove | Focus damage or spread it |
| Under-tile | Clear the cell above it | Work the hard-to-reach cells |
| Lock | Piece can match but not swap | Free pieces or play around them |
| Static wall | Blocks gravity or swaps | Route refill around it |
| Spreading | Grows if not hit this turn | Contain now or pursue the goal |
| Drop-down | Must reach bottom/exit | Clear beneath it, control columns |
| Collect | Clear N of a color/type | Choose color vs. setup |
| Moving | Changes position each turn | Time your attack |

- For a first prototype, one layered blocker, one spreading blocker, and one drop-down objective would test three distinct decisions with limited scope.
- Spreading should run only after a settled turn and be skipped if that type was damaged that turn, matching the "multiplies if not broken" pattern.

### Gaps
- Exact current blocker rules for Royal Match, Homescapes, Gardenscapes, and Toon Blast were not verified from official pages.
- The PocketGamer.biz page returned HTTP 403 and the Medium fetch failed, so those claims rest on excerpts.

## How do move limits and timed modes shape play, and what happens at level end?

### Takeaway
Move-limited levels dominate the reference genre, and one analysis of Royal Match shows budgets shrinking from 30-38 to 23-27 moves over 100 levels. The best-documented end-of-level pattern is converting leftover moves into a bonus sequence, though its numbers are fan-sourced.

### Cited Findings
- [Trade] Royal Match move budgets: Levels 1-20 have 30-38 moves; 21-60 have 25-30; 61-100 have 23-27. Decision density rises by about 20% by the end of that range — [Gamigion](https://www.gamigion.com/royal-match-level-design-insights/)
- [Trade] Difficulty in that analysis: normal levels average about 1.2 attempts; 8 hard levels average 1.6; 5 super-hard peaks reach up to 2.5 — [Gamigion](https://www.gamigion.com/royal-match-level-design-insights/)
- [Tutorial] Timed example: 90-second countdown, text turns red at 10 seconds, timer pauses during cascade animations — [Generalist Programmer](https://generalistprogrammer.com/tutorials/phaser-match-3-puzzle-tutorial)
- [Trade] Extra time, time resets, and extra moves are recognized reward types — [Bailey](https://gamedeveloper.com/design/match-game-mechanics-an-exhaustive-survey)
- [Fan/guide, Snippet] Candy Crush "Sugar Crush": leftover moves convert to striped candies at roughly 4 per 5 moves, remaining specials detonate, and it still runs with zero moves if specials remain. Jelly levels instead send three Jelly Fish per remaining move — [Candy Crush fan wiki](https://candycrush.fandom.com/wiki/Sugar_Crush)
- [Fan/guide, Snippet] Leftover moves or special candies earn bonus score at level end — [AOL FAQ, 2013](https://www.aol.com/2013/02/04/candy-crush-saga-help-faq/)

### Inferences
- Move limits suit deliberate planning; timers reward pattern speed. Pausing the timer during cascades prevents animation time from penalizing the player.
- A short, skippable end-of-level bonus provides payoff without delaying the next level. Convert moves one at a time with rising feedback, and cap the total duration.
- Treat Gamigion's attempt data as third-party measurement, since Dream Games did not publish it.

### Gaps
- No official source for Royal Match, Homescapes, or Toon Blast end-of-level conversion rules was retrieved.
- No source measured how timed and move-limited modes differ in retention or player satisfaction.

## What are the key implementation concerns?

### Takeaway
Use deterministic validation: generate boards with no starting matches and at least one move, brute-force test legal swaps after each settled turn, and re-validate any shuffle. Keep board logic separate from animation so simultaneous resolution and tests stay reliable.

### Cited Findings
- [Tutorial] Move detection: after each cascade, test each gem's swap with its right and bottom neighbors using virtual match detection; if none work, shuffle — [Generalist Programmer](https://generalistprogrammer.com/tutorials/phaser-match-3-puzzle-tutorial)
- [Tutorial, Snippet] Board generation by local fix: recolor a block until it matches none of its neighbors — [Tuts+, Construct 2 match-3](https://code.tutsplus.com/make-a-match-3-game-in-construct-2-eliminating-pre-made-matches--gamedev-9485t)
- [Tutorial, Snippet] Board generation by rejection: a reverse-engineered Bejeweled-style generator discards fills containing a 3-in-a-row and regenerates — [Nikhil Kaniyeri](https://kaniyeri.github.io/2026/02/07/bejeweled3-gem-algorithm)
- [Tutorial, Snippet] The bevy_match3 library lists both no-match board creation and board shuffle as features — [bevy_match3](https://www.lib.rs/crates/bevy_match3)
- [Tutorial, Snippet] Input is commonly withheld until animations complete — [Kodeco SpriteKit tutorial](https://www.kodeco.com/58-how-to-make-a-game-like-candy-crush-with-spritekit-and-swift-part-3?page=5); [CS50 Games, Match 3](https://cs50.harvard.edu/games/notes/3/)
- [Trade] Deciding optimal play across move sequences is NP-hard, including score and pop targets — [Gualà et al.](https://ar5iv.labs.arxiv.org/html/1403.5830)

### Inferences
- Generation: fill left-to-right, top-to-bottom, excluding any color that would complete a run with the two cells to the left or above. Then verify at least one legal move, and regenerate if none.
- Shuffle: permute only movable, unlocked normal pieces. Repeat until there are no matches and at least one legal move. After a retry cap, construct a guaranteed move. Do not consume a move.
- Legal move checks must include special activations and special+special swaps, not just color matches.
- Hint: reuse the move finder. Rank by objective progress, then special creation, then match size.
- Architecture: use a pure board model that outputs an ordered event list (`swap`, `clear`, `spawnSpecial`, `fall`, `refill`, `shuffle`). The view plays these events. Use a seeded RNG so Playwright tests can reproduce exact cascades and read state through `getState()`.
- Because optimal solving is hard in general, a difficulty bot should use heuristics or sampling rather than exhaustive search.

### Gaps
- No studio source describes production shuffle, hint ranking, or refill-manipulation algorithms.
- Policy for buffering input during cascades in commercial titles is undocumented in the sources found.

## What creates game feel, with concrete numbers?

### Takeaway
No reference studio publishes its timing values, and no source found gives a hint delay or cascade pitch curve. The usable numbers below come from tutorials and should be treated as starting points for hands-on tuning.

### Cited Findings
- [Tutorial] Phaser timing set: swap 180 ms (Back.easeOut); invalid reverse at 80% speed (Sine.easeInOut); match removal 250 ms (shrink and fade); gravity 90 ms per row (Power2); refill 100 ms per row (Power2); selection pulse to 1.15x; score pop to 1.3x; invalid-move camera shake 80 ms at intensity 0.003 — [Generalist Programmer](https://generalistprogrammer.com/tutorials/phaser-match-3-puzzle-tutorial)
- [Tutorial] PixiJS polish: pop-in from scale 0.8 to 1.0 over 300 ms with Bounce.Out, plus tint animation. A rough squash sequence goes 0.9, 1.1, 1.0 at 100 ms steps, which the author calls crude and jerky. Non-linear easing looks more natural — [Roman Guivan, DEV](https://dev.to/roman_guivan_17680f142e28/match-3-game-in-pixijs-103-juice-and-polish-3fff)
- [Trade] General UI timing bands: fast up to 100 ms, normal 100-1,000 ms, slow 1-3 s. Not game-specific — [SAP Fiori timing guidelines](https://www.sap.com/design-system/fiori-design-web/v1-139/foundations/interaction/timing)
- [Tutorial, Snippet] A developer blog claims audio should land within about 12 ms of a hit and that delay becomes perceptible past about 20 ms. The underlying data is not linked, so treat this as anecdotal — [EastonDev](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/)
- [Trade, Snippet] Clear feedback keeps chains readable at speed, and self-refilling boards create unplanned moments that feel like a bonus. This comes from a slot-design article on tumbling reels, an adjacent genre — [games.gg](https://games.gg/news/sweet-bonanza-tumbling-reels-design/)

### Inferences
Suggested starting values for the prototype (unsourced unless shown above):

| Beat | Start value | Basis |
|---|---|---|
| Input acknowledgement | under 100 ms | SAP "fast" band |
| Swap | 150-180 ms | Tutorial 180 ms |
| Invalid return + shake | about 180 ms + 80 ms | Tutorial |
| Pre-clear anticipation | 40-80 ms | Inference |
| Clear | 150-250 ms | Tutorial 250 ms |
| Fall | 60-90 ms per row, capped | Tutorial 90 ms |
| Landing squash | 80-120 ms | Inference |
| Cascade step gap | 50-120 ms | Inference |
| Hint idle delay | 4-6 s | Inference only, needs playtest |

- Escalate per cascade step using a capped pitch ladder, slightly larger score text, and more particles. Reserve screen shake for specials and combos so it retains meaning.
- Shorten timing slightly on deep cascades to prevent long waits. Keep all durations in `TUNING` with ranges in `TUNING_RANGES`.
- Automated tests can check timing and state, but cannot establish whether the result feels good. Human playtesting remains necessary.

### Gaps
- No source found gives commercial animation timings, hint delay, or cascade pitch escalation curves for the reference titles. Frame-by-frame capture of gameplay would be the best next step.
- No GDC talk specifically about match-3 game feel was found and accessed.
