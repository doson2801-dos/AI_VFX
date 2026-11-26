# Level Design, Difficulty Modeling, and Randomness in Match-3 Puzzle Games

Evidence labels used below: **[Measured]** = data from a paper or live experiment. **[Studio statement]** = a named studio employee or company filing. **[Practitioner]** = consultant, vendor, or designer experience without a published dataset. **[Unverified]** = second-hand or contested.

## How do studios structure difficulty curves (sawtooth patterns, hard/super-hard levels, onboarding pacing, mechanic introduction cadence)?

### Takeaway
Published evidence supports spaced difficulty spikes, low early complexity, and caution with extreme levels, but no commercial match-3 studio has published a full sawtooth curve with real pass rates. King's 2024 GDC position is that very hard levels can lift short-term conversion but lose over the long term.

### Cited Findings
- **[Studio statement]** Candy Crush Saga level 65, originally planned as the last level, became its highest-converting and highest-revenue level and also had the most churn. — [Mobilegamer.biz on King's GDC 2024 talk](https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/)
- **[Studio statement]** King's post-launch A/B tests found higher difficulty raised short-term conversion, while easier levels retained players longer. Jan Wedekind (head of central insights): "crazy hard levels never pay off, at least in the long term." — [Mobilegamer.biz](https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/)
- **[Studio statement]** King advises that maximum level duration should depend on difficulty, with harder levels kept shorter, and reports that longer levels are less likely to be fun. — [Mobilegamer.biz](https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/)
- **[Studio statement]** King repeatedly identifies its 100 least fun levels by metric, fixes them, and reports a significant engagement uplift. No effect size was published in the report. — [Mobilegamer.biz](https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/)
- **[Measured]** In an EA mobile match-3 game with 200+ levels, difficulty spikes in levels 21-80 correlated strongly with steep drops in retained population. Levels up to 20 decayed naturally despite low difficulty, and levels above 80 decayed slowly despite high difficulty. A slight difficulty increase at level 21 coincided with a significant player drop. — [Xue et al., WWW 2017 Companion](https://archives.iw3c2.org/www2017/proceedings/companion/p465.pdf)
- **[Measured, non-match-3]** In the word puzzle Elimination, analysis of about a thousand players corroborated that the generator produced its intended sawtooth curve. — [Search-indexed paper copy, not read in full](https://webcf.waybackmachine.org/web/20210827172554/http://akhalifa.com/documents/Elimination.pdf)
- **[Practitioner]** Room 8 Studio describes tutorial levels using 1-3 mechanics on the field, avoiding repeated mechanics and ideas for at least 50 levels, "Fuu-effect" levels that leave the player 1-2 moves short, and "skill" levels placed mostly late in a game. — [Room 8 Studio, 2019](https://room8studio.com/news/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1/)
- **[Practitioner]** Within a level, Christian Karrs (then at Storm8) recommends structuring an interest curve around board progress and goal progress, opening the board gradually so late cascades create a goal surge, and keeping players close to victory by the end whether they win or lose. — [Game Developer, 2016](https://gamedeveloper.com/design/the-player-s-progress-designing-levels-for-mobile-puzzle-games)
- **[Measured, weak]** The Royal Crush study (20 scenarios, 3 special-piece densities, 10 plays per configuration, **one tester**) found difficulty rose from low to medium special-piece counts in all scenarios using special pieces. Most scenarios then flattened from medium to high, and some dropped. The authors recommend fewer special pieces early. — [Eckmann, Schiesser, von Mammen, IEEE CoG 2024](https://downloads.hci.informatik.uni-wuerzburg.de/2024-CoG-RoyalCrush.pdf)

### Inferences
- A sensible prototype structure is a short repeating cycle of easy, medium, and hard levels, with each new mechanic first appearing alone in a low-pressure level. The cycle length must be tested, since no source establishes an optimal one.
- Avoid paywall-style spikes. An original prototype without monetization has no reason to accept the churn cost that level 65 illustrates.
- Obstacle count is not linear with difficulty. The Royal Crush saturation result suggests measuring each density step rather than assuming more blockers means harder.

### Gaps
- No primary source publishes real per-level pass rates for a sawtooth curve in a top commercial match-3. King removed actual success rates from its published figures as sensitive.
- A Pocket Gamer article on Candy Crush's "complexity staircase" appeared relevant but returned HTTP 403, so its content is not used.
- The informal claim that paywall levels take 20-35 attempts was seen only in a search snippet of a personal profile and is excluded as unverified.

## What metrics define difficulty (pass rate, attempts per success, churn per level, moves left), with any published values?

### Takeaway
The standard measures are success rate (wins/attempts), its inverse (attempts per win), and 7-day churn by level. Published absolute values are rare, and pass rate alone is confounded by who remains in the player population.

### Cited Findings
- **[Measured]** King defines difficulty as success rate: total successes divided by total attempts. — [Gudmundsson et al., IEEE CIG 2018](https://www.gwern.net/doc/reinforcement-learning/imitation-learning/2018-gudmundsson.pdf)
- **[Measured]** EA measures level difficulty as 1/win rate, the average trials needed to win. It models churn separately after wins and losses at each level and trial, using a 7-day inactivity window. — [Xue et al., 2017](https://archives.iw3c2.org/www2017/proceedings/companion/p465.pdf)
- **[Measured]** Rovio/Aalto's Dream Blast dataset covers 95,266 players over the first 168 levels. It computes an individual's pass rate as 1/attempts (0 if never passed) and churn as stopping for at least 7 days after trying a level. — [Roohi et al., PACM HCI CHI PLAY 2021](https://arxiv.org/pdf/2107.12061); [Roohi et al., CHI PLAY 2020](https://doi.org/10.1145/3410404.3414235)
- **[Measured]** Less persistent and less skilled players are more sensitive to high difficulty and churn earlier, so the population and the difficulty-churn relationship change level by level. — [Roohi et al., CHI PLAY 2020](https://doi.org/10.1145/3410404.3414235)
- **[Measured]** Lily's Garden research cautions that completion rates shift over time with cohorts and are not a fixed measure of inherent difficulty. — [Kristensen, Valdivia, Burelli, IEEE CoG 2020](https://arxiv.org/html/2306.14626v1)
- **[Measured]** One EA match-3 level had seed win rates from 0.15 to 0.75, equal to about 6.7 versus 1.3 expected attempts. — [Xue et al., 2017](https://archives.iw3c2.org/www2017/proceedings/companion/p465.pdf)
- **[Measured, target value]** A Playtika experiment targeted an 8-10% completion rate on a game task. Rule-based difficulty achieved 12.0% and the DL model 8.7%. This is not a general benchmark. — [Ben Or, Kolomenkin, Shabat, 2021](https://arxiv.org/pdf/2106.03075)
- **[Studio statement]** King combines "time to abandon" and "time to pass" to estimate fun, tracks "puzzliness" separately from difficulty, and says churn alone cannot show that a level is bad. — [Mobilegamer.biz](https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/)
- **[Practitioner]** Room 8 recommends average and median attempts per level over pass rate. — [Room 8 Studio, 2019](https://room8studio.com/news/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1/)
- **[Practitioner]** U2A Games' lead designer lists attempts per completion, win/fail rate, reshuffles (two or more is a review flag), goals remaining on loss, moves remaining on win, level time, and bonuses. Difficulty should be measured with and without boosters or extra moves. About 1k completions is the stated minimum for reliable difficulty and about 100k is quite accurate. — [Heorhiiev, Gamigion](https://www.gamigion.com/?p=17718)
- **[Practitioner, ambiguous]** devtodev reports some developers set "difficulty" at 30-40% for easy levels and 80-85% for hard ones, others at 50-60% and 90-95%. It gives no dataset. In context these appear to describe difficulty or failure percentage, **not pass rate**, so do not reuse them as pass-rate targets. — [devtodev, 2021](https://devtodev.com/education/articles/en/381/game-level-progression)

### Inferences
- For a prototype, log per level: attempts, wins, attempts-to-first-win, moves left on win, goals remaining on loss, duration, reshuffles, boosters used, and quit-after-loss. Report medians and distributions, because King's warning against designing for averages and Playtika's cluster results both show averages hide subgroups.
- With small playtest groups, churn is too noisy to use. Attempts-to-win and goals remaining on loss are more practical.

### Gaps
- No reliable, public, cross-game benchmark exists for pass rate by level band, attempts per level, or churn per level.
- The Dream Blast and Candy Crush papers do not publish a complete per-level table of real values.

## What do academic papers report on match-3 difficulty? Include King's and others' work on playtesting agents, MCTS, reinforcement learning, deep learning for level difficulty prediction, procedural level generation, and computational complexity results (e.g. NP-hardness of match-3 variants).

### Takeaway
Agents predict relative difficulty well, especially when calibrated to human data and when using their best runs rather than average runs. Generalized match-3 is NP-hard under offline assumptions, while procedural generation remains far from reliably hitting a requested difficulty.

### Cited Findings

**Human-like agents (King)**
- **Citation:** Gudmundsson, Eisen, Poromaa, Nodet, Purmonen, Kozakowski, Meurling, Cao. "Human-Like Playtesting with Deep Learning." IEEE CIG 2018. — [Paper](https://www.gwern.net/doc/reinforcement-learning/imitation-learning/2018-gudmundsson.pdf)
- Data came from about 1% of players over about 2 weeks: 5,500 state-action pairs per level for levels 1-2,150, nearly 1.2 x 10^7 samples, with 4,500/500/500 train/validation/test per level. — [Same paper](https://www.gwern.net/doc/reinforcement-learning/imitation-learning/2018-gudmundsson.pdf)
- The selected architecture was 12Conv+ELU+GAP. Move-prediction accuracy reached about 47% on Candy Crush Saga (CCS) and 48% on Candy Crush Soda Saga (CCSS). Training took about 24 hours on 6 CPUs and one Tesla K80, with simulation on 32 CPUs. — [Same paper](https://www.gwern.net/doc/reinforcement-learning/imitation-learning/2018-gudmundsson.pdf)
- Results on 200 test levels (mean absolute error of predicted success rate): — [Same paper, Table II](https://www.gwern.net/doc/reinforcement-learning/imitation-learning/2018-gudmundsson.pdf)

| Agent | Attempts/level | Game | MAE | Outside 95% band | Random-effect SD |
|---|---:|---|---:|---:|---:|
| MCTS (200 sims/move) | 100 | CCS | 5.4% | 4% | 53% |
| CNN | 1,000 | CCS | 4.0% | 11% | 35% |
| CNN | 100 | CCS | 4.9% | 24% | 33% |
| CNN | 1,000 | CCSS | 5.7% | 17% | 38% |
| CNN | 100 | CCSS | 6.6% | 23% | 35% |

- CNN beat MCTS on MAE and speed, but MCTS's out-of-band rate was closer to the expected 5%, which the authors read as greater robustness as the game evolves. CNN agents need new tracked data when new elements appear. — [Same paper](https://www.gwern.net/doc/reinforcement-learning/imitation-learning/2018-gudmundsson.pdf)
- King reported estimating a new level in under a minute versus 7 days of human playtesting per 15-level episode, and using the agent for 1,000+ new CCS levels over more than a year. — [Same paper](https://www.gwern.net/doc/reinforcement-learning/imitation-learning/2018-gudmundsson.pdf)

**RL and MCTS with player-population models (Rovio/Aalto, Tactile/ITU)**
- **Citation:** Roohi, Relas, Takatalo, Heiskanen, Hämäläinen. "Predicting Game Difficulty and Churn Without Players." CHI PLAY 2020. The model combines DRL gameplay with a simulated population having skill, persistence, and boredom. — [DOI](https://doi.org/10.1145/3410404.3414235)
- **Citation:** Roohi, Guckelsberger, Relas, Heiskanen, Takatalo, Hämäläinen. "Predicting Game Difficulty and Engagement Using AI Players." PACM HCI 5(CHI PLAY), Article 231, 2021. — [Paper](https://arxiv.org/pdf/2107.12061)
- Using 5-fold cross-validation on 168 Dream Blast levels, pass-rate MSE improved from 0.01953 (extended DRL, 16 features) to 0.01419 (extended DRL-enhanced MCTS, 3 best-run features). Churn MSE moved from 0.00008 to 0.00007. The study used 20 MCTS runs and 1,000 DRL runs per level. — [Roohi et al., 2021, Table 2](https://arxiv.org/pdf/2107.12061)
- Selecting among MCTS variants took about 10 hours per level on a 16-core CPU (20 runs, 16 parallel game instances per run), so this method is not cheap. — [Roohi et al., 2021](https://arxiv.org/pdf/2107.12061)
- **Citation:** Kristensen, Valdivia, Burelli. "Estimating Player Completion Rate in Mobile Puzzle Games Using Reinforcement Learning." IEEE CoG 2020, DOI 10.1109/CoG47356.2020.9231581. On Lily's Garden (120 levels, about 900,000 players), moves from the best ~5% of PPO runs was the strongest predictor. The agent was below human level but tracked between-level differences, making it better for ranking than exact completion-rate prediction. — [Paper](https://arxiv.org/html/2306.14626v1)
- **Other RL work (abstract/search level only):** Napolitano (2020) tested match-3 using a Dueling DQN — [arXiv:2007.01137](https://arxiv.org/pdf/2007.01137). Shin et al. defined five strategic play styles for RL playtesting — [Chung-Ang repository](https://scholarworks.bwise.kr/cau/bitstream/2019.sw.cau/39529/1/Playtesting%20in%20Match%203%20Game%20Using%20Strategic%20Plays%20via%20Reinforcement%20Learning.pdf). An MDPI Electronics paper compares PPO and SAC for level balancing — [MDPI](https://mdpi.com/2079-9292/12/21/4456) (full text blocked, results not verified).

**Procedural generation**
- **Citation:** Villanueva Aylagas, Bergdahl, Gillberg, Sestini, Tolstoy, Gisslén. "Improving Conditional Level Generation using Automated Validation in Match-3 Games" (Avalon, EA SEED). arXiv 2024; search results list IEEE Transactions on Games, DOI 10.1109/TG.2024.3440214. — [Paper](https://arxiv.org/html/2409.06349v2)
- Avalon trained a conditional VAE on 198 levels (170/15/13 split). A scripted bot played each level 30 times. Valid levels: 51.39% versus 43.75% without difficulty conditioning and 46.15% in the dataset. **Difficulty accuracy was only 33.33%**, with a mean gap of 10.19 moves between requested and validated difficulty. Inference took 1.69 ms in PyTorch and 2.50 ms in Unity. — [Same paper](https://arxiv.org/html/2409.06349v2)
- Volz et al. report GANs struggle in match-three level generation and propose Markov Random Field adaptations for symmetry. — [arXiv:2005.12579](https://arxiv.org/pdf/2005.12579)
- PCGRL is a general RL level-design framework. I found no paper applying it directly to match-3 difficulty. — [arXiv:2001.09212](https://arxiv.org/abs/2001.09212v3)

**Computational complexity**
- **Citation:** Walsh, "Candy Crush is NP-hard," arXiv:1403.1911, 2014. Deciding whether k swaps can reach score s on a generalized a x b board is NP-complete, by reduction from 3-SAT. Only chains of 3 are used, and simultaneous chains are deleted bottom to top. — [Paper](https://arxiv.org/pdf/1403.1911)
- **Citation:** Gualà, Leucci, Natale, "Bejeweled, Candy Crush and other Match-Three Games are (NP-)Hard," IEEE CIG 2014. Deciding whether a specific gem can be popped is NP-hard, as are reaching a score, popping x gems, or playing x turns. The reduction is from 1-in-3 positive 3SAT and assumes a w x h board, 6 gem kinds, and **known future refills**. — [arXiv](https://ar5iv.labs.arxiv.org/html/1403.5830); [IEEE](https://ieeexplore.ieee.org/document/6932866)
- Gualà et al. argue Walsh's simultaneous-chain rule departs from the original gameplay and that Walsh's instances become easy once the move limit is removed. — [Gualà et al.](https://ar5iv.labs.arxiv.org/html/1403.5830)

### Inferences
- NP-hardness applies to arbitrarily large constructed boards, so it does not make an ordinary 8x8 level impractical to simulate. Its practical implication is that perfect-play search is not a sound balance method.
- A small team should use heuristic or lightweight MCTS bots and calibrate them with a small set of human plays. A King-style CNN needs player data the prototype will not have.
- Use "best X% of bot runs" as a candidate feature, since two independent game datasets found it useful. It should be validated on this game.
- Treat generated levels as candidates to filter through simulation. Avalon's 33.33% difficulty accuracy does not support trusting direct difficulty conditioning.

### Gaps
- King's paper withholds raw success rates, so its MAE cannot be interpreted relative to the real difficulty distribution.
- I did not verify a peer-reviewed venue for Walsh's paper.
- Dream Blast is a collapse/blast-style puzzle rather than a swap match-3, and Lily's Garden results cover only about 60% of that game's mechanics, so transfer to swap-based play is unproven.

## How are RNG, seeded boards, refill bias, and dynamic difficulty adjustment used? Separate what is documented (patents, papers, studio statements) from speculation.

### Takeaway
Seed-based DDA in a commercial match-3 is firmly documented by EA. Refill bias is described by practitioners, but I found no primary evidence that a named top title uses it, and claims that specific games manipulate difficulty based on spending remain unverified.

### Cited Findings

**Documented in a paper with live A/B results**
- EA's DDA picked among 100 board-initialization seeds (0-99) per level. It chose from the top five candidate seeds to prevent repetition, targeted optimal win rates by level and trial, and treated the easiest and hardest seeds as bounds. Control players received random seeds. — [Xue et al., 2017](https://archives.iw3c2.org/www2017/proceedings/companion/p465.pdf)
- EA says a difficulty lever should be invisible, rejecting visible goal changes because they undermine accomplishment. — [Xue et al., 2017](https://archives.iw3c2.org/www2017/proceedings/companion/p465.pdf)
- EA's A/B test rolled treatment from 10% to 40% to 70%. All phases were statistically significant (p < 0.05), and no statistically significant in-game revenue difference was observed. — [Xue et al., 2017](https://archives.iw3c2.org/www2017/proceedings/companion/p465.pdf)

| Phase (treatment share) | Rounds gain iOS | Rounds gain Android | Play-time gain iOS | Play-time gain Android |
|---|---:|---:|---:|---:|
| I (10%) | +4.4% | +4.5% | +4.4% | +4.8% |
| II (40%) | +7.0% | +7.9% | +7.9% | +9.0% |
| III (70%) | +7.2% | +6.3% | +8.0% | +7.3% |

- Playtika tested a DL difficulty system with about 200,000 test and 800,000 control players, adjusting required points. Against an 8-10% completion target, the average was 8.7% versus 12.0% for rules. Only 5 of 200 player clusters exceeded 16% completion versus 49 under rules. The paper does not identify the game as match-3. — [Ben Or et al., 2021](https://arxiv.org/pdf/2106.03075)

**Patents**
- EA's patent family covers dynamically adjusting difficulty to improve engagement, with press coverage noting the changes may be undetectable and that EA said it would not use the system in online multiplayer modes. Press reports do not establish use in a specific match-3. — [GameSpot](https://www.gamespot.com/articles/ea-patents-adaptive-difficulty-system-designed-to-keep-you-playing-longer/1100-6489866/); [TechSpot](https://www.techspot.com/news/89238-ea-patent-dynamic-difficulty-adjustment-system-has-approved.html)
- Zynga's US 11,498,006 covers difficulty modification through gameplay parameters such as collision determination values based on estimated skill. It is not evidence of match-3 refill bias. — [Justia](https://patents.justia.com/patent/11498006)
- Zynga's US 9,669,291 adjusts letter-distribution probabilities in a word game using board state and player skill. It is the closest patent analogue found to biased refill, but it is not match-3. — [Patent Arcade](https://www.patentarcade.com/?p=2967)
- A patent existing does not prove a product shipped it. — (methodological caution)

**Practitioner descriptions**
- **[Practitioner]** A seed can determine initial and later chips, so identical moves replay identically. Designers may test a seed about 1k times and retain seeds near target difficulty. — [Heorhiiev, Gamigion](https://www.gamigion.com/?p=17718)
- **[Practitioner]** Refill weights can reduce one color. The author says a 20-30% change with 4-5 colors is unlikely to be noticed, and gives an example rule that lowers one color from 100 to 50 when a hard level is behind at move 15 of 25. Impact can be minimal and no win is guaranteed. — [Heorhiiev, Gamigion](https://www.gamigion.com/?p=17718)
- **[Practitioner]** The same author recommends not starting a new project with automatic difficulty adjustment. — [Heorhiiev, Gamigion](https://www.gamigion.com/?p=17718)

**Contested or unverified claims about hidden manipulation**
- **[Unverified, second-hand]** A 2014 GamesBrief article reports Tommy Palm of King saying Candy Crush is random throughout and difficulty changes at the same rate for all players. It also cites King's F-1 as saying economy rules stay identical. I did not read the F-1 directly, and a 2014 statement cannot describe current systems. — [GamesBrief](https://www.gamesbrief.com/2014/02/if-king-fixes-candy-crush-saga-to-make-you-pay-more-based-on-your-behaviour-they-are-going-to-prison)
- **[Allegation]** The same article records Ramin Shokrizade's allegation that King shifts from skill-based to money-based difficulty after a player shows willingness to pay. I found no primary evidence confirming it. — [GamesBrief](https://www.gamesbrief.com/2014/02/if-king-fixes-candy-crush-saga-to-make-you-pay-more-based-on-your-behaviour-they-are-going-to-prison)
- **[Studio statement, limited]** In 2024 King said it profiles player skill and maps it onto level designs to predict experience. The report does not say this changes boards or refill per player, so it should not be cited as proof of personalized DDA. — [Mobilegamer.biz](https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/)

### Inferences
- Build deterministic seeded RNG from the start. It enables replay, bug reproduction, seed-difficulty measurement, and bot comparisons.
- For a prototype, curate seeds per level and disclose any assist rather than using hidden per-player manipulation. If adaptive difficulty is tested later, an explicit post-failure assist avoids the trust problem.
- Because seed variance can be large (0.15-0.75 in EA's example), a level's difficulty should be reported across a seed set, never from one seed.

### Gaps
- I found no patent specifically claiming biased match-3 tile refill, and no patent from King on it. This is a limit of this search, not proof that none exists. A dedicated Google Patents/USPTO classification search is still needed.
- An EA patent fetch failed, so its claims were not read directly and press summaries are used.
- No public primary source confirms what current Candy Crush, Royal Match, or Homescapes builds do with refill or per-player seeds.

## What makes a level feel skillful versus luck-based? What do sources say about the balance of skill and chance?

### Takeaway
No located study directly measures match-3 players' perception of skill versus luck. The best evidence suggests near-wins, visible progress, and limited seed variance support perceived fairness, while "more puzzle-like" does not automatically mean more engaging.

### Cited Findings
- **[Studio statement]** King found its least engaging levels were harder, more skill-based puzzle levels, and treats puzzliness as separate from difficulty. — [Mobilegamer.biz](https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/)
- **[Measured]** EA's seed data shows the same level can take about 5x more attempts on its hardest seed than its easiest. EA attributes this partly to initial color clustering. — [Xue et al., 2017](https://archives.iw3c2.org/www2017/proceedings/companion/p465.pdf)
- **[Measured]** Roohi et al. note Dream Blast is highly random and compensate by running agents many times per level. — [Roohi et al., 2021](https://arxiv.org/pdf/2107.12061)
- **[Patent description]** A token-match patent says typical match-3 randomness enters when empty spots refill, and that no-refill variants rely more on planning than luck, which not all players prefer. — [US 9,333,421](https://image-ppubs.uspto.gov/dirsearch-public/print/downloadPdf/9333421)
- **[Practitioner]** Sande Chen argues levels that leave the player one or two moves short still feel solvable despite luck, and prefers layouts that are guaranteed solvable without boosters. This was seen through a search summary. — [Game Developer](https://gamedeveloper.com/design/a-look-at-puzzle-games)
- **[Practitioner]** Room 8 distinguishes "Fuu-effect" levels, built to be 1-2 moves short, from "skill" levels that test a specific solution. — [Room 8 Studio, 2019](https://room8studio.com/news/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1/)
- **[Opinion]** Pocket Gamer argues luck is built into match-3 chain reactions and can be controlled by the engine. — [Pocket Gamer.biz](https://www.pocketgamer.biz/chain-reaction-of-luck/)
- **[Adjacent research]** A grounded-theory study examines how uncertainty drives moment-to-moment engagement in mobile casual games, but is not a match-3 skill/luck perception measure. — [Kumari et al.](https://eprints.whiterose.ac.uk/149801/1/fp1369_kumariA.pdf)

### Inferences
- A practical skill test is the **win-rate gap between a strong bot and a weak or random bot on the same seeds**. A large gap suggests decisions matter, while high variance across seeds at the same bot skill suggests luck dominates. This is a proposed method, not one validated in a located source.
- Skill can be made more legible by showing goal progress, letting players plan around visible blockers, and ensuring failures can be attributed to a choice. These need playtesting.
- Use near-loss design sparingly. "Always 1-2 moves short" can create tension, but it can also feel manipulative, and no located study quantifies the tradeoff.
- Automated tests cannot determine whether the balance feels fun or fair, so human playtesting remains required.

### Gaps
- No controlled study found that measures how match-3 players perceive skill and luck.
- No accepted quantitative skill-to-luck ratio for match-3 was found. General methods exist for tabletop and card games ([arXiv:2410.14363](https://arxiv.org/pdf/2410.14363), [arXiv:1811.00673](https://arxiv.org/pdf/1811.00673)) but were not validated on match-3.

## What practical tooling and automated bot methods can a small team use to balance levels?

### Takeaway
A small team should start with a deterministic headless simulator, a tier of cheap heuristic bots, a fixed seed set, and calibration against a few human players. Reserve MCTS for hard levels and defer deep learning until real player data exists.

### Cited Findings
- **[Practitioner]** Measurement options range from exhaustive search (accurate but very slow), random moves (useful only for finding bugs), and weighted empirical bots at 50-1k iterations, to prediction from player statistics (about 10% error on hard levels, per the author). — [Heorhiiev, Gamigion](https://www.gamigion.com/?p=17718)
- **[Measured]** Avalon validated levels with a scripted bot at 30 plays per level, storing median and SD of moves. — [Villanueva Aylagas et al., 2024](https://arxiv.org/html/2409.06349v2)
- **[Measured]** King's MCTS benchmark used 100 attempts per level and 200 simulations per move, reaching 5.4% MAE after statistical calibration. — [Gudmundsson et al., 2018](https://www.gwern.net/doc/reinforcement-learning/imitation-learning/2018-gudmundsson.pdf)
- **[Measured]** Kristensen's PPO setup used 8 simultaneous agents, entropy coefficient 0.01, learning rate 1e-4, and an action mask. — [Kristensen et al., 2020](https://arxiv.org/html/2306.14626v1)
- **[Measured]** Roohi's feature set used average moves left from the top 15% of runs, cleared-goal percentage from the top 5%, and pass rate over all runs. — [Roohi et al., 2021](https://arxiv.org/pdf/2107.12061)
- **[Tool]** Match3Toolkit is an open-source Godot toolkit with swap and collapse modes, gadgets, obstacles, goals, and metric collection. It is useful as a reference, not a Phaser dependency. — [Eckmann et al., 2024](https://downloads.hci.informatik.uni-wuerzburg.de/2024-CoG-RoyalCrush.pdf); [GitHub link listed in paper](https://github.com/DanielEckmann/Match3Toolkit)
- **[Studio/Measured]** EA's designers also used repeated DDA recommendations as a signal to lower a level's default difficulty, which is a useful offline tuning pattern. — [Xue et al., 2017](https://archives.iw3c2.org/www2017/proceedings/companion/p465.pdf)

### Inferences
Recommended pipeline for an original HTML5 prototype (inference synthesized from the sources above):

1. **Deterministic core:** Separate board rules from Phaser rendering, and inject a seeded PRNG for initial board and refill. Same seed plus same moves must yield the same state hash.
2. **Bot ladder:** Random bot for crash and softlock detection; greedy bot for a casual baseline; weighted heuristic bot for goal-aware play; shallow MCTS only on levels flagged hard.
3. **Sampling:** Use 20-50 seeds per level, with enough runs for a stable estimate. As a binomial guide, 400 runs gives about +/-5 percentage points at 50% win rate (95% CI), and 1,000 runs gives about +/-3.1 points.
4. **Per-level report:** Win rate by bot, seed P10/P50/P90, attempts-to-win (1/p), moves left on win, goals remaining on loss, reshuffles, cascades per move, and specials created.
5. **Calibration:** Have a few humans play 10-20 anchor levels, then fit a simple logistic mapping from bot win rate to human win rate. Use it to rank levels first, and do not claim exact pass-rate prediction.
6. **Gates:** Flag levels that are unwinnable by the strongest bot, have extreme seed spread, trivial wins with many moves left, or excessive reshuffles.
7. **Iteration:** Tune moves, color count, blocker layout, and seed set before adding DDA. Compare before and after on the same seeds to reduce noise.

### Gaps
- No located source gives a validated minimum sample size for bots in an original small-scale match-3. The binomial figures above are standard statistics, not game-specific findings.
- Calibration quality with only a few human testers is untested in the sources. Published calibrations rely on large live datasets.
