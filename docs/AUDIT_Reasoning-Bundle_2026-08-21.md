---
title: Reasoning Bundle — Adversarial Code & Audit Review
project: reasoning-bundle
type: code-review
version: v1.0
date: 2026-08-21
status: fixes applied (owner-adjudicated); L4 + pre-publish verifications queued
auditor: jtims (Claude Code, Opus driver seat)
target: the plugin staging tree (v0.2.0, uncommitted)
---

# Reasoning Bundle — Adversarial Code & Audit Review

## 1. Verdict (answer-first)

The plugin is **feature-complete and structurally sound — it is not broken — but it is not
publish-ready.** There are **0 critical findings and 0 hard blockers of function.** What stands is a
cluster of **15 confirmed pre-publish defects (6 medium, 9 low) + 3 nits**, every one fixable before
the human-gated publish. Ranked by impact:

1. A **slash-command / workflow name collision** on the flagship feature (`/reasoning-bundle:graph-of-thought`).
2. The **calibration hook's portability + over-count** (hidden `.turn-start` dependency; BSD-only `date -r`).
3. A **stale shipped `plugin/README.md`** front door ("Nothing is wired yet").
4. An **undeclared `agent-swarm` dependency** in the manifest.

The largest *claim-level* correction is a **false alarm the audit killed**: the plugin's hooks,
commands, and workflow are **NOT** dead on install — auto-discovery is real (see §4).

## 2. Scope, method, and verification instruments

**Scope (owner-confirmed):** the whole `Reasoning Bundle/` staging folder (`plugin/` + README/WORKLOG/
RESUME/VERSION/.zip/references). `agent-swarm` treated as a dependency interface only; the two deferred
efforts (harness, swarm-matrix adoption) excluded. Static + adversarial only — the target
`graph-of-thought.js` was **not** live-run.

**Instruments (named, per operating discipline):**
- **First-hand reads** of every file in the bundle (manifest, both hook scripts, the workflow JS, all 7
  skills, both commands, both READMEs, WORKLOG, RESUME briefs, VERSION, the competitor `llms.txt`).
- **Platform mechanics settled by three independent paths** — official Claude Code docs
  (`code.claude.com`), three working sibling plugins in the same repo (`agent-swarm`,
  an unpublished owner plugin), and a discarded single-source outlier (a `claude-code-guide` subagent
  whose "declaration required" claim was refuted by both other paths). [VERIFIED]
- **A 49-agent adversarial workflow** (`wf_07d94878-bc8`): 7 dimension finders (sonnet/high) →
  opus/xhigh verify pass that tried to **refute** every pooled finding. Result: 44 pooled → 30
  CONFIRMED, 12 REFUTED, 2 nits, 0 errors.
- **Extraction fidelity cross-check:** the compact findings table was cross-checked field-for-field
  against 12 findings read first-hand — all matched.

