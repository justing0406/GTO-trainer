# Poker Strategy Rulebook v2.0
## Advanced / GTO-like training baseline

Version 2.0 sits on top of the Foundation v1.0 rules. It is designed to teach the structure of solver-era poker without falsely claiming that one static chart is exact GTO in every cash game.

Exact equilibrium strategy changes with rake, stack depth, opening size, allowed bet sizes, and opponent ranges. v2 therefore uses rounded, learnable mixed frequencies.

## Game assumptions

- 6-max No-Limit Texas Hold'em cash
- 100 BB effective stacks
- No ante
- Rake-aware low/mid-stakes baseline
- Hidden cards never affect grading

## Position-specific open sizes

- UTG: 2 BB
- HJ: 2 BB
- CO: about 2.3 BB
- BTN: 2.5 BB
- SB: 3 BB when raising

The solver-era pattern is smaller opens early and larger opens late. Early positions face more players who can 3-bet, making smaller opens attractive.

## Mixed strategies

A hand can legitimately use several actions. For example:

- Raise 70%
- Call 30%

v2 grades the most frequent action as **Perfect**, a meaningful mixed action as **Correct**, a low-frequency action as a **Minor Mistake**, and an essentially unused action as a **Major Mistake**.

The displayed frequencies are rounded training approximations, not copied solver outputs.

## Advanced preflop principles

### Calls are real

Unlike Foundation v1.0, v2 allows cold-calling in position. BTN can call a meaningful range versus an early-position open, especially pocket pairs and suited hands that realize equity well after the flop.

### Small Blind versus Button

SB is overwhelmingly 3-bet-or-fold against a Button open because:

1. SB will be out of position postflop.
2. Calling allows BB to enter or squeeze.
3. A flatting range can become capped.

### Big Blind defense

BB defends widest against BTN because 1 BB is already invested and BTN opens widely. Strong hands can sometimes call rather than always 3-bet, preventing the calling range from becoming obviously weak.

### Blocker bluffs

Suited wheel Aces such as A5s-A2s appear as 3-bet and 4-bet bluffs. Holding an Ace makes AA and AK less likely while suitedness preserves equity when called.

## Range advantage

**Range advantage** means one player's plausible hands are stronger on average than the opponent's range.

High, dry boards often favor the preflop raiser. Low, connected boards frequently help the caller.

Example:

- A-7-2 rainbow: preflop raiser can often bet small at high frequency.
- 8-7-6 two-tone: caller connects strongly; raiser checks much more.

## Nut advantage

**Nut advantage** means one player can hold more of the strongest possible hands.

Nut advantage matters heavily for large bets and overbets. A player can have average range advantage without enough nut advantage to justify a huge bet.

## Bet sizes

v2 introduces a more realistic sizing tree:

- 20-33% pot: wide range bets on favorable boards
- 50-75% pot: more selective value/bluff ranges
- 100%+ pot: polarized ranges with strong nut advantage

Sizing is chosen from the range-versus-range situation, not simply because Hero's individual hand is strong.

## Check-raising

A balanced check-raise range contains:

- Strong value hands
- Powerful draws
- Selected bluffs/backdoor hands

Medium showdown hands usually prefer calling rather than turning themselves into large-pot hands.

## Turn strategy

v2 considers how the turn changes both players' ranges.

Bet again more often when:

- Hero improves
- Hero gains equity
- The turn shifts range advantage toward Hero
- The turn increases Hero's nut advantage

After checking back the flop, Hero may use a **delayed c-bet** on favorable turns.

Large turn bets and overbets can appear when ranges become polarized.

## River strategy

River play is no longer governed by a blanket “one pair facing aggression = fold” rule.

Instead consider:

- Pot odds
- Opponent value combinations
- Opponent bluff combinations
- Blockers
- Unblockers
- Bet size
- Relative position within your own range

### Minimum defense frequency

MDF is a benchmark:

`MDF = 1 / (1 + bet fraction of pot)`

Examples:

- Half-pot bet: approximately 67%
- Pot-sized bet: 50%

MDF does **not** mean blindly calling the top X% of hands. Blockers and range composition still matter.

### Balanced river bluff fraction

For a polarized river bet:

`Bluff fraction among bets = bet / (pot + 2 × bet)`

Examples:

- Half-pot bet: 25% bluffs
- Pot-sized bet: 33% bluffs
- 2x pot overbet: 40% bluffs

## Stack-to-pot ratio

**SPR = effective stack remaining / pot size**

Lower SPR means fewer large bets remain. Strong one-pair hands become more comfortable playing for stacks in low-SPR 3-bet pots than in high-SPR single-raised pots.

## Multiway pots

Multiway equilibrium differs sharply from heads-up play:

- Bet less often
- Bluff much less
- Strong hands may check more frequently
- No single defender is responsible for protecting the entire field
- Top-of-range hands often squeeze more aggressively preflop when a raise already has callers

## v2 objective

Mastery means understanding *why* frequencies and sizes change rather than memorizing one absolute action for every holding.

The trainer should teach:

1. Position-specific preflop morphology
2. Mixed actions
3. Range advantage
4. Nut advantage
5. Polarization
6. Bet-size selection
7. Check-raise construction
8. Turn range shifts
9. River blockers and bluff-catching
10. MDF and river bluff/value ratios
11. SPR
12. Multiway adjustments
