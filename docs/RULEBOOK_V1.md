# Poker Strategy Rulebook v1.0

## Purpose

This is the grading specification for GTO Trainer v1.0. It is a simplified, deterministic, GTO-inspired strategy for learning strong poker fundamentals. The trainer grades only information available to the player at the time of the decision. Hidden opponent cards never influence whether a decision is correct.

## Game assumptions

- 6-max No-Limit Texas Hold'em cash game
- 100 big blinds effective
- No ante
- Rake ignored in v1.0
- Standard unopened-pot raise: **3 BB**
- When first into the pot: **raise or fold; never limp**

## Positions

- **UTG**: Under the Gun, first to act preflop
- **HJ**: Hijack
- **CO**: Cutoff
- **BTN**: Button
- **SB**: Small Blind
- **BB**: Big Blind

Later position permits wider ranges because acting later provides more information.

## Starting-hand notation

- `88`: a pocket pair of eights
- `AJs`: Ace-Jack suited
- `AJo`: Ace-Jack offsuit
- `TT+`: TT, JJ, QQ, KK, AA
- `A9s+`: A9s, ATs, AJs, AQs, AKs

## Unopened-pot ranges

Anything not listed folds.

### UTG

- Pairs: `77+`
- Aces: `AJs+`, `AQo+`
- Other: `KQs`

### HJ

- Pairs: `22+`
- Aces: `A9s+`, `ATo+`
- Kings: `KJs+`, `KQo`
- Queens: `QJs`

### CO

- Pairs: `22+`
- Aces: `A2s+`, `ATo+`
- Kings: `KTs+`, `KJo+`
- Queens: `QTs+`, `QJo`
- Jacks: `JTs`
- Suited connectors: `T9s`, `98s`, `87s`, `76s`, `65s`

### BTN

- Pairs: `22+`
- Aces: any suited Ace, `A8o+`
- Kings: `K8s+`, `KTo+`
- Queens: `Q9s+`, `QTo+`
- Jacks: `J9s+`, `JTo`
- Tens: `T8s+`
- Suited connectors: `98s`, `87s`, `76s`, `65s`, `54s`

### SB when folded to

- Pairs: `22+`
- Aces: any suited Ace, `A8o+`
- Kings: `K9s+`, `KTo+`
- Queens: `Q9s+`, `QTo+`
- Jacks: `J9s+`, `JTo`
- Suited connectors: `T9s`, `98s`, `87s`, `76s`, `65s`
- Raise to 3 BB or fold; do not limp in v1.0

## When someone limps

A **limp** means calling the big blind before the flop instead of raising.

Hero should generally raise or fold rather than limp behind.

- One limper, Hero in position: isolate to about **4 BB**
- One limper, Hero out of position: isolate to about **5 BB**
- Add about **1 BB per additional limper**
- Against one limper, use approximately Hero's normal opening range
- Against multiple limpers, tighten toward good pairs, strong Aces/Kings, and strong suited hands

An **isolation raise** is a raise intended partly to play a pot against the limper without several other players joining.

## Facing a raise

A **3-bet** is a re-raise of the initial preflop raiser.

### 3-bet sizing

- In position: about **3×** the opponent's raise
- Out of position: about **4×** the opponent's raise

### Facing UTG/HJ

3-bet:

- `QQ+`
- `AK`

Call when appropriate, especially in position:

- `88-JJ`
- `AQ`
- `AJs`
- `KQs`

Fold most other hands. In particular, `KQo` and `AJo` normally fold against strong early-position aggression.

### Facing CO

3-bet:

- `JJ+`
- `AK`
- `AQs`

Call:

- `77-TT`
- `AQo`
- `AJs-ATs`
- `KQs`
- `KJs`
- `QJs`
- `JTs`

### Facing BTN

3-bet:

- `TT+`
- `AQ+`
- `AJs+`
- `KQs`

The BB then uses its separate defense ranges.

## Big Blind defense

The Big Blind can continue wider because 1 BB is already invested.

### Versus UTG

Call approximately:

- `22-JJ`
- `A2s+`
- `AJo+`
- `KTs+`
- `QTs+`
- `JTs`
- `T9s`
- `98s`

3-bet `QQ+`, `AK`.

### Versus HJ

Use the UTG defense and add approximately:

- `K9s`
- `Q9s`
- `J9s`
- `87s`

### Versus CO

Continue approximately:

- `22-JJ`
- any suited Ace
- `A9o+`
- `K8s+`, `KTo+`
- `Q8s+`, `QTo+`
- `J8s+`, `JTo`
- `T8s+`
- `97s+`
- `87s`, `76s`, `65s`

### Versus BTN

