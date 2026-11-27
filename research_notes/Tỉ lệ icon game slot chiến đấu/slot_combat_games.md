# Slot/reel combat and roguelike games: symbol frequencies for attack vs elemental/skill vs support

Research date: 2026-11-27. Many fetches failed (fandom wikis returned HTTP 402; Steam store pages and several review sites reset the connection), so some findings rely on search-engine summaries of those pages. These are flagged "(via search summary)". No dev postmortem or GDC talk with actual weight tables for a slot *combat* game was found.

## Q1. Which games combine reels with combat, and how are their symbols weighted / composed?

### Takeaway
The commercial slot-combat roguelikes (Slots & Daggers, Slots and Dungeons, Spin Hero, Dungeon Reels Tactics) all use a small starter set, roughly 1 attack + 1 defense + 1 economy symbol, and grow a player-built pool over the run. None of them publishes weight tables. The closest published numeric weight table found belongs to CloverPit, a non-combat slot roguelike: its most common to rarest symbol ratio is only about 2.6:1. In the prototype, Sword sits at 40/100.

### Cited Findings
- **Slots & Daggers** (Friedemann / Future Friends Games, Steam, released 2025-10-24). Reels show weapons, shields, other items and coins. A sword attacks, a shield protects against the enemy's next move, and coins buy upgrades between fights. More spells and equipment appear as you progress, and equipment changes which symbols are available. Physical and magic attacks interact differently with enemy shields. — [NoobFeed: When Combat Runs on Spinning Reels](https://www.noobfeed.com/articles/when-combat-runs-on-spinning-reels)
- Slots & Daggers starts each run with 3 symbols: dagger (or sword, depending on the source), shield and coin. — [win.gg guide](https://win.gg/guide-mechanics-slots-daggers-slot/); [Rogueliker review](https://rogueliker.com/slots-and-daggers-review/) ("a mere three symbols")
- Slots & Daggers: matching 3 symbols triggers the effect. Three-of-a-kind gives a Critical Hit (via search summary of reviews). Later unlocks add poison, crits and multi-target attacks, and coins buy extra reels, modifiers and stat upgrades. — [win.gg](https://win.gg/guide-mechanics-slots-daggers-slot/); [Escapist review](https://www.escapistmagazine.com/reviews/slots-and-daggers/) (via search summary)
- Slots & Daggers symbol categories: damage (physical and magic), health, shield, economy. New symbols are added to the starting pool over time, and "an even more diverse pool [is] available mid-run." — [Rogueliker review](https://rogueliker.com/slots-and-daggers-review/)
- **Slots and Dungeons** (Steam app 4451610, Early Access, solo dev). The player chooses which symbols to bring into a dungeon, for example sword, shield, healing, poison, ice and fire. Each dungeon has "weakness symbols" shown at the entrance. Three or more identical symbols trigger critical effects; the crit claim comes from GG.deals, a secondary source. — [Steam 4451610](https://store.steampowered.com/app/4451610/_/); [gg.deals](https://gg.deals/ca/game/slots-and-dungeons/) (via search summary)
- **Dungeon Reels Tactics** (Steam 1901030, iOS). Each party member has their own slot machine, and each turn it gives 3 random abilities from that character's reel. There are 24 characters, with a pool of 12 recruitable per run. — [Steam 1901030](https://store.steampowered.com/app/1901030); [TouchArcade thread](https://toucharcade.com/community/threads/423928) (via search summary)
- **Spin Hero** (Steam 2917350). A roguelike deckbuilder: you spin reels and collect symbols into an inventory. — [Steam 2917350](https://store.steampowered.com/app/2917350); [Pocket Gamer](https://www.pocketgamer.com/spin-hero/out-now/) (via search summary)
- **Other titles found, with no detail available:** Slots & Skulls (load the symbol pool with spells and poisons); Slot & Dungeons (app 3160090, a different game: a deckbuilder where slots change enemy and item placement); a slot-knight game where reels are stopped one at a time and each symbol triggers attack, heal or defend in order. — [Slots & Skulls](https://store.steampowered.com/app/4428910/Slots__Skulls/); [Slot & Dungeons](https://store.steampowered.com/app/3160090/_/) (via search summary)
- **Luck be a Landlord** (non-combat slot deckbuilder; it inspired Balatro). The press kit lists 152 symbols and 227 items. The board is a player-built pool: you add a symbol from 3 offers after each spin. — [TrampolineTales press kit](https://www.trampolinetales.com/lbal/presskit); [Shacknews](https://shacknews.com/article/139116/balatro-inspiration-luck-be-a-landlord-reddit-ama)
- LBAL rarity example from the wiki: with a 5x multiplier at the 5th rent payment, offer chances are Very Rare 2.5%, Rare 7.5%, Uncommon 90%, Common 0%. Items split into 50 Common, 30 Uncommon, 23 Rare and 10 Very Rare. — [LBAL Fandom: Symbols](https://luck-be-a-landlord.fandom.com/wiki/Symbols); [LBAL Fandom: Items](https://luck-be-a-landlord.fandom.com/wiki/Items) (via search summary; the pages themselves returned 402). These are *offer* rarities, not frequencies on the reels.
- **CloverPit** (slot roguelike, non-combat) publishes the clearest base weight table, from a fan guide and the Gamerch JP wiki:
  - Lemon and Cherry: 1.3 each (about 19.4%)
  - Clover and Bell: 1.0 each (about 14.9%)
  - Diamond and Treasure: 0.8 each (about 11.9%)
  - Seven: 0.5 (about 7.5%)
  - Total weight: 6.7
  - Source: [Neon Lights Media guide](https://www.neonlightsmedia.com/blog/cloverpit-guide-mechanics-explained-luck-secrets); [Gamerch CloverPit](https://gamerch.com/cloverpit/944307) (fan sources, could change with patches)
- **Coin Master** (mobile slot with attack and raid). Three hammers give an Attack, three pigs give a Raid, and a shield symbol gives a shield (cap 3). No official odds were found. — [levvvel](https://levvvel.com/coin-master/gameplay/attacks/); [LevelWinner](https://www.levelwinner.com/?p=37054) (via search summary)

### Inferences
- Common pattern: the basic attack, defense and economy symbols are the starter set, and elemental or skill symbols are *added* by the player rather than being rare by weight. Specials feel rare only if the pool is large and undiluted.
- In CloverPit, the most common symbol is about 2.6x the rarest (1.3 vs 0.5). In the prototype, Sword at 40/100 is a far steeper skew if each elemental sits around 10–15. Exact elemental weights were not given to me; compare against the prototype's config.
- A 4x4 grid with chain/match rules amplifies weight skew non-linearly: chain chance grows roughly with weight^k for a k-length match. That fits Sword at 40% chaining on 63% of turns while the elementals chain on about 1%. This is my inference, not sourced.

### Gaps
- No published per-symbol weights or reel-strip counts for any slot *combat* game (Slots & Daggers, Slots and Dungeons, Spin Hero, Dungeon Reels Tactics).
- No data on how many of each starter symbol Slots & Daggers places on its reels. The number of starting reels is also unknown.
- Pokémon or other licensed battle-slot games were not covered, because no time was left.

## Q2. How do these games keep special/elemental outcomes from being too rare?

### Takeaway
They control frequency through pool composition rather than fixed weights: player choice of symbols to add or bring, equipment that changes the pool, per-character reels, three-of-a-kind crit bonuses, and flat additive weight buffs (CloverPit). No pity or guarantee counters for combat symbols were found. LBAL uses "fairness" safety nets for the economy instead.

### Cited Findings
- **Player-built pool (Slots and Dungeons):** you equip the symbols you bring, and dungeon "weakness symbols" point you toward particular elements. — [Steam 4451610](https://store.steampowered.com/app/4451610/_/) (via search summary)
- **Equipment changes which symbols appear (Slots & Daggers).** — [NoobFeed](https://www.noobfeed.com/articles/when-combat-runs-on-spinning-reels)
- **Per-character reels (Dungeon Reels Tactics):** each character has its own reel, and 3 abilities are drawn per turn. — [Steam 1901030](https://store.steampowered.com/app/1901030) (via search summary)
- **Additive weight buffs (CloverPit):** each "manifest more often" upgrade adds a flat +0.8 weight. Sevens go from 0.5 to 1.3, a jump of nearly 10 percentage points in chance. This has diminishing returns, and some effects halve a symbol's weight. — [Neon Lights Media](https://www.neonlightsmedia.com/blog/cloverpit-guide-mechanics-explained-luck-secrets) (via search summary)
- **Rarity gating (LBAL):** the first spins only offer Common symbols, to reduce confusion for new players. LBAL deliberately does *not* steer builds, so forcing a single strategy is made less reliable. — [TrampolineTales Q&A](https://blog.trampolinetales.com/questions-and-danswers/)
- **Fairness safety net (LBAL):** if you pay rent and have 0 coins, the game gives you a coin. The designer's goal is that players never think "oh, that's not fair." — [TrampolineTales Q&A](https://blog.trampolinetales.com/questions-and-danswers/)
- **Rarity boosters (LBAL):** items such as Lucky Carrot and Recycling raise the rare chance, and Booster Pack guarantees a rare symbol. — [gamepretty guide](https://gamepretty.com/luck-be-a-landlord-symbol-item-guide/); [MGW rare items](https://www.magicgameworld.com/?p=125788) (via search summary)
- **Synergy dilution (LBAL):** synergies need multiple copies of one symbol, so they get less likely as more symbol types are added. The developer acknowledged this in a Steam discussion. — [Steam discussion](https://steamcommunity.com/app/1404850/discussions/0/3128289956327877528) (via search summary)

### Inferences
- For a fixed-weight 4x4 prototype, the transferable levers are:
  - Lower the basic attack's weight toward parity: a max/min ratio of about 2–3x, as in CloverPit.
  - Let the player add or upgrade elemental symbols with flat weight increments.
  - Give elemental symbols a per-character or per-enemy bias, similar to Slots and Dungeons' weakness symbols.
  - Add crit/bonus rewards for 3+ matches.
- No reviewed game uses wilds or pity counters for combat symbols, so either would be a novel addition and should be tested.

### Gaps
- No evidence of pity counters or dynamic weights in Slots & Daggers or Spin Hero; their wikis and store pages were not readable.
- No numbers on how much weight an "add symbol" action contributes in Slots & Daggers.

## Q3. Published numbers (frequency per spin, strip counts, probability tables, dev talks)?

### Takeaway
The only concrete published tables found are CloverPit's base weights (fan-documented) and an LBAL rarity-offer example. Nothing was found for slot combat games specifically.

### Cited Findings
- CloverPit base weights: 1.3 / 1.3 / 1.0 / 1.0 / 0.8 / 0.8 / 0.5 out of a total of 6.7, which gives 19.4% / 14.9% / 11.9% / 7.5%. The +0.8 buff rule is also fan-documented. — [Neon Lights Media](https://www.neonlightsmedia.com/blog/cloverpit-guide-mechanics-explained-luck-secrets)
- CloverPit "666" checks: base Triple Six is about 1.5%, with about 14.4% for some kind of six per spin. Another source cites a 30% cap for Triple Six (likely luck-boosted), 6% for a double and 7.5% for a single. The two sources conflict. — [Neon Lights Media](https://www.neonlightsmedia.com/blog/cloverpit-guide-mechanics-explained-luck-secrets); contradicted or complemented by [Mejoress](https://www.mejoress.com/the-cloverpit-bible-luck-schedules-666-anomalies-and-phone-secrets/)
- LBAL rarity offer example: 2.5% Very Rare, 7.5% Rare, 90% Uncommon at a 5x multiplier on the 5th rent. — [LBAL Fandom: Symbols](https://luck-be-a-landlord.fandom.com/wiki/Symbols) (via search summary)
- A Steam guide has a table of LBAL per-symbol rarity odds under rarity modifiers in endless mode, but the extracted text was unreadable. — [Steam guide 2916607523](https://steamcommunity.com/sharedfiles/filedetails/?id=2916607523)

### Inferences
- None beyond Q1.

### Gaps
- No GDC talk or postmortem on reel weighting in slot-combat games was found.
- No Coin Master official odds were found.

## Q4. What do players and reviewers say about the feel?

### Takeaway
Reviewers praise the slot-combat hybrids when the pool is varied and synergy-driven. The main complaints are RNG reliance, repetition, and the slot "always rolling the same." That matches the prototype's Sword-dominance problem. Over-stacking one symbol is described as backfiring.

### Cited Findings
- **Spin Hero:** fun for about 30 minutes, then repetitive. One complaint is that the slot "always roll[s] the same." Vaporlens lists over-reliance on RNG and repetitive gameplay as common complaints. — [Gamebrain](https://gamebrain.co/game/spin-hero); [Vaporlens](https://vaporlens.app/app/2917350/spin_hero) (via search summary)
- **Slots & Daggers:** stacking too many of one symbol backfires. If your shield is maxed but you keep equipping shield items, you spin them when you'd rather attack. — reviews via search summary ([Escapist](https://www.escapistmagazine.com/reviews/slots-and-daggers/), [GamesHub](https://www.gameshub.com/news/reviews/slots-daggers-review-2837009/))
- **Slots & Daggers:** new mechanics are introduced "at a nice pace." The reviewer found plenty of room for clever synergies, though "some of the symbols just won't work together effectively." — [Rogueliker](https://rogueliker.com/slots-and-daggers-review/)
- **Slots & Daggers:** distinct symbols and sounds and visible HP/shield bars make each spin's outcome readable. The article also stresses that "you don't get to choose what comes up." — [NoobFeed](https://www.noobfeed.com/articles/when-combat-runs-on-spinning-reels)
- **LBAL designer:** the goal is that players never feel a run was unfair. — [TrampolineTales Q&A](https://blog.trampolinetales.com/questions-and-danswers/)

### Inferences
- When a single basic symbol dominates, spins feel samey. That is the "always rolls the same" complaint, and the prototype's Sword at 63% chain rate is a strong candidate for it.
- Conversely, making every symbol frequent removes the excitement of the rarer ones. CloverPit keeps its rarest symbol at about 7.5% base, not about 1%.
- Whether the rebalanced prototype is "fun" cannot be judged from these sources or from automated tests. A human playtest is needed.

### Gaps
- No reviewer quotes specifically about elemental symbols being too rare in any slot-combat game.
- The GamesHub and Games Asylum Slots & Daggers reviews could not be fetched directly.
