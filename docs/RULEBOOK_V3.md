# Poker Strategy Rulebook v3.0 — EV-Aware Training

v3 keeps the Advanced / GTO-like v2 strategy model but changes how mistakes are graded.

## Core principle

Frequency and EV are not the same thing.

If a solver-like strategy mixes:

- Raise 70%
- Fold 30%

both actions are normally close to indifferent in expected value. v3 therefore treats both as approximately EV-optimal rather than calling the lower-frequency action a mistake simply because it occurs less often.

## EV-loss grading

v3 estimates how many big blinds an action gives up relative to the best modeled action.

- **Perfect:** estimated EV loss ≤ 0.02 BB
- **Correct:** estimated EV loss ≤ 0.10 BB
- **Minor Mistake:** estimated EV loss ≤ 0.50 BB
- **Major Mistake:** estimated EV loss > 0.50 BB

The hand review shows:

- Estimated EV loss in BB
- Relative EV versus the best modeled action
- The underlying v2 mixed frequency
- The action's modeled frequency
- Relevant preflop range reference when available

## Example: HJ KJo

If the underlying strategy is approximately:

- Raise 70%
- Fold 30%

then both Raise and Fold receive approximately 0.00 BB EV loss in v3. The 70/30 split still matters for constructing the strategy, but it does not imply that folding is a large mistake.

## Example: UTG KJo

In the current rounded baseline, UTG KJo is not in the opening range. Raising it is modeled as a modest leak rather than automatically a major error. v3 therefore assigns a small estimated EV loss and generally grades it as a Minor Mistake.

## Example: UTG AA

AA is a pure or near-pure raise. Folding gives up substantial expected value, so v3 assigns a much larger EV loss and grades the fold as a Major Mistake.

## Important limitation

The current v3 EV numbers are **model estimates**, not EV values exported from a commercial or custom poker solver. Exact node EV depends on:

- Rake structure
- Effective stack depth
- Preflop sizing tree
- Postflop bet sizes allowed
- Exact ranges reaching the node
- Solver abstraction and accuracy

The v3 architecture deliberately separates `strategy frequency` from `EV-loss grading` so a future solver-data import can replace the estimator with real node EVs without changing the trainer UI or the grading pipeline.
