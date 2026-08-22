---
name: logic-check
description: 'Make the logic of an argument explicit and checkable - lay out premises, inferences, and the conclusion, then test validity and soundness separately - WITHOUT claiming a machine proof. Load when a conclusion turns on a chain of reasoning, when correctness matters more than plausibility, or when someone claims it follows. Triggers on - is this valid, does this follow, logic check, prove it, sound argument, premises, fallacy, non sequitur, therefore.'
---

# Logic Check

Not "that sounds right" - shown, step by step, where the reasoning holds and where it does not.
This skill structures an argument so a human, or a real checker, can confirm it.

Derived from the Frontier Operating Manual verification discipline (re-derivation by an independent
path; a conclusion is capped by its weakest premise).

## HONEST SCOPE - read this first

This skill does NOT prove anything. It is a language model structuring an argument; its own say-so
that something is "proven" is not proof - that is a green check on the wrong instrument. Its output
is a laid-out argument whose validity a PERSON or a REAL checker (a theorem prover, a type checker,
an executed test) can then confirm. Never report "proven" or "disproven" on this skill alone.

## The procedure

1. **Extract premises.** List every premise the conclusion rests on, each as a standalone
   statement, each labeled by how well it is supported (VERIFIED / REPORTED / ASSUMED / UNKNOWN).
2. **Extract the inference steps.** Write the chain from premises to conclusion, one step at a time,
   naming the rule at each step (deduction, generalization, analogy - and analogy is not deduction).
3. **Test VALIDITY.** Does the conclusion follow from the premises IF the premises are true? Point
   at any step that does not. Common breaks: affirming the consequent, undistributed middle,
   equivocation on a term, a smuggled hidden premise.
4. **Test SOUNDNESS.** Are the premises actually true? The conclusion is only as strong as its
   weakest premise - one ASSUMED premise caps the whole argument at ASSUMED, however valid the form.
5. **Route to a real checker where one exists.** Arithmetic - compute it. Code - run it. Formal
   claim - a prover. Do not substitute fluent prose for the instrument.

## Boundary

Advisory and honest-by-construction. Feeds `devils-advocate` (attack the weakest premise) and is the
terminal check under `staged-reasoning` before a conclusion ships.