Defend widest. Continue with any pocket pair, any suited Ace, most offsuit Aces, most suited Kings, strong offsuit Kings, most suited Queens, strong offsuit Queens, most suited Jacks, suited connectors, and many suited one-gap hands.

## Facing a 3-bet after Hero opened

A **4-bet** is a re-raise of a 3-bet.

- `AA-KK`: continue aggressively; usually 4-bet
- `QQ/AK`: generally continue; frequently 4-bet versus later-position aggression; calling is acceptable in some tighter contexts
- `JJ`: usually call reasonable-sized 3-bets, particularly in position
- `TT-99`: call selectively when in position, sizing is reasonable, and stacks remain near 100 BB
- `AQ`: call selectively; AQs is stronger than AQo; continue more readily versus later-position aggression
- `AJs/KQs`: may call reasonable 3-bets when in position against a wider range
- Weaker hands: fold by default

Version 1.0 does not require bluff 4-bets.

## Facing a 4-bet

- `AA/KK`: continue, normally willing to play for all the chips
- `QQ/AK`: continue against normal late-position aggression; use more caution against very tight early-position action
- `JJ` and weaker: fold by default

## Squeezes

A **squeeze** is a large re-raise after one player raises and another calls.

Version 1.0 uses a value-heavy squeeze range:

- `QQ+`
- `AK`
- Against later-position action, also consider `JJ` and `AQs`

No squeeze bluffs are required in v1.0.

## Postflop hand concepts

A **made hand** already has meaningful value: pair, two pair, trips, straight, flush, etc.

- Bottom pair: pair with the lowest board card
- Middle pair: pair with a middle board card
- Top pair: pair with the highest board card
- Overpair: a pocket pair higher than every board card
- Kicker: the side card used to break ties between similar pairs

## Draws and outs

A **draw** is an incomplete hand that can become much stronger on a later card.

- Flush draw: usually 9 outs
- Open-ended straight draw: usually 8 outs
- Gutshot straight draw: usually 4 outs
- Combo draw: more than one strong draw at once

An **out** is a remaining card likely to improve Hero to the winning hand.

Shortcut:

- Flop: outs × 4 ≈ chance to improve by the river
- Turn: outs × 2 ≈ chance to improve on the river

A **dirty out** is an apparent out that can also make an opponent an even stronger hand; obvious dirty outs should be discounted.

## Board texture

### Dry

Few straight/flush possibilities, e.g. K♣-7♦-2♠.

### Medium

Some meaningful draws, e.g. Q♣-9♣-4♦.

### Wet

Many straight/flush possibilities, e.g. 9♠-8♠-7♦.

### Paired

Two cards of the same rank, e.g. K-8-8.

### Monotone

Three cards of the same suit on the flop.

General principle: the wetter the board, the more cautious Hero becomes with weak one-pair hands.

## Flop continuation betting

A **continuation bet (c-bet)** is a flop bet by the preflop raiser.

### Dry flop

Default size: about **1/3 pot**.

Bet frequently with:

- top pair+
- overpairs
- good draws
- strong overcards on favorable boards

Very dry boards may support occasional small bluffs.

### Medium flop

Default: about **1/3 to 1/2 pot**.

Bet mainly:

- top pair+
- overpairs
- good draws

Check more weak hands.

### Wet flop

Default: about **1/2 to 2/3 pot** when betting.

Bet:

- strong top pair
- overpairs
- two pair+
- strong draws
- combo draws

Check weak hands much more often.

If Hero completely misses a wet flop, prefer checking. If a flop bluff is called, do not automatically keep bluffing the turn.

## Facing flop bets

Consider hand strength, draw strength, bet size, board texture, position, and number of opponents.

### Versus about 1/3 pot

Continue relatively widely with top pair+, overpairs, strong middle pairs, flush draws, open-ended straight draws, and good gutshots with extra useful cards.

### Versus about 1/2 pot

Continue with top pair+, overpairs, strong draws, and some good middle pairs.

### Versus about 2/3 pot or larger

Continue more selectively: strong top pair, overpair, two pair+, strong straight/flush draws, and combo draws.

## Flop raising

Raise for **value** when worse hands can call. Two pair+ is a common value-raise candidate, especially on wet boards.

A **semi-bluff** is an aggressive action with a draw that may be behind now but can improve if called. Strong combo draws can be raised as semi-bluffs. Ordinary flush and straight draws may simply call in v1.0.

## Pot odds

**Equity** is Hero's estimated chance of ultimately winning the pot.

Required equity:

```text
amount to call / final pot after Hero calls
```

Useful shortcuts:

| Opponent bet | Required equity |
|---|---:|
| 1/3 pot | ~20% |
| 1/2 pot | 25% |
| 2/3 pot | ~29% |
| 3/4 pot | 30% |
| pot | 33% |

