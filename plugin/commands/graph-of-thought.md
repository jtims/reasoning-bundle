---
description: Launch the graph-of-thought explore-score-merge reasoning tournament with a confirmed tier plan
---

# /reasoning-bundle:graph-of-thought

Run a multi-approach reasoning tournament on a hard problem: diverge into N distinct approaches,
adversarially score them, merge the winner grafting the best of the runners-up, then audit.

## Steps

1. No external plugin is required - the workflow spawns this plugin's own bundled `rb-worker` /
   `rb-judge` / `rb-auditor` agents. (Its Phase-0 preflight still probes each agentType and aborts
   before spend if a tier does not route.)
2. Gather inputs: the problem statement, an absolute run-unique `out_dir`, and optionally `angles`,
   `criteria` / `weights`, and `rounds`. Default angles: first-principles, prior-art-analogy,
   constraint-relaxation, inversion, simplest-viable.
3. Present the tier plan and ask the ONE open choice - the audit tier - before launching, since the
   workflow cannot ask mid-run:
   - diverge = sonnet/high · attack + score + merge = opus/xhigh
   - audit = **fable/xhigh** (default) OR **opus/max** (economy override)
   Use the structured question UI. Record the choice as `audit_model` / `audit_effort`.
4. Launch the workflow `graph-of-thought-run` with args `{problem, out_dir, slug, angles?, criteria?,
   weights?, rounds?, audit_model, audit_effort}`. It runs headless.
5. On completion, surface: the winner, the exec_summary, which grafted ideas came from which
   branch, open_questions, and any FIX/REJECT audit findings. Place the deliverable in the vault
   only if the user asks.

## Notes

- Flat one-level fan-out (workflow -> agents; agents never spawn) - no nesting, no depth issues.
- Pins are family aliases; the version resolves to the account default. Phase-0 preflight aborts
  the run if any tier does not route to its family.
- This spends real credits across ~12+ agents - it is for genuinely hard, wide-solution-space
  problems, not routine questions.
