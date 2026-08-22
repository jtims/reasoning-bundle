---
description: Reconcile logged calibration labels against outcomes and report hit-rate by label
---

# /reasoning-bundle:calibration-review

Close the calibration loop: read the labels captured by the `calibration-track` Stop hook, help
the user mark which held up, then report accuracy by label. This is the reconcile half of the
capture+reconcile design; the Stop hook is the capture half. Everything is local to
`~/.claude/reasoning-bundle/` - nothing leaves the machine.

## Steps

1. Read the ledger at `${RB_DATA_DIR:-~/.claude/reasoning-bundle}/calibration-log.jsonl`. If it is
   missing or empty, tell the user the hook is not enabled or has captured nothing yet, and how to
   enable it (`touch ~/.claude/reasoning-bundle/calibration.enabled`). Then stop.
2. Parse each JSONL record `{ts, counts, claims[], reconciled}` and collect every record where
   `reconciled` is false.
3. For each unreconciled claim line, show it with its label (VERIFIED / REPORTED / INFERRED /
   ASSUMED / UNKNOWN) and ask the user to mark the outcome: HELD (turned out true), FAILED (turned
   out wrong), or STILL-UNKNOWN. Batch these into the structured question UI, 3-4 at a time. Never
   guess an outcome.
4. Write outcomes back: append one `{ts, claim, label, outcome}` record per decision to a sibling
   `calibration-outcomes.jsonl`, and set the source record's `reconciled` to true. Do not delete
   the original ledger lines.
5. Report **hit-rate by label** across all reconciled records - e.g. "REPORTED held 8/10; INFERRED
   5/6; ASSUMED 3/6" - and flag any label whose accuracy diverges from its intended confidence: an
   ASSUMED that always holds is under-claimed; a VERIFIED that ever FAILED is a process defect (the
   verification path was not actually independent), not a calibration one.

## Notes

- Calibration accuracy is about whether the LABELS matched OUTCOMES - not whether the outcomes
  themselves were good.
- Keep the ledger append-only; reconciliation adds outcomes, it never rewrites history.
