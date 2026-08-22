---
name: graph-of-thought
description: 'Explore-score-merge reasoning tournament for hard problems with a wide solution space - generate several distinct approaches, adversarially score them, then synthesize the winner grafting the best of the runners-up. Load when a one-shot answer is risky, when a decision is high-stakes and the approach is not obvious, or when you want more than one path explored before committing. Triggers on - graph of thought, explore approaches, tournament, multiple approaches, branch and merge, best of several, wide solution space, more than one way.'
---

# Graph of Thought

Linear reasoning picks one path and hopes. This runs several genuinely distinct approaches, scores
them against each other, and merges the strongest into something better than any single branch. It
is the heavyweight, multi-agent form - for the in-context single-pass versions, the other
reasoning-bundle skills (`staged-reasoning`, `devils-advocate`, `decision-matrix`) are enough.

## When to reach for it

- The solution space is wide and the best approach is not obvious.
- The decision is high-stakes or hard to reverse, and one-shot reasoning is risky.
- You want independent paths explored and cross-checked before committing.

If one approach is clearly right, do not run a tournament - use `staged-reasoning` and move on.

## How it runs

It executes as a workflow via `/reasoning-bundle:graph-of-thought`. Phases: diverge into N
approaches (one per seeded angle) -> attack each and score them on weighted criteria -> merge the
winner, grafting the best of the runners-up -> audit the result. Every stage is model+effort
pinned, and diverge/attack/score/merge each compose the matching bundle skill (`staged-reasoning`,
`devils-advocate`, `decision-matrix` + `perspective-switch`, `logic-check`).

It is a flat one-level fan-out (workflow -> agents; agents never spawn), so nesting and spawn-depth
limits are never hit. Expansion is a bounded re-diverge round (default 1 pass, max 2), never
recursive spawning.

## Self-contained roster

The workflow spawns this plugin's own bundled `rb-worker`, `rb-judge`, and `rb-auditor` agents (in
`agents/`) - no external plugin is required. The Phase-0 preflight probes each agentType and aborts
before any spend if a tier does not route.

## Tiering (confirmed with you at launch)

diverge = sonnet/high · attack + score + merge = opus/xhigh · audit = fable/xhigh (or opus/max).
Pins are family aliases; the version resolves to the account default. The launch command presents
this plan and asks the one open choice - the audit model - before spawning, because a running
workflow cannot ask.

## Boundary

The heavyweight, multi-agent member of the bundle. It composes the other skills as its phase
implementations - `staged-reasoning` (diverge), `devils-advocate` (attack), `decision-matrix` +
`perspective-switch` (score), and `logic-check` (merge) - and its spawn mechanics (tiering, preflight,
flat one-level fan-out) follow the swarm tiering doctrine (design lineage; the roster itself ships with this plugin). Reach for the in-context skills
directly when one approach is clearly right; reach for this only when the solution space is wide enough
to justify the tournament's cost.
