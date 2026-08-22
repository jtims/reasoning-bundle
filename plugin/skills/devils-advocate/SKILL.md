---
name: devils-advocate
description: 'Adversarially stress a plan or conclusion before committing - premortem, assumption challenge, and attack-tree - to find the failure you are not looking at while it is still cheap. Load when about to commit real time or money, when the room is unanimous, or when a failure would be expensive or hard to reverse. Triggers on - devils advocate, red team, premortem, what could go wrong, stress test, poke holes, challenge this, everyone agrees, steelman the opposite.'
---

# Devils Advocate

Unanimous agreement is exactly when you are most exposed. This skill manufactures the dissent that
nobody volunteered, aimed at the current plan or conclusion.

Derived from the Frontier Operating Manual S6 (attack your own conclusion) and the research-swarm
majority-refute verification pattern.

## Three passes (run at least the first two)

1. **Premortem.** Assume it is six months later and this failed. Write the post-mortem: what was
   the cause? Work back to the decisions you can still change now.
2. **Assumption challenge.** List the load-bearing assumptions - the ones that, if false, sink the
   plan. Attack the WEAKEST-supported one first, not the easiest: counterexample, boundary case,
   rival explanation, inversion.
3. **Attack tree.** Decompose failure into concrete paths (how does an adversary, or entropy, or a
   bad handoff break this?), then rank the paths by likelihood times damage.

## The honesty rule

An attack that lands changes the conclusion. A caveat bolted onto a conclusion the attack already
killed is denial, not diligence. If the strongest objection survives your rebuttal, the plan is
wrong - revise it, do not annotate it.

## Verdict

State the single strongest surviving objection and whether it is a blocker, a mitigate-then-go, or
an accept-the-risk. Do not end on a pile of worries with no call.

## Boundary

Advisory. Use `decision-matrix` when the fix is choosing a different option; `logic-check` when the
objection is that the argument itself is invalid.
