---
name: convergence-detector
description: 'Detect and break reasoning loops - when the same approach, tool call, or conclusion repeats without progress. Load when work is going in circles, stuck after repeated attempts, re-running the same failing command, or re-reading the same source expecting a different result. Triggers on - going in circles, stuck, same error again, keep trying, not working, loop, iteration, spinning, no progress, tried that already.'
---

# Convergence Detector

Reasoning loops burn budget and produce nothing. This skill fires when work stops progressing
and forces a reframe before the next attempt. It is the general case of the Frontier Operating
Manual hard stop "two failed fixes on one defect -> stop, present options."

## Loop signals (any one is enough)

- The same tool call (same target, same args) repeated with no new information.
- A fix attempted, failed, and re-attempted in a near-identical form.
- The same conclusion restated in different words without new evidence.
- Re-reading the same source expecting a different result.
- Three or more turns with no change to the artifact or the plan.

## The reframe protocol (run BEFORE the next attempt)

1. **Name the loop.** State plainly what has repeated, and how many times.
2. **List what each attempt ruled OUT.** Not what failed - what the failure eliminated. A loop
   that has ruled nothing out is a signal the diagnosis is wrong, not that the fix needs force.
3. **Change strategy OR altitude.** Either a different approach at the same level, or step up a
   level and question the premise, the tool, or the whole framing - never the same move harder.
4. **Cap and escalate.** After two failed fixes on one defect, STOP: present findings, what each
   attempt ruled out, and 2-3 options. Do not attempt a third unprompted (FOM hard stop).

## Boundary

This skill is advisory - it changes how you reason, it does not block a tool. The deterministic
backstop is this bundle's optional `convergence-guard` PreToolUse hook, which routes an
N-times-repeated identical tool call to a human "ask". Enable it per machine:

```
mkdir -p ~/.claude/reasoning-bundle && touch ~/.claude/reasoning-bundle/convergence.enabled
```

Repeat threshold is `RB_CONVERGENCE_THRESHOLD` (default 4).

## Why it exists

Simple attempt-counters miss the tail of a loop; a spinning agent will iterate many times on a
wrong approach before anything stops it. The cheap fix is to NOTICE the loop and re-frame, not to
try harder. Cross-ref: FOM S6 self-attack (attack the weakest premise, not the symptom).