**Caveat:** local execution of the hook scripts was **denied** this session, so hook findings rest on
static code analysis (labeled below). The plugin's own sandbox dry-run stands as REPORTED, not
re-derived by execution. A live `graph-of-thought.js` run + a local install test remain the two
highest-value validations still owed (both already on the plugin's own pre-publish checklist).

## 3. Confirmed findings

Severities are shown as `original → corrected`, where the adversarial verifier recalibrated. The
consistent downgrade rationale: this is uncommitted pre-release staging behind a human-gated publish,
so most defects are caught-before-release and several are single-line fixes.

### MEDIUM

**M1 — Command / workflow name collision** `[CONFIRMED]`
`plugin/commands/graph-of-thought.md` + `plugin/workflows/graph-of-thought.js:16` · sev med→med (one verifier held high)
- **Claim:** the workflow's `meta.name: 'graph-of-thought'` makes it invocable as
  `/reasoning-bundle:graph-of-thought` (plugin convention: `/<plugin>:<meta.name>`), and the command
  file independently claims the identical slash path. Both auto-discover; both register at one string.
- **Failure scenario:** a user invokes `/reasoning-bundle:graph-of-thought` expecting the command's
  guided flow (confirm `agent-swarm`, gather args, get the one audit-tier confirmation *before* the
  headless run). If the workflow wins that path, or the two shadow by load order, the command's
  mandatory tier-confirmation gate — the sole documented human checkpoint, needed because "the
  workflow cannot ask mid-run" — is bypassed on a ~12+-agent credit-spending run.
- **Fix (verbatim):** Rename the workflow's `meta.name` (e.g. `got-run` or `graph-of-thought-workflow`)
  so only the command occupies the user-facing `/reasoning-bundle:graph-of-thought` slash path,
  matching the pattern agent-swarm already uses. Re-verify with an actual local install (the
  checklist's unticked "Local install test" item) — this is exactly the class of bug a real install
  test, not static reading, would surface.
- **Note:** the exact dispatch winner needs a live install to pin down, but a collision exists in
  *every* resolution branch, so the defect holds regardless. Sibling `agent-swarm` deliberately keeps
  command names (`swarm-init`, `swarm-plan`) distinct from its `research-swarm` workflow — the
  precedent to follow.

**M2 — Stale shipped `plugin/README.md` front door** `[CONFIRMED, VERIFIED first-hand]`
`plugin/README.md:12` · sev high→med
- **Claim:** the in-package README states "Pre-release (0.1.0)… Nothing is wired yet", lists only 5 of
  ~10 invocables, names a `calibration-tracking` hook that does not exist under that name, and omits
  `perspective-switch`, `logic-check`, `graph-of-thought`, both commands, and the convergence hook.
- **Failure scenario:** a teammate installs the plugin, opens its only in-package doc, and concludes it
  is an empty scaffold — the opposite of the shipped reality.
- **Fix (verbatim):** Rewrite `plugin/README.md`'s table to enumerate all 7 skills, both commands, and
  both hooks by their real names (`calibration-track` / `convergence-guard`), and replace the "0.1.0
  pre-release, nothing wired" banner with the actual 0.2.0 feature-complete status (mirroring, not
  duplicating, the staging README's mapping table).

**M3 — Calibration hook over-counts the whole transcript when `.turn-start` is absent** `[CONFIRMED; static + REPORTED dry-run]`
`plugin/scripts/calibration-track.sh:14` · sev high→med
- **Claim:** the hook silently depends on `$HOME/.claude/.turn-start` — a file this plugin does not
  create, document, or ship a fallback for (it is written by the author's *separate*, personal
  telemetry harness). Absent, `START=0` → `TS=1970-01-01` → the jq filter `.timestamp >= $ts` admits
  the entire transcript every Stop.
- **Failure scenario:** any teammate who enables the hook without the unrelated turn-stamp harness gets
  cumulative re-counting — turn 50 re-counts turns 1–49's labels as new — so
  `/reasoning-bundle:calibration-review`'s hit-rate is wrong from the second turn onward and worsens.
- **Fix (verbatim):** Have the hook maintain its own per-turn boundary state under `$RB_DIR` (e.g.
  write `$RB_DIR/last-stop-ts` after each successful append, read it back next run, default to 'now'
  rather than epoch-0 when absent) instead of reading a foreign file outside the plugin's own data
  directory.

**M4 — `date -u -r` is BSD-only; the calibration filter is dead-on-arrival on Linux** `[CONFIRMED; INFERRED from date semantics]`
`plugin/scripts/calibration-track.sh:15` · sev high→med
- **Claim:** `date -u -r "$START"` is a macOS/BSD epoch→string conversion. On GNU coreutils `-r` means
  a reference *file*, so `date -r <epoch-number>` looks for a file named by that number, fails, and
  `TS` falls back to 1970 — **unconditionally on Linux, even when `.turn-start` exists and is valid.**
- **Failure scenario:** a Linux teammate with the turn-stamp companion correctly installed still gets
  the M3 whole-transcript over-count on every turn; the plugin's cross-platform distribution claim is
  false for this hook.
- **Fix (verbatim):** Use a portable epoch-to-ISO8601 conversion, e.g.
  `date -u -d @"$START" +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -r "$START" +%Y-%m-%dT%H:%M:%S 2>/dev/null`
  (try GNU form first, fall back to BSD form), or do the conversion in the jq step (jq's
  `todate`/`fromdateiso8601` are portable) instead of shelling out to `date` at all.

**M5 — Preflight probes bare `model`, never the `agentType` the real work depends on** `[CONFIRMED, VERIFIED first-hand]`
`plugin/workflows/graph-of-thought.js:76` · sev high→med
- **Claim:** Phase-0 preflight calls `agent()` with `{model, effort}` and **no `agentType`**, yet the
  abort note (line 85) tells the operator a failure proves the `swarm-worker/judge/auditor` agentTypes
  are installed. The probe only proves family-alias model routing; the first `agentType` use is at line
  103, after "Preflight OK". This is the "green check on the wrong instrument" anti-pattern — the exact
  failure class this bundle was built to prevent.
- **Failure scenario:** with `agent-swarm` absent but base models routing fine, preflight passes and
  the run proceeds to spend before failing later (whether at diverge or score depends on `agent()`'s
  unknown-agentType semantics, which is runtime behavior not determinable from the file — this is the
  one finding that would benefit from the deferred live run).
- **Fix (verbatim):** Run the four preflight pins with the same `agentType` used downstream
  (`agent(PIN_PROMPT, {..., agentType: T[p.tier].agentType, model: T[p.tier].model, effort: 'low'})`),
  adding an `agentType` field to the `T` map (helper has none downstream, but worker/judge/auditor do)
  so the probe actually reproduces the real call shape before any spend.

**M6 — `agent-swarm` dependency undeclared in `plugin.json`** `[CONFIRMED, VERIFIED — dependencies field supported]`
`plugin/.claude-plugin/plugin.json` · sev high→med / low (see note)
- **Claim:** the manifest declares no `dependencies` array, though `graph-of-thought` hard-requires the
  sibling `agent-swarm` plugin, the field is supported (semver), and `agent-swarm` is a resolvable
  target already in this repo. The marketplace blurb also omits the requirement.
- **Failure scenario:** a teammate installs reasoning-bundle alone (no pre-install signal), runs the
  workflow, and only discovers the missing companion at preflight (which, per M5, may pass anyway) or
  at the first real spawn.
- **Fix (verbatim):** Add `"dependencies": [{"name": "agent-swarm", "version": ">=1.0.0"}]` (or the
  plugin system's exact supported shape) to `plugin.json`, and mention the requirement in the
  marketplace-snippet description in the top README.
- **Note:** severity split low↔medium across verifiers; three textual guards already name `agent-swarm`
  (command step 1, header comment, ABORTED_PREFLIGHT note), and the blast radius is a clean abort, not
  a wrong answer. Treated as medium here because the installer gets *no manifest-level signal*.

### LOW

**L1 — Version drift** `[CONFIRMED, VERIFIED first-hand]` · `plugin.json:3` · high→low
`plugin.json` version `0.1.0` contradicts `VERSION`, the top README, and the marketplace snippet
(`0.2.0`); `graph-of-thought.js:13` says "v0.1". The manifest version is what a marketplace reports.
**Fix (verbatim):** Bump `plugin/.claude-plugin/plugin.json` line 3 to `0.2.0` (and `plugin/README.md`'s
"Pre-release (0.1.0)" banner + `workflows/graph-of-thought.js:13`'s "v0.1" comment) before the publish
step, or add a version-consistency check to the pre-publish checklist so this can't silently ship.
Recommend a single-source-of-version convention (`plugin.json` authoritative) to prevent recurrence.

**L2 — `reasoning-bundle.zip` build artifact is committable** `[CONFIRMED, VERIFIED via git state]` · staging root · med→low
Untracked 25 KB binary not covered by the repo `.gitignore` (`dist/*.zip` only); publish step 1 would
commit it; no consumer (marketplace installs from the source dir) and no regeneration wiring → stale
drift. **Fix (verbatim):** Add a `.gitignore` rule scoped to the staging folder (e.g.
`<plugin-folder>/*.zip`) or delete the zip outright before the PR — the publish steps never
read from it.

**L3 — Competitor reference file is committable** `[CONFIRMED, VERIFIED via git state]` · `references/…txt` · med→low
`references/reasoning-services-llms_2026-08-20.txt` (the vendor's public `llms.txt`) is marked
"(NOT shipped)" only by a README comment, not a repo control. **Fix (verbatim):** Add
`<plugin-folder>/references/` to `.gitignore` (mirroring the existing
`<sibling-plugin>/_archive/` pattern) so the exclusion is a repo-level control, not a
README comment. (Content is the vendor's own public manifest — not a secret; low severity.)

**L4 — Skill Evolution Protocol not run** `[CONFIRMED]` · governance · high→low
The 7 skills are adapted from `frontier-operating-manual` and `agent-swarm-doctrine`, which per the
owner's own Change Control triggers a `skill-dependencies` SSOT update — the plugin's own pre-publish
checklist item is unchecked. **Fix (verbatim):** Before publish, add the 7 skills to
`skill-dependencies` with their provenance (derived from frontier-operating-manual /
agent-swarm-doctrine) and cascade notes, per the mandatory Skill Evolution Protocol, and check off the
corresponding pre-publish checklist item.

**L5 — Competitive claim: Hindsight row overstated** `[CONFIRMED]` · `README.md:52` · high→low
The mapping table marks Hindsight "shipped ✓", but of its 4 advertised features (prediction-vs-outcome,
bias detection, calibrated lessons, pattern-transfer) only the calibration hit-rate is shipped.
**Fix (verbatim):** Mark Hindsight PARTIAL in the table (e.g. "partial — prediction-vs-outcome hit-rate
only; no bias detection, lesson extraction, or pattern-transfer check") instead of an unqualified
"shipped ✓".

**L6 — `perspective-switch` promises parallel/blind analysis a single-context skill can't deliver** `[CONFIRMED]` · `skills/perspective-switch/SKILL.md:15` · med→low
The skill instructs "Run the perspectives IN PARALLEL (each blind to the others)", but in a single
response the model writes them sequentially, each conditioned on the prior — not truly isolated.
**Fix (verbatim):** Either implement perspective-switch as a workflow that spawns one subagent per
perspective (as graph-of-thought.js already demonstrates), or soften the skill's own instruction and
the mapping-table claim to acknowledge it is a single-context approximation, not true isolated-parallel
evaluation.

**L7 — `RB_CONVERGENCE_THRESHOLD=0` fires on every tool call** `[CONFIRMED; static]` · `scripts/convergence-guard.sh:10` · med→low
The numeric validator rejects empty/non-numeric but not `0`; with `THRESHOLD=0`, `N=1 >= 0` on the
first call → "ask" fires every call for the rest of the session. **Fix (verbatim):** Reject
THRESHOLD<2 in the validation (e.g. `case "$THRESHOLD" in ''|*[!0-9]*) THRESHOLD=4 ;; esac;
[ "$THRESHOLD" -ge 2 ] || THRESHOLD=4`), or treat 0 explicitly as "hook disabled" and exit 0 before any
state tracking. (Also: the reason text "repeated 1 times in a row" is misleading.)

**L8 — Empty `refine_hint` silently cancels a requested round 2** `[CONFIRMED, VERIFIED first-hand]` · `workflows/graph-of-thought.js:123` · med→low
`SCORE_SCHEMA` requires `refine_hint` as a string with no `minLength`; the round-2 trigger uses a bare
truthiness check, so a schema-valid `''` collapses the seed to `[]` and Merge proceeds on branches the
scorer flagged inadequate — with no distinguishing signal in the return value. **Fix (verbatim):**
Change the schema to require `minLength:1` on `refine_hint` when `adequate` is false (or a JSON-schema
conditional), and change the trigger to `!score.adequate && (score.refine_hint || '').trim().length > 0`,
logging explicitly when `adequate===false` but no usable hint was supplied.

**L9 — `AUDIT_SCHEMA` allows `verdict:'FIX'` with empty `required_fixes`** `[CONFIRMED, VERIFIED first-hand]` · `workflows/graph-of-thought.js:94` · low→low
No `minItems` tied to `verdict==='FIX'`, so a FIX with `required_fixes:[]` sends the repair judge an
empty fix list (the prompt passes only `required_fixes`, never `findings`), and `repairApplied` is set
true regardless of substance. The round-2 re-audit backstops it. **Fix (verbatim):** Add a schema-level
conditional (if verdict is 'FIX', require `required_fixes` `minItems:1`) or a code-level guard: if
`audit.verdict==='FIX' && !audit.required_fixes.length`, fall back to using `audit.findings` as the fix
list, or treat it as an auditor contract violation and abort with a distinct status.

### NITS

- **N1** — `graph-of-thought/SKILL.md:44` is the only one of the 7 skills missing a `## Boundary`
  section. **Fix:** add one stating it composes the other five skills as phase implementations and that
  agent-swarm-doctrine governs its spawn mechanics.
- **N2** — `plugin.json:4` description advertises "calibration tracking" without the "(opt-in)" qualifier
  `plugin/README.md` already uses. **Fix:** append "(opt-in)" in both the manifest description and the
  marketplace snippet.
- **N3 (no-defect)** — `calibration-review.md`'s described ledger shape `{ts, counts, claims[], reconciled}`
  **matches** the Stop hook's actual jq output field-for-field (verified — no schema drift). Optional
  polish: a one-line note distinguishing the source-ledger schema from the `{ts, claim, label, outcome}`
  outcomes-file schema, so a reader doesn't mistake the intentional difference for an inconsistency.

## 4. Refuted & downgraded findings (the audit correcting itself)

The adversarial verify pass rejected 12 of 44 pooled findings. The load-bearing ones:

- **The kill-shot, killed** `[VERIFIED]`: "hooks / commands / workflow are dead on install because
  `plugin.json` declares none of them." **False.** Auto-discovery from default directories is real
  (official docs + all three working sibling plugins ship pure-metadata manifests). Omitting the fields
  is *correct* — declaring them would *replace* the default scan. A `claude-code-guide` subagent
  asserted the opposite; it was a single-source outlier and was discarded.
- **Lead-auditor overreach #1 (P6), partially refuted:** the "8/8 equal-or-better overstates on Formal
  Logic and Structured Reflection" claim was rejected — the top README *prominently* discloses that
  `logic-check` is not a solver ("explicitly never claims a machine proof"), and the Structured
  Reflection mapping legitimately splits across two table columns. Only the **Hindsight** overstatement
  (L5) and the **perspective-switch** parallelism claim (L6) survived.
- **Lead-auditor overreach #2 (P11), downgraded to non-defect:** skill trigger overlap with the
  installed `frontier-operating-manual` / `agent-swarm-doctrine` is (a) semantic-routing, not
  exact-match; (b) additive-superset by design (the skills *derive from* those); and (c)
  author-machine-only — teammates who install the plugin do not carry those as separate skills. Real
  overlap, but not a plugin defect. (Retained as a deployment note in §5.)
- **Finder speculation killed (5):** shasum-fallback signature collision (spaces are stripped → sigs
  distinct); `AUDIT_RESERVE` not checked before Merge/Audit (`agent()` returns falsy on budget overrun,
  it does not throw — existing abort paths handle it); "fable is just a codename" (it is a real model,
  `claude-fable-5`); hardcoded worker/judge efforts "don't match the roster" (passed effort overrides
  frontmatter — documented behavior); hooks "does no harm" contradiction (always-register +
  in-script gating is the *only* way to build an opt-in hook; the scripts exit before altering
  anything).

## 5. Overlap with existing processes (owner-named axis)

- **Skill overlap (deployment note, not a defect):** on the owner's own machine and any teammate who
  also runs the vault FOM/agent-swarm-doctrine skills, the 7 plugin skills overlap the trigger space.
  This is harmless (semantic routing + compositional-by-design) and does not affect the plugin's
  intended distribution audience. No code change required; a one-line note in the top README that the
  bundle *derives from* those disciplines (already present) is sufficient.
- **`graph-of-thought.js` ≈ `research-swarm.js`:** the workflow is structurally a sibling of the live
  agent-swarm workflow. Maintenance risk: the two can drift (tier matrix, preflight, repair logic). The
  RESUME briefs already track the swarm-matrix adoption as a separate coordinated change set — keep the
  two workflows' shared logic in sync as part of that effort.
- **Cross-plugin coupling:** `graph-of-thought` hard-depends on `agent-swarm`, whose *published* copy
  the RESUME notes flag as already stale vs. the live tree. Declaring the dependency (M6) makes the
  coupling explicit; reconciling the agent-swarm published copy is prerequisite to a clean install.
- **Governance:** the Skill Evolution Protocol / `skill-dependencies` update (L4) is the mechanism that
  would *record* all of the above; it is unchecked.

## 6. Competitive-claim assessment ("8/8 covered, equal-or-better, zero data egress")

Mostly defensible, with two honest exceptions:
- **Zero data egress:** accurate — the reasoning stays in the local model; nothing is sent to a third
  party. This is the strongest and truest part of the pitch.
- **Full / stronger coverage (6 of 8):** Chain of Thought, Context Switcher (with the L6 caveat),
  Decision Matrix, Devil's Advocate, Graph of Thought, and Formal Logic (shipped *honestly* as a
  non-solver — a deliberate, disclosed downgrade, not a gap). The Formal Logic honesty is a *strength*,
  not an overstatement (my initial read was wrong; see §4).
- **Partial (2 of 8):** **Hindsight** (L5 — only calibration hit-rate, not bias-detection /
  pattern-transfer) and **Structured Reflection** (the persistent-session / multiple-styles UX
  affordances are not replicated; the reasoning-relevant convergence-detection *is*). Recommend the
  mapping table mark these PARTIAL rather than "shipped ✓".

## 7. Open decisions for the owner

1. **M1 rename direction** — rename the workflow (`meta.name`) or the command? (Recommendation: rename
   the workflow, keep the command as the user-facing entry point — mirrors agent-swarm.)
2. **M6 severity / dependency shape** — confirm the exact supported `dependencies` shape against the
   live plugin schema before writing it.
3. **Publish-gate** — the two unchecked pre-publish items (live `graph-of-thought` run + local install
   test) are the two validations this static audit could not perform; both should clear before publish.
4. **`.gitignore` marker** — this `code-review/.gitignore` keeps itself as the only tracked trace; switch
   to a bare `*` if even that should stay untracked.
5. **Out of scope (carried, not decided here):** the T2 effort residual (skipped `medium` / High-on-minor)
   noted in the RESUME briefs.

## 8. Rulings & resolution (owner-adjudicated 2026-08-21)

Every fix was posed as a structured question with a recommendation and ruled by the owner. Applied to
the uncommitted staging tree this session; `graph-of-thought.js` was re-checked with `node --check`
and both hooks with `bash -n` after every edit.

| Finding | Ruling | Status |
|---|---|---|
| M1 name collision | rename workflow `meta.name` -> `graph-of-thought-run`; command keeps the slash path | APPLIED (got.js + command) |
| M2 stale plugin/README | full rewrite to v0.2.0 reality | APPLIED |
| M3+M4 calibration hook | rewrite: self-managed index boundary + portable date | APPLIED (parse/`bash -n`-verified); **DRY-RUN PENDING** |
| M5 preflight agentType | probe with the real agentType | APPLIED (then subsumed by M6-A) |
| M6 dependency | **Option A** - bundle a standalone roster (rb-worker/judge/auditor); drop external dependency | APPLIED (3 agents + workflow + all docs) |
| L1 version drift | bump to 0.2.0 + single-source checklist item | APPLIED |
| L2 zip artifact | gitignore, KEEP the zip on disk (owner-refined) | APPLIED (verified ignored) |
| L3 references committable | gitignore `references/` | APPLIED (verified ignored) |
| L4 Skill Evolution / skill-dependencies | do before publish | **QUEUED** (vault SSOT write; publish deferred) |
| L5 Hindsight overstated | mark PARTIAL | APPLIED |
| L6 perspective-switch parallelism | in-between: honest wording + de-anchor technique + escalation pointer | APPLIED |
| L7 THRESHOLD=0 | clamp >=2 | APPLIED |
| L8 empty refine_hint | guard on adequate + log the skip | APPLIED |
| L9 FIX + empty required_fixes | code guard: fall back to findings / skip with distinct log | APPLIED |
| N1 graph-of-thought Boundary | add section | APPLIED |
| N2 plugin.json opt-in qualifier | add "(opt-in)" | APPLIED (manifest + snippet) |
| N3 calibration-review schema note | optional no-defect polish | OPEN (not applied) |

**Architecture change of note:** M6-A makes reasoning-bundle a **standalone object** — it ships its own
`rb-worker`/`rb-judge`/`rb-auditor` roster in `agents/` and no longer depends on the `agent-swarm`
plugin. This also closed M5 (the preflight now probes agentTypes that always ship with the plugin).

**Verifications still owed before publish** (this audit could not perform them; some are on the
plugin's own checklist):
1. **Dry-run the rewritten `calibration-track.sh`** in a sandbox — code-complete, not execution-verified
   this session (Bash for running scripts was declined). The plugin's own lesson: dry-run opt-in hooks
   before trusting them.
2. **Live-run `graph-of-thought.js`** once end-to-end (now self-contained; needs fable/opus entitlement).
3. **Local install test** — confirms the M1 rename resolves the slash paths and the 3 bundled
   agentTypes register (and runs `validate-agent-roster.py` on them).
4. **`skill-dependencies` SSOT update** (L4).

## Changelog

- **v1.1 (2026-08-21):** Owner adjudication + fixes applied. 14 of 15 confirmed findings + both
  applicable nits resolved in the staging tree (L4 queued for publish; N3 optional). Architecture:
  plugin made standalone (bundled rb-* roster; agent-swarm dependency dropped). Workflow re-verified
  with `node --check`; hooks with `bash -n`. M3+M4 hook rewrite parse-verified but dry-run-pending.
  See §8.
- **v1.0 (2026-08-21):** Initial audit. 15 confirmed defects (6 med, 9 low) + 3 nits; 12 findings
  refuted (incl. 2 lead-auditor overreaches and 1 catastrophic false alarm); overlap + competitive-claim
  analyses. Method: first-hand reads + 3-path platform triangulation + 49-agent adversarial workflow
  (`wf_07d94878-bc8`). Fixes pending owner adjudication.