## Turn strategy

A **second barrel** is a turn bet after Hero also bet the flop.

Do not automatically second-barrel merely because the flop was bet.

Bet again commonly when:

1. Hero has a strong made hand.
2. Hero improved.
3. Hero picked up strong additional drawing equity.
4. The turn card is particularly favorable to Hero's likely preflop range.

If a flop bluff is called and Hero gains no meaningful new equity or strategic reason, check most turns.

Default turn bet: about **1/2 to 2/3 pot**.

## River value

A **value bet** is made because worse hands are expected to call.

Before betting, ask:

> What worse hand realistically calls me?

- Very strong hands: generally value bet
- Two pair/sets: generally value bet unless the board is extremely dangerous
- Top pair strong kicker: may value bet safe boards against players who can call worse
- Weak one-pair hands: usually check

A **thin value bet** is a value bet with a good but not extremely strong hand. Use thin value more against opponents who call too much.

## River bluffing

A **bluff** is a bet made primarily to make a better hand fold.

Bluff selectively rather than automatically. Better bluff spots usually have little showdown value, a plausible strong range for Hero, and an opponent capable of folding.

Do not river-bluff opponents labeled **Calls too much**.

## Bluff-catching and river fold discipline

A **bluff-catcher** beats bluffs but loses to an opponent's genuine value bets.

Version 1.0 is intentionally conservative:

- Small river bets can be called with more one-pair hands
- Medium bets require stronger one-pair hands or a reason to expect bluffs
- Against roughly 3/4-pot or larger, fold ordinary one-pair bluff-catchers by default
- If Hero value bets and faces a very large river raise, fold one-pair hands by default

The raise is new information. Do not call simply because the hand was strong before the raise.

## Multiway pots

A **multiway pot** has three or more players.

Compared with heads-up pots:

- bluff less
- require stronger hands for large value bets
- be more cautious with one pair
- c-bet complete misses much less frequently

Mantra: **More opponents = stronger hand required.**

## Opponent adjustments

These are exploit rules rather than pure baseline strategy.

### Calls too much

- bluff much less
- value bet more often
- value bet somewhat weaker hands
- use somewhat larger value sizes when likely to be called

### Folds too much

- raise more frequently
- bluff more frequently
- steal blinds more frequently
- c-bet favorable boards more frequently

### Unknown opponent

Use Baseline Mode. Do not invent a read without evidence.

## Fold-discipline list

1. Do not open-limp.
2. Do not casually play KQo/AJo against strong early-position raises.
3. Do not continue weak pairs through strong raise/re-raise action without a clear reason.
4. Do not pay off huge river aggression with ordinary one-pair hands.
5. Do not chase draws when pot odds do not justify the call.
6. Do not repeatedly bluff a player who calls too much.
7. Do not automatically fire the turn because the flop was c-bet.
8. Do not become emotionally attached to a hand because it used to be strong.

## Bet-size defaults

- Unopened preflop raise: **3 BB**
- Isolate one limper: **4 BB in position / 5 BB out of position**
- 3-bet: **~3× in position / ~4× out of position**
- Dry flop: **~1/3 pot**
- Medium flop: **~1/3 to 1/2 pot**
- Wet flop: **~1/2 to 2/3 pot**
- Turn: **~1/2 to 2/3 pot**
- Typical river value: **~1/2 to 2/3 pot**

Overbets are not required in v1.0.

## Baseline vs exploit mode

**Baseline Mode** asks what the normal strong strategy is against an unknown competent opponent.

**Exploit Mode** intentionally changes strategy because an opponent has a predictable weakness.

## Mixed strategies

True solver GTO often mixes actions at specific frequencies. Version 1.0 does not require memorizing those frequencies. It converts decisions into:

- Preferred
- Acceptable
- Minor mistake
- Major mistake

## Grading

### Perfect

Preferred v1.0 action with appropriate size.

### Correct

Strategically acceptable alternative.

### Minor Mistake

Defensible but clearly inferior, including poor sizing.

### Major Mistake

Violates an important v1.0 strategic rule.

The trainer highlights the **first meaningful mistake** and, when present, the **first major mistake** in a hand.

## No results-oriented grading

Winning does not prove a decision was good. Losing does not prove it was bad. Opponent cards are not consulted by the grading engine until after the action grades are already determined.

## Reserved for future versions

- solver-derived exact frequencies
- bluff 3-bets
- bluff 4-bets
- advanced blocker strategy
- complex river bluff selection
- multiple advanced flop sizes
- overbets
- exact check-raise frequencies
- range-vs-range equity engines
- rake adjustments
- deep-stack strategy
- short-stack strategy
- tournaments and ICM
- heads-up poker
- advanced opponent profiling
