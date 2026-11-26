# Monetization and Player Psychology in Match-3 Puzzle Games

Research date: 2026-11-23. Evidence labels used below:
- **[A]** primary source read in full or in the relevant part (paper, regulator page, or law-firm summary of a primary text)
- **[B]** search excerpt of a credible source; full text not read, so check before quoting
- **[C]** vendor, developer blog, or aggregator; treat as practitioner opinion or marketing

Allegations are labelled as allegations. Nothing here is legal advice.

## How do lives/energy, boosters, extra moves, coins, and rewarded ads work, and how do they influence level design?

### Takeaway
The usual match-3 economy sells relief at points of difficulty, so level difficulty is also an economy parameter. This coupling is well described by practitioners, but public causal evidence on individual sinks is scarce. The best independent evidence concerns difficulty, churn, and difficulty adjustment rather than specific offers.

### Cited Findings
**Mechanics (practitioner descriptions)**
- Lives: Candy Crush Saga makes players wait real time for lives to regenerate after running out. [B] — [Wikipedia: Candy Crush Saga](https://en.wikipedia.org/wiki/Candy_Crush_Saga)
- Common sinks described in developer guides: pre-level boosters, in-level tools, and a post-failure extra-moves offer. Lives may also be refilled by ads or friends. [C] — [Galaxy4Games](https://galaxy4games.com/en/knowledgebase/blog/match-3-game-development-complete-guide-for-mobile-games); [Innovecs Games](https://www.innovecsgames.com/blog/match-3-game-development/); [VSQUAD](https://vsquad.art/blog/articles/match-3-game-design-what-is-it-how-to-make/)
- Developer guidance claims extra-move offers sell only when levels are hard enough and the player feels close to winning, with failure at one or two moves left converting better than failure at ten. No data was shown in the excerpt. [C] — [Galaxy4Games](https://galaxy4games.com/en/knowledgebase/blog/why-match-3-games-are-still-one-of-the-most-profitable-mobile-genres); [Innovecs Games](https://www.innovecsgames.com/blog/match-3-game-development/)
- Hard-level bundles: one industry article describes premium bundles timed to hard levels, containing unlimited boosters, lives, and extra moves, varied by player segment, plus ad-watched boosters. The visible text gives no metrics and the body is paywalled. [C] — [Gamigion](https://www.gamigion.com/smart-monetization-approach-for-hard-levels-in-match-3-games/)
- Win streaks: a design essay reports Candy Crush's Sweet Streak reaching +3 moves per level, notes each added move makes a calibrated level noticeably easier, and warns that boosters can be bought to sustain a streak. [C] — [Abhay Ram, Medium](https://medium.com/@abhayram/the-design-of-streak-systems-in-match-3-games-e9c6787a1a9e)

**Difficulty, churn, and adjustment (research)**
- *Angry Birds Dream Blast* (free-to-play match-3, about 95,000 players): level churn without completion correlated with difficulty, reported as Spearman r = -0.586. The sign depends on how the paper codes difficulty, which was not confirmed. Correlational. [B] — [Roohi et al., arXiv 2008.12937](https://arxiv.org/pdf/2008.12937)
- Randomized field experiment in a mobile game (about 300,000 players, 12 weeks): difficulty was adjusted for users identified as at risk of churn and compared with a randomized holdout. Authors report that difficulty changes can turn inactive or at-risk players into profitable customers. Working paper; effect sizes not extracted. [B] — [Ascarza, Netzer & Runge, Columbia](https://business.columbia.edu/sites/default/files-efs/citation_file_upload/ascarza_netzer_runge_2023-12-04.pdf)
- EA's engagement-optimized dynamic difficulty system reported up to 9% engagement improvement with neutral monetization impact (WWW 2017). Company-authored. [B] — [Xue et al.](https://archives.iw3c2.org/www2017/proceedings/companion/p465.pdf)

**Rewarded ads**
- Tapjoy reported that users engaging with rewarded ads were 4.5 times more likely to make an in-app purchase. This is a vendor comparison open to self-selection, so it does not show that ads cause purchases. [C] — [PocketGamer.biz](https://www.pocketgamer.biz/tapjoy-rewarded-ads-report/); [App Developer Magazine](https://appdevelopermagazine.com/mobile-rewarded-ads-help-increase-iap-spends-shows-study/amp/)
- Unity's material reports limited retention harm and possible revenue gains from rewarded ads, but one cited case is explicitly not a scientific experiment. [C] — [Unity](https://unity.com/blog/understanding-the-impact-of-rewarded-ads-on-iap-retention-and-engagement)

### Inferences
- Any change to move budgets, booster power, streak bonuses, or free currency shifts the effective difficulty curve. Pass rates should be measured separately with and without assistance.
- A pass rate that includes paid boosters and continues can hide a level that is too hard for non-payers.
- The extra-moves offer has the sharpest design conflict: its value rises when the player narrowly fails, creating an incentive to tune for narrow failure.
- Difficulty adjustment can serve retention or extraction. The same tool becomes ethically different if it raises difficulty for likely payers.

### Gaps
- No public controlled data was found on conversion by moves remaining, booster price elasticity, or lives-timer length in a match-3 game.
- Deconstructor of Fun, Mobile Dev Memo, and GDC material was not successfully retrieved in this pass, so the practitioner layer relies on weaker blogs.
- The full texts of Ascarza et al. and Roohi et al. could not be parsed here. Verify effect sizes and the correlation's direction before citing.
- No evidence was found on whether any named match-3 title deliberately engineers near-misses or personalizes difficulty by spending.

## What is documented about near-miss effects, loss aversion, sunk cost, variable rewards, and flow?

### Takeaway
Only the near-miss effect has a direct peer-reviewed match-3 experiment, and it is a single small study with mixed measures and no spending outcome. Evidence for sunk cost, loss aversion, and variable rewards in match-3 is indirect or absent, while loot-box findings are mostly correlational and should not be transferred automatically.

### Cited Findings
**Near-miss: direct match-3 evidence**
- Larche, Musielak & Dixon, *Journal of Gambling Studies* 33(2), online 2016, issue 2017: 60 avid Candy Crush players recruited, 57 analyzed; ages 18-24, 48 of 57 female; about 30 minutes of play. A near-miss was three or fewer moves short. Outcomes occurred naturally and were not manipulated or counterbalanced. [A] — [PMC5445157](https://pmc.ncbi.nlm.nih.gov/articles/PMC5445157/)
- Near-miss versus ordinary loss: heart rate p = .05, self-rated arousal p = .03, frustration p = .04, urge to play p = .05. [A] — [PMC5445157](https://pmc.ncbi.nlm.nih.gov/articles/PMC5445157/)
- Measures that did **not** separate near-miss from loss: skin conductance p = .83 and post-outcome pause 1.85 s versus 1.92 s, p = .60. [A] — [PMC5445157](https://pmc.ncbi.nlm.nih.gov/articles/PMC5445157/)
- Stated limitations include small mostly female student sample, levels below personal best, tablet play, uncontrolled outcome order, possible movement effects on skin conductance, and no lockouts, so the link to microtransactions was untested. [A] — [PMC5445157](https://pmc.ncbi.nlm.nih.gov/articles/PMC5445157/)
- A separate experiment using a bicycle-racing video game reported more boredom and less excitement for near-miss than for a large-margin win, so near-miss findings may not generalize simply across game types. [B] — [Int. J. Mental Health and Addiction](https://link.springer.com/article/10.1007/s11469-019-00070-9)

**Sunk cost**
- Rietveld's experiment on freemium versus premium versions invoked the sunk-cost effect, but relied on stated time and spending intentions. [B] — [RSM Erasmus, 2017](https://rsm.nl/discovery/2017/consumers-spend-less-time-and-money-on-freemium-video-games)
- An undergraduate thesis on gacha players reported that prior in-app spending was associated with sunk-cost susceptibility. Weak evidence: not match-3, student-level, correlational. [B] — [UPLB](https://www.ukdr.uplb.edu.ph/etd-undergrad/13273/)

**Variable rewards and loot-box-like spending (adjacent evidence)**
- Spicer et al. (2021) systematically reviewed links among loot boxes, problem gambling, and problem gaming, and noted the cross-sectional nature of the evidence. [B] — [New Media & Society, open access](https://www.open-access.bcu.ac.uk/14466/1/Spicer_Loot_Boxes_Problem_Gambling_2021.pdf)
- A meta-analysis found an association between problem-gambling symptoms and loot-box spending, while stating that correlation cannot distinguish the direction of cause or rule out third variables. [B] — [Garea et al.](https://figshare.utas.edu.au/articles/journal_contribution/Meta-analysis_of_the_relationship_between_problem_gambling_excessive_gaming_and_loot_box_spending/22996898/1/files/40746986.pdf)
- A 2022 PLOS ONE scoping review described the relationship as small but potentially clinically relevant, and reported little convincing support for the "gateway" hypothesis, calling for more longitudinal research. [B] — [PMC8794181](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8794181/)
- Close et al. (*Addictive Behaviors*, 2021; 7,767 loot-box purchasers) concluded that revenue came disproportionately from high spenders and from moderate and high-risk gamblers rather than high earners. Funded by GambleAware. [B] — [Plymouth research portal](https://researchportal.plymouth.ac.uk/en/publications/secondary-analysis-of-loot-box-data-are-high-spending-whales-weal/)

**Flow and difficulty**
- A 2024 mobile-puzzle paper uses the flow rationale, that too easy risks boredom and too hard risks frustration, to motivate difficulty modelling. It does not itself establish that flow drives retention. [B] — [Kristensen et al., IJCGT](https://onlinelibrary.wiley.com/doi/full/10.1155/2024/5592373)

**Dark patterns in games**
- King, Fitton & Cassidy (CHI PLAY 2023) examined player perceptions of monetization-related deceptive design in freemium 3D games and identified six categories. Not match-3-specific. [B] — [Proc. ACM HCI](https://knowledge.lancashire.ac.uk/id/eprint/49285/1/3611053.pdf)
- Niknejad et al. analyzed user reviews of 1,496 mobile games for dark patterns. Preprint; peer review not confirmed. [B] — [arXiv 2412.05039](https://www.arxiv.org/abs/2412.05039)

### Inferences
- Supportable wording: "In one small lab study, Candy Crush near-misses were associated with higher arousal, frustration, and urge to play than ordinary losses." Unsupported wording: "near-misses cause spending" or "match-3 games are addictive."
- Several near-miss p-values sit at the conventional threshold and behavior (pause time) did not differ, so the effect should be treated as suggestive pending replication.
- Paid continues are a plausible setting for loss aversion and sunk-cost reasoning, but this is theory applied by analogy, not a measured match-3 effect.
- Deterministic boosters differ from randomized loot boxes. Random chests or spin wheels bought with purchased currency sit closer to the loot-box evidence and regulatory concern.

### Gaps
- No replication of Larche et al. was found, and no controlled study of near-miss frequency on match-3 spending.
- No peer-reviewed study specifically testing loss aversion or variable-ratio rewards in match-3 was found.
- A search excerpt described a puzzle-game study in which low challenge was linked to enjoyment and relaxation, contrary to simple flow theory, but its source could not be pinned down. Treat as a lead only.
- No longitudinal study establishing causal direction between casual-game spending and harm was found.

## What share of players pay and how concentrated is revenue?

### Takeaway
Public data supports the general statement that a small minority pays, but reliable match-3-specific concentration figures were not found. The best dated figures are company-wide filing metrics and one academic loot-box dataset; widely repeated "whale" percentages are inconsistent.

### Cited Findings
- Playtika (US-listed mobile games company, company-wide, not match-3-specific), Q4 2025: average daily payer conversion 4.5% versus 4.2% in Q4 2024; 357 thousand daily paying users; 7.9 million DAU; ARPDAU $0.93. [B] — [Q4/FY2025 results, Feb 2026](https://www.barchart.com/story/news/437204/playtika-holding-corp-reports-q4-and-2025-financial-results)
- Playtika FY2025 versus FY2024, as extracted from the same table: conversion 4.4% versus 3.8%, DPU 370 thousand versus 312 thousand, DAU 8.5 million versus 8.1 million, ARPDAU $0.89 versus $0.86. Verify against the 10-K because the table layout is easy to misread. [B] — [Q4/FY2025 results](https://www.barchart.com/story/news/437204/playtika-holding-corp-reports-q4-and-2025-financial-results)
- Playtika defines daily payer conversion as daily paying users divided by daily active users, so it is not the share of players who ever pay. [B] — [Playtika filing](https://investors.playtika.com/static-files/c43bf274-ddde-40b7-a959-086b74c69d91)
- Close et al. (2021) found disproportionate revenue from high-level spenders among 7,767 loot-box purchasers. This is survey-based and not a match-3 sample. [B] — [Plymouth research portal](https://researchportal.plymouth.ac.uk/en/publications/secondary-analysis-of-loot-box-data-are-high-spending-whales-weal/)
- Aggregators give conflicting concentration claims, such as the top 1-2% producing 50-60% of IAP, the top 5% producing 65%, or the top 10% producing about 80%, often attributed to Sensor Tower or Unity without a checkable primary link. **Do not cite as fact.** [C] — [VoxBooster](https://voxbooster.com/blog/microtransactions-statistics-2026/); [WifiTalents](https://wifitalents.com/mobile-game-monetization-statistics/); [Solar Engine](https://blog.solar-engine.com/en-blog/docs/casual-games-iap-monetization-strategies)

### Inferences
- A safe statement is: "Payers are usually a small minority, and revenue is often concentrated among a smaller group of high spenders." Exact shares vary by metric, title, time window, and denominator.
- Daily conversion, monthly conversion, and lifetime payer share should never be compared directly.
- Concentration creates an ethical risk: if high spend correlates with vulnerability in a given game, revenue dependence may conflict with player protection. Match-3-specific evidence for that correlation was not found.

### Gaps
- No audited public revenue-concentration figure for a match-3 title was found.
- Original Sensor Tower and Unity reports were not verified.
- King-level payer share and spend distribution were not retrieved from filings in this pass.

## What regulatory or ethical concerns apply?

### Takeaway
Regulators are increasingly focused on virtual-currency opacity, pressure, and minors, and those concerns map directly onto common match-3 patterns. No regulator action against a match-3 game was found in this pass, so applicability to match-3 is an inference from adjacent cases.

### Cited Findings
**EU**
- 21 March 2025: the CPC Network issued seven non-binding Key Principles on purchased in-game currencies: real-money price display, no obscured costs or multiple-currency complexity, no forced excess currency purchases, pre-contract information, withdrawal rights, fair terms, and protection of vulnerable consumers such as children. Currencies only earned through play are out of scope. [A] — [Reed Smith](https://www.reedsmith.com/articles/qas-on-the-eu-consumer-protection-authorities-joint-guidance-paper/)
- The CPC action against Star Stable raised child-directed purchase appeals, time-limited pressure, and unclear currency information. Final outcome not found. [B] — [Linklaters](https://techinsights.linklaters.com/post/102k6t4/game-changer-eu-introduces-consumer-protection-guidance-for-in-game-virtual-curr)
- The Commission hosted a stakeholder workshop on the principles on 3 June 2025. [B] — [European Commission](https://commission.europa.eu/news-and-media/news/european-commission-hosts-stakeholders-talks-application-cpc-networks-key-principles-games-virtual-2025-06-03_en)

**Italy (open investigation as last reported)**
- January 2026: AGCM opened two investigations into Activision Blizzard over *Diablo Immortal* and *Call of Duty Mobile*, alleging misleading and aggressive practices. Named concerns include prolonged-play design, fear-of-missing-out prompts, opaque currency pricing, bundled currency, default parental controls, and consent flow. No findings were reported. [A] — [TechCrunch, 2026-01-16](https://techcrunch.com/2026/01/16/italy-investigates-activision-blizzard-for-pushing-in-game-purchases/)

**United States**
- 17 January 2025: FTC announced a proposed $20 million settlement with Genshin Impact's publisher. Allegations covered confusing virtual-currency conversion, unclear odds, unfair marketing to minors, and COPPA violations. Proposed terms include no loot-box sales to under-16s without parental consent, mandatory disclosures, and a direct real-money purchase option. Court approval was required at the time of the post. [A] — [FTC Business Blog](https://ftc.gov/business-guidance/blog/2025/01/level-tips-businesses-ftcs-settlement-genshin-impact-developer-hoyoverse)

**United Kingdom**
- CMA direct consumer enforcement under the DMCC Act began 6 April 2025. On 18 November 2025 it opened cases into 8 businesses and sent advisory letters to 100 more, focused on online pricing practices including drip pricing and pressure selling. These are not game cases. [B] — [UK Government](https://www.gov.uk/government/news/cma-launches-major-consumer-protection-drive-focused-on-online-pricing-practices); [CMS](https://cms.law/en/gbr/legal-updates/price-transparency-guidance-lands-as-cma-launches-first-consumer-law-investigations-using-its-new-dmcc-act-powers)
- Reported first DMCC penalties: AA Driving School £4.2 million (15 April 2026) and StubHub £889,200 (reported July 2026). Not checked against CMA originals. [B] — [CMS](https://cms.law/en/gbr/legal-updates/aa-receives-a-juggernaut-sized-fine-from-the-cma-first-financial-penalty-for-breach-of-consumer-law-under-digital-markets-competition-and-consume); [Osborne Clarke](https://www.osborneclarke.com/insights/cma-issues-first-fines-under-its-new-uk-direct-consumer-enforcement-powers)
- July 2023: UK industry published 11 loot-box principles, including age assurance, refunds, and probability disclosure. This is self-regulation. [B] — [CMS](https://cms.law/en/gbr/legal-updates/loot-boxes-11-new-principles-for-an-industry-led-approach)
- Disputed compliance: Xiao and co-author reported that none of the top 100 UK iPhone games sought explicit parental consent before enabling under-18 loot-box purchases, and 7 of 81 (8.6%) consistently disclosed probabilities. The trade body strongly disputed the study. [B] — [Royal Society blog, 2025](https://royalsociety.org/blog/2025/06/video-game-industry-loot-boxes/); [mobilegamer.biz](https://mobilegamer.biz/accusations-fly-as-researcher-claims-uk-loot-box-regulations-are-failing/)

**Cases involving casual puzzle games**
- Private US suit reported in 2015 alleged King removed players' lives to push purchases, invoking Illinois consumer-fraud law. Allegation; outcome not verified. [B] — [Courthouse News](https://www.courthousenews.com/candy-crush-life-donations-inspire-lawsuit/); [NBC Chicago](https://www.nbcchicago.com/news/local/candy-crush-lost-lives/53870/)
- Class actions alleged misleading odds in Candy Crush's All Stars tournament. Activision sought dismissal and arbitration. Allegations; outcomes not verified. [B] — [Top Class Actions](https://topclassactions.com/lawsuit-settlements/lawsuit-news/candy-crush-class-action-alleges-lucrative-all-stars-tournament-was-unfair/); [Communications Litigation Today, 2023](https://communicationslitigationtoday.com/article/2023/07/19/court-should-dismiss-candy-crush-fraud-case-compel-claims-to-arbitration-says-activision-2307180038)

### Inferences
- High-risk match-3 patterns under these frameworks: coin packs that hide the real price of a continue, pack sizes that force leftover currency, countdown offers after failure, default-on purchases for minors, random rewards bought with paid currency, and unclear competition odds.
- A purchased coin used for extra moves appears to fall within the CPC principles' scope. A purely earned currency appears to fall outside them, unless it can also be bought.
- A failure-screen offer is not unlawful in itself. Risk rises when it combines urgency, obscured real cost, repeated escalation, or targeting of children.

### Gaps
- No BEUC, ACM, AGCM, FTC, or CMA action specifically against King or a match-3 title was found. This is not proof that none exists.
- Current status of Star Stable, the AGCM cases, and final court approval of the FTC order were not confirmed.
- A search excerpt reported industry-body objections to the CPC process, but the exact source was not pinned down.
- Jurisdictions outside the EU, UK, and US (including Vietnam and other Asian markets) were not covered.

## What design alternatives preserve fairness while still supporting a business model?

### Takeaway
No study was found proving that a specific "fair" match-3 economy matches conventional revenue, so the options below are design inferences tied to documented risks. The practical approach is to A/B test them with guardrails for harm as well as revenue.

### Cited Findings
- Regulator-aligned practices include real-money price display, simpler currency, avoiding forced excess purchases, clear withdrawal information, parental controls, and consumer-friendly defaults. [A] — [Reed Smith on CPC principles](https://www.reedsmith.com/articles/qas-on-the-eu-consumer-protection-authorities-joint-guidance-paper/)
- The FTC's proposed Genshin order points to direct real-money purchase and clear odds disclosure as remedies in that case. [A] — [FTC Business Blog](https://ftc.gov/business-guidance/blog/2025/01/level-tips-businesses-ftcs-settlement-genshin-impact-developer-hoyoverse)
- Randomized field evidence suggests that lowering friction for at-risk players can be commercially viable in at least one game, subject to verification of the working paper. [B] — [Ascarza, Netzer & Runge](https://business.columbia.edu/sites/default/files-efs/citation_file_upload/ascarza_netzer_runge_2023-12-04.pdf)
- EA reported engagement gains from difficulty adjustment without a negative monetization result. [B] — [Xue et al.](https://archives.iw3c2.org/www2017/proceedings/companion/p465.pdf)

### Inferences
**Economy and offers**
- Prefer one premium currency or direct prices, and show the real-money equivalent at every purchase.
- Sell exact-need items, for example a single continue at a visible price, instead of forcing a larger coin pack.
- Cap or flatten continue-price escalation in a single attempt, and always give a clear equal-prominence "give up" action.
- Avoid countdown timers on failure screens. Reserve time limits for real events.
- Use deterministic rewards where possible. If randomness remains, publish odds and do not sell it to minors by default.
- Consider business models less dependent on failure: cosmetics, decoration or meta progression, a capped season pass, a no-ads purchase, or a one-time "unlimited lives" unlock.

**Level design**
- Verify every level is solvable without paid items, using bots and human playtests.
- Track unassisted pass rate, assisted pass rate, attempts, and churn separately.
- Never raise difficulty based on spending propensity. Use difficulty adjustment only as assistance, and disclose that assistance exists.
- Add pity help after repeated failures, such as a free booster, so progress does not rely on payment.
- Do not artificially manufacture near-misses through hidden board manipulation.

**Player protection**
- Offer spending summaries, optional limits, session reminders, and off-by-default purchase access for child accounts.
- Keep rewarded ads optional, frequency-capped, and never required to continue core progress.

**Suggested guardrail metrics**
- Unassisted completion, refund rate, complaint rate, purchase regret survey, spend concentration, long-session frequency, and retention by payer and non-payer cohorts.

### Gaps
- No public A/B test comparing a fair match-3 economy against a conventional one on long-term revenue and player welfare was found.
- No validated, widely adopted harm metric for casual mobile games was found.
- Player enjoyment and perceived fairness need testing with real players. Automated tests cannot establish them.
