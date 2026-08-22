---
name: decision-matrix
description: 'Choose among options with weighted criteria, explicit scores, and a sensitivity check - so a decision survives changing priorities instead of being a gut pick the assistant rationalized. Load when there are multiple viable approaches with different trade-offs, when a choice must be justified to stakeholders, or when the criteria are not all equally important. Triggers on - decide between, which option, trade-offs, weigh the options, compare approaches, evaluate alternatives, pick a vendor, choose a framework.'
---

# Decision Matrix

A gut favorite validated in seconds by a helpful assistant is not a decision. This skill scores
options against weighted criteria and tests whether the winner holds as the weights move.

Derived from the Structured Adjudication Protocol, extended with explicit numeric weighting and a
sensitivity check.

## Build the matrix

1. **Options** - the real candidates (include the do-nothing / status-quo option).
2. **Criteria** - what actually matters, each stated as a direction (higher is better, or lower is
   better).
3. **Weights** - how much each criterion matters, as numbers summing to a fixed total. Not all
   factors are equal; cost may weigh 3x timeline. Set the weights BEFORE scoring, never after.
4. **Score** - each option on each criterion, going criterion-by-criterion (score every option on
   cost, then every option on timeline) to blunt halo and anchoring. Every score carries a one-line
   reason, never just a number.
5. **Weighted total** - score times weight, summed per option.

## Sensitivity check (the step that makes it honest)

Move the top one or two weights up and down by a reasonable margin. If the winner changes, the
decision is NOT robust - say so, and either gather more evidence on the pivotal criterion or make
the call consciously, knowing it is close. A matrix with no sensitivity check just launders a prior
into a number.

## Boundary

Advisory. Pair with `perspective-switch` to generate the criteria from multiple viewpoints, and
`devils-advocate` to attack the winning option before committing.
