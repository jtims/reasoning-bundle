---
title: "Plugin Rollback — Local Directory-Source Marketplace (User Scope)"
project: "plugin-rollback"
type: graph-of-thought
version: v1.2
date: 2026-08-22
run_id: n/a
status: merged
---

> **Changelog** — v1.2 - both audit-r2 required_fixes applied (AT2 untracked-fallback filename aligned to the Phase B `tr / _` output incl. dot-hidden note; AT7 allow-list gains history.jsonl/prompt-log class, reconciling with Phase B's exclusion list); vaulted to reasoning-bundle references/ per owner ruling 2026-08-22. v1.1 - post-audit repairs

# Minimal, complete rollback of a directory-source plugin (user scope)

## Recommended approach

**Run a five-phase procedure whose verification instrument is a path-scoped git fingerprint diff over exactly four registry files, gated in front by a source-repository safety check — because for a directory-source marketplace the registry's `installLocation` IS the owner's live source directory, so the marketplace-removal step is the only genuinely dangerous move in the whole rollback.** Concretely: (A) preconditions — no live `.in_use` lease, source repo clean and pushed, marketplace exclusivity, full scope enumeration; (B) baseline fingerprints of `settings.json`, `plugins/known_marketplaces.json`, `plugins/installed_plugins.json`, `plugins/.install-manifests/`; (C) two CLI commands only — `claude plugin uninstall <p>@<m> --scope user -y`, then `claude plugin marketplace remove <m> --scope user`; (D) verification against an **expected-residue allow-list** rather than a zero-hit scan, plus a fresh-process `jq` re-derivation and an idempotency re-run; (E) a bounded, Change-Control-gated `jq del()` escalation capped at two attempts. This wins because it keeps the winning branch's central insight — the CLI's self-report is not the verification instrument, an independent byte-level diff is — while replacing three of its parameters that I measured as wrong on the live system: its tracked-path set omits the files that actually hold the state, its "cache absent immediately" criterion is a guaranteed FAIL against a documented ~14-day orphan sweep, and its `rm -rf` teardown is hard-denied by this machine's own permission rules.

The one-sentence version of the risk: **do not run `claude plugin marketplace remove` until `git -C <source-dir> status --porcelain` is empty and local `main` equals `origin/main`** — everything else in this rollback is recoverable, and that step may not be.

## Live-system calibration (re-derived this session, independent path)

| Claim | Label | Instrument |
|---|---|---|
| Directory-source marketplace records `installLocation` = the source repo itself (`~/Projects/reasoning-bundle`), not a cache clone | VERIFIED | Read `~/.claude/plugins/known_marketplaces.json` lines 18-25; contrast with the two github-source entries whose `installLocation` is under `plugins/marketplaces/` |
| `claude plugin marketplace remove <name>` **is** documented, takes `--scope`, and removing the last scope "also uninstalls any plugins you installed from it" | VERIFIED | Current official doc, `code.claude.com/docs/en/plugin-marketplaces`, "Plugin marketplace remove" incl. the Warning block |
| Whether that command deletes `installLocation` when `installLocation` is the source dir | **UNKNOWN** | Doc states shared state / cache / plugin data are "preserved when the marketplace is still declared in another scope" — it does not say what happens to a directory source at last scope. Not testable read-only. |
| Orphaned version dirs are swept "roughly 14 days later"; sweep runs only while ≥1 plugin remains installed | VERIFIED | Current official doc, `code.claude.com/docs/en/plugins-reference` |
| **Glob and Grep skip orphaned version directories** | VERIFIED (doc) | Same page. Consequence: a post-uninstall Glob/Grep cache check returns clean whether or not files exist — false-clean instrument |
| `--prune` removes auto-installed *dependencies* only, not orphan registry entries | VERIFIED | Same page, flag table |
| `--keep-data` omitted ⇒ data dir deleted only when uninstalling the **last remaining scope** | VERIFIED | Same page |
| Target plugin is user-scope only (1 entry); all four siblings carry **both** user and project scope | VERIFIED | Read `installed_plugins.json` — RB one entry (l.80-89); siblings each two, project path `~/.claude/worktrees/awesome-aryabhata-24f153` |
| Both registries must be cleared: `enabledPlugins` **and** `extraKnownMarketplaces` in `settings.json`; the registry files under `plugins/` are `installed_plugins.json`, `known_marketplaces.json`, and `blocklist.json` — per P4's enumeration, all three are tracked as surfaces, the first two expected to lose the target's keys and `blocklist.json` expected to remain byte-unchanged | VERIFIED | Read `settings.json` l.441-461; file set cross-checked against P4 |
| `.install-manifests/` holds 1 manifest for 5 installed plugins — none for the target | VERIFIED | Glob `plugins/.install-manifests/*` → only `another-plugin@another-marketplace.json` |
| A live `.in_use/<pid>` lease exists in the target's cache dir | VERIFIED | Glob → `cache/reasoning-bundle/reasoning-bundle/0.2.1/.in_use/49090` |
| Source repo is remote-backed and local `main` == `origin/main` == the sha the registry recorded | VERIFIED | Read `.git/config` (origin = the private origin repository), `.git/refs/heads/main` and `.git/refs/remotes/origin/main` both `548aeff3…`; matches `installed_plugins.json` l.87 |
| Working-tree cleanliness of the source repo | UNKNOWN | No `git status` available to me; this is precondition A2, not a finding |
| A "zero token hits under `~/.claude`" criterion is unpassable and non-stationary | VERIFIED | My own Grep: **1,590 matching lines across 153 files**. **Units:** ripgrep's default count is matching *lines*, not per-token occurrences — a line mentioning the plugin twice counts once, and no `-o` / `--count-matches` was used. (Denominator: all non-ignored files under `~/.claude`.) The runner-up branch measured 1,525/151 earlier in the same session on the same basis — the count grew because transcripts under `projects/` accumulate as we work |
| Registry-state hits are only **8** of those 1,590 | VERIFIED | Same Grep, **same units (matching lines, not token occurrences)**: `settings.json` 3 + `installed_plugins.json` 2 + `known_marketplaces.json` 3 |
| `rm -rf` and `rm -r` are **hard-denied** on this machine | VERIFIED | Read `settings.json` l.153-154 (`deny`); deny outranks every allow |
| `~/.claude` sits inside a git work-tree rooted at `$HOME`, and `.claude/**` files are tracked there | VERIFIED | Session gitStatus shows `M .claude/hooks/…`, `M .claude/context/…`, `D .claude/projects/…/memory/*.md`; no `$HOME/.gitignore` and no `~/.claude/.gitignore` exist (Glob) |
| `~/.claude/plugins/` contains nested git repositories | VERIFIED | Glob → `plugins/marketplaces/*/.git/`, `plugins/cache/claude-plugins-official/lovable/0.1.0/.git/` |
| `plugins/data/` is currently empty or absent | VERIFIED | Glob `plugins/data/**` → no files. The "data dir absent" check therefore passes *before* rollback — it carries no information here |
| Two open upstream defects (`anthropics/claude-code` #9537, #17061) leave orphan registry entries after marketplace removal | REPORTED (winning branch, single source) | Not re-derived. The procedure is built so it does not *depend* on this being true — the diff catches an orphan either way |
| **The CLI flags this procedure types**: `--json` on `claude plugin list` and `claude plugin marketplace list`; `-y` on `claude plugin uninstall`; and the `--json` **schema** (an `id` field shaped `<plugin>@<marketplace>`) | **ASSUMED** | Nothing I read this session shows them — no `--help` output captured, no doc line cited. Preflight once before Phase B: `claude plugin --help`, `claude plugin list --help`, `claude plugin uninstall --help`. If a flag or field is absent, **stop, do not degrade** (P13) |

## The procedure

### Phase A — Preconditions (read-only; every one is an abort gate)

**A1. Do not roll back from a session that is running the plugin.**
```bash
ls -A ~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/.in_use/ 2>/dev/null
```
Non-empty ⇒ a live process holds a lease (verified present: `.in_use/49090`). Abort. The documented 14-day grace period exists precisely so concurrent sessions survive; racing it is how you get a half-loaded plugin in another window. Self-referential case: if the plugin's own workflow is what is asking for the rollback, finish that workflow first and roll back from a clean session.

**A2. Source-repository safety gate — the kill-shot check.** Run this before anything mutating.
```bash
SRC=$(jq -r '.["<marketplace>"].installLocation' ~/.claude/plugins/known_marketplaces.json)
git -C "$SRC" status --porcelain          # must be empty
git -C "$SRC" rev-parse HEAD @{u}         # both lines must match
```
Rationale: for a `"source": "directory"` marketplace, `installLocation` and the source path are the same directory — the owner's live repo. The documented removal semantics do not state whether that directory is deleted at last-scope removal, and it is not safe to find out empirically on unbacked work. If either check fails: commit and push, or `cp -R "$SRC" <somewhere outside ~/.claude and outside $SRC's parent>`, then re-run. Only then proceed.

**A3. Marketplace exclusivity gate — must fail CLOSED.** Derive the count from a **VERIFIED surface** (the registry file), not from the CLI:
```bash
jq '[.plugins | keys[] | select(endswith("@<marketplace>"))] | length' \
  ~/.claude/plugins/installed_plugins.json
```
Read the result in this order:

- **`0`, empty output, or a non-zero `jq` exit ⇒ ABORT.** The target itself is registered under this marketplace (VERIFIED pre-rollback), so the only ways to see `0` are a wrong `<marketplace>` substitution, a wrong file, or a broken instrument. Never read `0` as "nothing depends on this marketplace."
- **`1` ⇒ exclusive.** Run C1, then C2.
- **`>1` ⇒ other plugins still depend on this marketplace.** Do Phase C1 only, skip C2, and **report the boundary explicitly** ("marketplace retained — still backing X, Y") rather than silently skipping. This is what keeps the "safe while other plugins remain installed" constraint true rather than asserted.

**Why not the CLI here.** The naive form `claude plugin list --json | jq -r '.. | .id? // empty' | grep -c '@<m>$'` fails **open** on the one irreversible step: `--json` is ASSUMED, not verified (P13), and its output shape (`id` = `<plugin>@<marketplace>`) is an assumed schema — so an unrecognized flag, an empty result, or a renamed field all yield `0`, which a `>1` test reads as "exclusive, safe to remove the marketplace." If you keep the CLI instrument anyway, guard it so a broken instrument aborts instead of authorizing C2:
```bash
out=$(claude plugin list --json) || { echo "ABORT: plugin list exited non-zero"; exit 1; }
[ -n "$out" ]                     || { echo "ABORT: plugin list returned empty output"; exit 1; }
ids=$(printf '%s' "$out" | jq -r '.. | .id? // empty')            # ASSUMED schema
[ -n "$ids" ]                     || { echo "ABORT: no .id fields — schema assumption failed"; exit 1; }
n=$(printf '%s' "$ids" | grep -c '@<marketplace>$') || true       # grep -c exits 1 on zero matches
[ "$n" -ge 1 ]                    || { echo "ABORT: count 0 — target must appear; instrument is wrong"; exit 1; }
```
Exit 0 **and** non-empty output **and** `n >= 1` are all required before the count is trusted. The `jq`-on-`installed_plugins.json` form above depends on neither the flag nor the schema, which is why it is the primary.

**A4. Scope enumeration.**
```bash
jq '.plugins["<plugin>@<marketplace>"] | map(.scope, .projectPath?)' ~/.claude/plugins/installed_plugins.json
```
Every scope needs its own uninstall invocation. This also tells you whether the *next* uninstall is the "last remaining scope" — which is what triggers data-dir deletion and what makes the marketplace-remove Warning bite.

**A5. Resolve the marketplace name correctly.** The `<name>` argument is the `name` field from the source's `.claude-plugin/marketplace.json`, **not** the path you passed to `add`. Read it; do not infer it from the directory name.

### Phase B — Baseline fingerprints (transactional-verification pattern, corrected path set)

Track exactly these four surfaces — they are where the state actually lives:

```bash
mkdir -p /private/tmp/<scratch>/pre.copies
cd ~ && for f in \
  .claude/settings.json \
  .claude/plugins/known_marketplaces.json \
  .claude/plugins/installed_plugins.json \
  .claude/plugins/blocklist.json ; do
    cp "$f" "/private/tmp/<scratch>/pre.copies/$(printf '%s' "$f" | tr / _)"   # byte base for AT2/AT3
    printf '%s %s\n' "$(git hash-object "$f")" "$f"
done | tee /private/tmp/<scratch>/pre.fingerprints
ls -1 ~/.claude/plugins/.install-manifests/ | tee /private/tmp/<scratch>/pre.manifests
claude plugin list --json              > /private/tmp/<scratch>/pre.plugins.json      # --json ASSUMED — preflight per P13
claude plugin marketplace list --json  > /private/tmp/<scratch>/pre.marketplaces.json # ditto
```

Four deliberate departures from a naive "snapshot the whole tree" approach:

- **Keep byte copies, not just hashes.** The `cp` into `pre.copies/` is what gives AT2/AT3 a diff base that is **independent of whether those four paths are tracked in the `$HOME` repo** — `diff -u pre.copies/<file> <live file>` works either way, tracked or not. Hashes prove only *that* a file changed; AT2/AT3 are claims about *what* changed and *what did not*, which needs the bytes. Copy first, before any mutation; these are the only rollback material the procedure creates.
- **Do not `git add plugins/`.** That tree contains nested git repositories (verified: two marketplace clones plus one cached plugin clone). Adding it produces gitlinks or silent skips, so the resulting diff is not a faithful record of the thing you are trying to audit.
- **Do not bootstrap a new detached ledger blindly.** `~/.claude` is already inside a git work-tree rooted at `$HOME` (verified), so `git hash-object` gives byte-level attribution with **no commit at all** — which matters because that tree already carries a large volume of the owner's in-flight uncommitted work, and because committing under `~/.claude` here would trip the changelog and pre-write gates. First confirm tracking status: `git -C ~ ls-files --error-unmatch <the four paths>`; if a path is untracked, `git hash-object` still works (it hashes file contents, not the index), so the method holds either way — and `git diff` is simply unavailable for that path, which is exactly what `pre.copies/` covers.
- **Never let `.credentials.json`, `history.jsonl`, `projects/`, `backups/`, or `shell-snapshots/` into any snapshot** — secrets and unbounded transcript volume, neither of which is plugin state.

### Phase C — Deterministic removal (two commands, CLI only)

```bash
# once per scope enumerated in A4
claude plugin uninstall <plugin>@<marketplace> --scope user -y
# then, only if A3 showed exclusivity
claude plugin marketplace remove <marketplace> --scope user
```

- **No `--keep-data`** — a rollback means the data directory goes.
- **No `--prune`.** Per the current doc it removes auto-installed *dependencies* that no other plugin requires. That is not orphan-registry repair, and on a machine with four other plugins installed it adds blast radius for zero benefit to this objective. This is a deliberate correction to the winning branch.
- **`-y` is ASSUMED** (P13). If the preflight shows no such flag, run the uninstall interactively and answer the prompt yourself — do not pipe `yes` into it and do not skip the step.
- **Uninstall first, then marketplace remove**, even though the documented Warning means marketplace removal would subsume the uninstall. Sequencing this way makes each command's diff independently attributable, and makes the second command a near-no-op on plugin state — a smaller, better-understood mutation.
- Treat both exit codes as **provisional**. They are not the verification instrument.

### Phase D — Verification (an acceptance test that can actually pass, and could actually fail)

| # | Criterion | Instrument | Failure looks like |
|---|---|---|---|
| AT1 | `installed_plugins.json` has no `<p>@<m>` key; `known_marketplaces.json` has no `<m>` key | `jq 'has(...)'` → false, plus fingerprint change on both files | key still present, or fingerprint unchanged (silent no-op) |
| AT2 | `settings.json` lost exactly the one `enabledPlugins` key and the one `extraKnownMarketplaces` key | `git -C ~ diff -- .claude/settings.json` **when the path is tracked** (resolve with `git -C ~ ls-files --error-unmatch .claude/settings.json`); **untracked fallback:** `diff -u /private/tmp/<scratch>/pre.copies/.claude_settings.json ~/.claude/settings.json` — the Phase B byte copy (note: the `tr / _` transform preserves the leading dot, so the copy is dot-hidden in plain `ls`; use `ls -a`), which needs no index | any other line moved |
| AT3 | No collateral: the four remaining `enabledPlugins` keys and the one remaining marketplace are byte-identical | same instrument as AT2, read literally — `git diff` if tracked, else `diff -u` against `pre.copies/`; run the same pair over `installed_plugins.json`, `known_marketplaces.json`, and `blocklist.json` | a sibling's line changed; `blocklist.json` changed at all |
| AT4 | Every touched JSON still parses | `jq empty <file>` on each | non-zero exit |
| AT5 | Independent re-derivation from a **fresh process** | `claude plugin list --json` + `marketplace list --json`, `jq`-diffed against `pre.*.json` → exactly one plugin and one marketplace removed. Depends on the ASSUMED `--json` flag (P13); if absent, AT5 has no instrument — stop, do not substitute eyeballing | any sibling delta; any residual reference to `<p>`/`<m>` |
| AT6 | Cache dir is **either absent or orphaned-and-unreferenced** — *not* "absent immediately" | `ls -d` / `test -e` via Bash. **Not Glob, not Grep** — the doc states both skip orphaned dirs, so they report clean regardless | dir present *and* still referenced by a registry file |
| AT7 | Residue outside the allow-list is zero | `grep -rl '<p>\|<m>' ~/.claude` (file list), then subtract the allow-list below | a hit in `settings.json`, `plugins/*.json`, or `.install-manifests/` |
| AT8 | Idempotent | re-run C1 and C2 → both report already-absent; fingerprints unchanged from post-state | a second run mutates something |
| AT9 | Siblings still function | fresh session; each remaining plugin's commands/agents resolve | a sibling command missing |

**The expected-residue allow-list (AT7).** Replacing "zero hits" with this is the single most important correction in the merge. Measured denominator: **1,590 matching lines across 153 files** — *matching lines, not token occurrences* (ripgrep's default; a line with two mentions counts once) — of which only **8 lines** are registry state. Permanently and legitimately retaining the plugin's name after a perfect rollback:

- `~/.claude/projects/**` — session transcripts and subagent logs (the bulk; deleting these is irreversible history loss, and the count grows while you work, so the target is non-stationary)
- `~/.claude/session-changelog.log`, `~/.claude/backups/**`, `~/.claude/shell-snapshots/**` — audit trail and rollback material
- `~/.claude/history.jsonl` and equivalent prompt/command logs — transcript-class content Phase B already excludes from snapshots; plugin-name hits here are expected after a correct rollback and must not fail AT7
- `~/.claude/hooks/pre-agent-pin-gate.py` — a **provenance comment** naming the plugin as what the hook's plugin-agent resolution was verified against (line 153). Non-JSON coupling: editing it to chase a "clean" scan would damage an unrelated governance hook for a cosmetic scan result
- the orphaned cache version dir, until the ~14-day sweep

Anything outside that list is a real failure. Inside it is expected.

### Phase E — Escalation, bounded

If AT1/AT2/AT7 show a surviving registry orphan (the failure mode the winning branch cites from two open upstream issues — REPORTED, not re-derived here):

1. Retry the same CLI command **once**. Two failed attempts on one defect is the hard stop — no unprompted third attempt.
2. Then, and only then, a **single scripted, path-scoped** mutation: `jq 'del(.plugins["<p>@<m>"])' file > tmp && mv tmp file`, with the exact key shown and owner approval obtained first (this environment mandates a pre-write approval gate; a rollback procedure does not exempt itself from it). Re-run AT2/AT3/AT4 afterward, so the diff proves nothing else moved. This is the "unavoidable" branch of the no-manual-JSON constraint — scripted and single-key, never an editor session.
3. **Do not reach for `--prune`** as the orphan remedy; per the doc it is the wrong tool.
4. **Do not plan on `rm -rf`.** `Bash(rm -rf:*)` and `Bash(rm -r:*)` are hard-denied on this machine and deny outranks every allow — both source branches contained a step that simply will not execute here. Prefer letting the documented sweep handle the orphaned cache. If immediate purge is genuinely required, that is a separate, explicitly approved single command — and note that routing around the deny rule with an allowed recursive-delete equivalent would be a governance violation, not a clever workaround.
5. Teardown: nothing to tear down. No ledger repo was created, and the scratch fingerprints and `pre.copies/` byte copies live in the session scratchpad.

## What was grafted, and from where

**From the winning branch (prior-art-analogy — package-manager transactional verification: etckeeper, Homebrew `cleanup`+`doctor`, Terraform plan-diff):**

1. **The central frame, kept intact** — the mutating command's self-report is not the verification instrument; an independent byte-level diff is. Every strong analog in package management pairs the transaction with an external check, and that is exactly the trust gap here.
2. **Byte-level "nothing else moved" as the top collateral check (AT3).** The strongest single criterion in the merged test, and the one that makes "safe alongside other plugins" evidence instead of assertion.
3. **Fresh-process re-derivation (AT5)** — Terraform's second-read discipline. Re-reading the file you just wrote is not verification.
4. **A restore point covering all installed plugins, not just the target** — the recoverability edge that decided the tournament. Preserved in spirit via Phase B fingerprints plus byte copies plus the pre-existing `$HOME` work-tree; the naive "commit `plugins/`" implementation was replaced (nested repos).
5. **The explicit "silent no-op" failure mode** — no diff at all after Phase C means the removal never touched disk. Retained verbatim as an AT1 failure condition.
6. **Secret exclusion from any snapshot** (`.credentials.json`).

**From the runner-up (first-principles — triangulate the footprint before deleting anything):**

7. **Recon-before-delete as a mandatory pre-phase.** This is the frame that *discovered* the `installLocation`-is-the-owner's-repo hazard; the winning frame would have diffed its way straight into it. Phase A exists because of this branch.
8. **The marketplace exclusivity gate (A3)** — and specifically its insistence on *declaring the boundary* rather than silently skipping.
9. **Scope multiplicity enumeration (A4)** — the finding that the target is user-only while all four siblings are dual-scope, which is what makes `--keep-data` and the last-scope Warning legible.
10. **`jq empty` as an explicit syntax gate (AT4)** — the winning branch had no JSON-validity check at all.
11. **Idempotency as a genuine independent property (AT8).**
12. **Per-key `jq del()` over file deletion** in shared aggregate files — the correct shape for the escalation branch.
13. **The `.install-manifests` asymmetry and the `pre-agent-pin-gate.py` non-JSON coupling** — the two findings that explain *why* CLI residue is plausible and *why* one legitimate mention must be left alone.

**Corrections I made as merger (neither branch had these; each re-derived this session):**

14. **The source-repo safety gate (A2)** — replaces both branches' handling of the marketplace-removal hazard. The runner-up's `>=2 of 3 sources` admission rule would have *admitted the owner's live repo into the deletion set* and then certified its destruction as PASS; the winner never explicitly deleted it but aimed an under-specified command at it. Neither checked whether the repo was recoverable. It is: remote-backed, `main` == `origin/main` == `548aeff3…`. That downgrades the hazard from "irreversible loss of unbacked source" to "possible loss of uncommitted working-tree changes plus a re-clone" — real, cheap to close, and closed by two read-only git commands.
15. **AT6 rewritten from "cache absent immediately" to "absent or orphaned-and-unreferenced."** The winner's version explicitly instructed the operator *not* to rely on the grace period; the documented ~14-day sweep makes that a guaranteed FAIL that pushes the operator into a destructive branch on a correctly-functioning system.
16. **AT7 rewritten from "zero token hits" to an expected-residue allow-list**, with the measured denominator (1,590 matching lines / 153 files — *lines*, not token occurrences; only 8 of those lines are registry state) and the demonstration that the count is non-stationary within a single session.
17. **The Glob/Grep blindness finding.** Per the current doc, both tools skip orphaned version directories — so the obvious filesystem-residue check is structurally incapable of failing after an uninstall. Filesystem verification must use Bash `ls`/`test -e`. This invalidates a check both branches would have run.
18. **`--prune` dropped** from the removal step (wrong semantics per doc) and from the escalation path.
19. **The `rm -rf` deny-rule collision** — both branches contain a step that cannot execute on this machine.
20. **Nested-repo hazard in `plugins/`**, which breaks the winner's snapshot; replaced with `git hash-object` fingerprints plus scratchpad byte copies, requiring no commit and no index entry.
21. **Marketplace-remove semantics corrected:** the command *is* documented and takes `--scope`; and its documented Warning means last-scope removal already uninstalls the plugin — so the two-command sequence is belt-and-braces by design, not redundancy by accident.
22. **The `.in_use` lease gate and the self-referential case (A1).**
23. **`plugins/data/` is already empty**, so "data dir absent" is a check that cannot fail here. Named as such rather than presented as evidence — a check that can only agree is theater.
24. **A3 made to fail closed, and the CLI flag/schema assumptions surfaced as premises.** The gate's original CLI form returned `0` on any instrument failure and read `0` as "exclusive" — authorizing the single irreversible command on the strength of a broken pipe. The count now comes from a VERIFIED registry surface, `0` aborts, and `--json` / `-y` / the `id` schema are labeled ASSUMED with a stated preflight and a stop-don't-degrade response (P13).

## Logic check

Per the `logic-check` discipline: premises, then the inference, then validity and soundness tested **separately**. This section lays out an argument for a human or a real checker to confirm. **It is not a proof, and nothing here was machine-verified.** The only executable checks in this document are the ones the procedure tells the operator to run; I ran none of the mutating steps.

### Premises

- **P1** (VERIFIED) For a `"source": "directory"` marketplace, `known_marketplaces.json` records `installLocation` equal to the source directory itself, unlike git-source marketplaces whose `installLocation` is a cache clone under `~/.claude/plugins/marketplaces/`.
- **P2** (VERIFIED, doc) `claude plugin marketplace remove <name>` exists, accepts `--scope`, and removing the last remaining scope also uninstalls plugins installed from that marketplace. Shared state, cache, and plugin data are stated to be preserved *only* when the marketplace remains declared in another scope.
- **P3** (UNKNOWN) Whether that command deletes the path at `installLocation` when that path is the source directory. The doc does not say; I did not test it.
- **P4** (VERIFIED) Plugin/marketplace registration state on this system lives in exactly four plain-JSON surfaces: `settings.json` (`enabledPlugins`, `extraKnownMarketplaces`), `plugins/installed_plugins.json`, `plugins/known_marketplaces.json`, `plugins/blocklist.json`, plus the `plugins/.install-manifests/` directory.
- **P5** (VERIFIED, doc) Uninstall marks the version dir orphaned and sweeps it ~14 days later; the sweep requires ≥1 plugin still installed. Four remain here, so the sweep will run.
- **P6** (VERIFIED, doc) Glob and Grep skip orphaned version directories.
- **P7** (VERIFIED) A token scan of `~/.claude` for the plugin's name returns **1,590 matching lines across 153 files** — ripgrep counts matching *lines*, not per-token occurrences, and no `-o` / `--count-matches` was used; **8 of those lines** are registry state (`settings.json` 3, `installed_plugins.json` 2, `known_marketplaces.json` 3), and the remainder are transcripts, logs, backups, the cache, and one hook comment. The total grew from an earlier in-session measurement of 1,525 lines / 151 files on the same basis.
- **P8** (VERIFIED) `Bash(rm -rf:*)` and `Bash(rm -r:*)` are in this machine's `deny` list; deny outranks allow.
- **P9** (VERIFIED) `~/.claude` sits inside a git work-tree rooted at `$HOME` that already carries substantial uncommitted owner work; `~/.claude/plugins/` contains nested git repositories.
- **P10** (VERIFIED) The target plugin is registered at user scope only; the four siblings each carry user **and** project scope.
- **P11** (VERIFIED) The source repo has an `origin` remote and local `main` == `origin/main` == the sha the plugin registry recorded. Working-tree cleanliness is UNKNOWN to me.
- **P12** (REPORTED, single source, not re-derived) Two open upstream issues describe marketplace removal leaving orphan registry entries.
- **P13** (ASSUMED) `jq` and `git` are available; the CLI verbs are safe to invoke repeatedly; **and three specific CLI flags exist exactly as this procedure types them — `--json` on `claude plugin list`, `--json` on `claude plugin marketplace list`, and `-y` on `claude plugin uninstall`** — as does the `--json` **schema** this procedure reads (an `id` field shaped `<plugin>@<marketplace>`). None of the four was verified against `--help` output or a doc line this session. **Preflight, once, before Phase B:** `claude plugin --help`, `claude plugin list --help`, `claude plugin uninstall --help`. **Response if any is absent: stop, do not degrade.** Specifically — no `--json` ⇒ Phase B's `pre.*.json` snapshots and AT5's fresh-process re-derivation lose their instrument entirely (do not substitute visual inspection), and A3's CLI variant is unusable, so use A3's primary `jq`-on-`installed_plugins.json` form, which depends on neither the flag nor the schema; a different `--json` schema ⇒ same treatment as absent, because a silently non-matching field yields a false `0`; no `-y` ⇒ run the uninstall interactively and answer the prompt, never pipe `yes` into it. If `jq` or `git` is missing, Phases B and D lose their instruments and the procedure stops rather than degrading to visual inspection.

### Inference to the recommendation

1. From **P4**: a complete rollback is a bounded edit to four JSON surfaces plus one directory. Therefore an acceptance test defined over exactly those surfaces is *complete* with respect to registration state. (Deduction from an enumeration.)
2. From **P12** + **P2**: the CLI may not fully perform that bounded edit, so its exit code is insufficient evidence. Therefore verification requires an instrument independent of the CLI. (Deduction — though note the premise it leans on is only REPORTED; step 3 is what makes this robust to P12 being false.)
3. From **P9**: a path-scoped content hash (`git hash-object`) over the four surfaces is such an instrument, and unlike a tree snapshot it neither commits nor entangles the nested repos or the owner's dirty tree. Therefore fingerprint-diff is the right instrument. Because tracking status is not yet resolved at Phase B time, the byte copies in `pre.copies/` carry the diff base that `git diff` cannot supply for an untracked path. (Deduction.)
4. From **P6**: any filesystem-residue criterion evaluated with Glob/Grep cannot fail post-uninstall. From **P5**: any criterion demanding immediate cache absence must fail on a correctly-functioning system. Therefore AT6 must be "absent or orphaned-and-unreferenced," checked with Bash. (Deduction.)
5. From **P7**: a zero-hit residue criterion is unsatisfiable and its target is non-stationary. Therefore the residue criterion must be an allow-list. (Deduction.)
6. From **P1** + **P2** + **P3**: marketplace removal is the only step in the procedure whose blast radius includes a non-reinstallable artifact, and its behavior toward that artifact is unknown. Therefore it must be preceded by a gate that makes the outcome recoverable **regardless of which way P3 resolves**. (Deduction — this is the load-bearing step, and it is valid precisely *because* P3 is UNKNOWN rather than despite it.)
7. From **P11**: that gate is two read-only git commands. Therefore the mitigation is cheap and deterministic, and there is no reason to accept the risk instead. (Deduction, conditional on the working-tree check the operator runs.)
8. From **P8**: any step depending on recursive delete is unexecutable here. Therefore the procedure must rely on the documented sweep. (Deduction.)
9. From **P10**: per-scope uninstall invocations are required, and "last remaining scope" determines data-dir deletion. Therefore Phase A must enumerate scopes before Phase C. (Deduction.)
10. From **P13** + step 6: the gate that guards the irreversible step must not be read through an ASSUMED instrument, because an instrument built on an unverified flag or schema degrades to `0` — the same value that means "exclusive, proceed." Therefore A3 must read a VERIFIED surface and must treat `0`, empty output, or a non-zero exit as ABORT. (Deduction; this is what makes the gate fail closed rather than open.)

**Conclusion:** the five-phase procedure above, with the source-repo gate as the mandatory precondition, a fail-closed exclusivity gate, and fingerprint-diff plus allow-listed residue as the acceptance test.

### Validity — does the conclusion follow if the premises hold?

Mostly yes, with two honest gaps:

- **Steps 1, 3-5, 8, 9 are valid** — each is a direct deduction from a VERIFIED premise, and none smuggles a hidden premise beyond P13's tooling and flag availability, which is stated.
- **Step 6 is valid and is the argument's backbone.** Its form is: an action with unknown effect on a non-reinstallable artifact requires a precondition that makes both branches of the unknown survivable. That holds without needing to resolve P3 either way. Note what it does *not* establish: it gives no evidence that the command *does* delete the source dir. The recommendation is a hedge against an unknown, not a claim about behavior.
- **Step 10 is valid and is the repair to a real defect in the v1.0 argument.** Its form is: a guard whose failure value is indistinguishable from its pass value is not a guard. It depends only on P13's honest labeling, not on any claim about which flags actually exist.
- **Gap 1 — step 2 leans on a REPORTED premise.** If P12 is false (issues closed, or never applied to this version), the *motivation* for an independent instrument weakens. The inference survives anyway via step 3: a fingerprint diff is nearly free, so it remains justified on cost-benefit even if the CLI is perfectly reliable. But the argument as stated is stronger than P12's label alone supports, so it is being carried by step 3, not step 2.
- **Gap 2 — step 1's completeness claim is scoped by P4's enumeration.** "Complete" means complete *over the surfaces I found by inspection*. An undocumented fifth surface would falsify the completeness claim without falsifying any individual premise. AT5's fresh-process re-derivation is the partial guard: it queries the system's own view rather than my file list, so a fifth surface that affects behavior would likely surface there. "Likely" is doing real work in that sentence — and AT5 itself rests on an ASSUMED flag (P13), so if `--json` is absent the guard is absent too.
- **Not claimed:** that the procedure is minimal in the strict sense. I argue each step earns its place, but I have not shown no smaller sufficient set exists. Phase A1 and AT8, in particular, are defensible-but-droppable at lower risk tolerance.

### Soundness — are the premises actually true?

- Ten of thirteen premises are VERIFIED by re-derivation this session against primary artifacts (the JSON registries, `.git` refs, the current official docs) or by an instrument I ran myself (the 1,590-line / 153-file count). Independent-path where it matters: the `installLocation` hazard came from reading the registry file, and the recoverability answer came from reading git refs — two unrelated sources.
- **The conclusion is capped by its weakest load-bearing premise, which is P3 (UNKNOWN).** This does not weaken the recommendation, because the recommendation is *the response to* P3 being unknown. The thing genuinely capped is any claim about what `marketplace remove` does to a directory source — and I make no such claim.
- **P12 is REPORTED and uncapped by anything I did.** Treat the escalation branch (Phase E) as insurance against an unconfirmed defect, not as an expected step.
- **P11 is half-verified.** Committed history is provably recoverable (refs match, remote present). Uncommitted working-tree state is UNKNOWN to me and is exactly what A2's `status --porcelain` check exists to resolve. If the tree is dirty and the operator skips A2, the procedure's safety argument does not hold.
- **P13 is ASSUMED, and it is the widest remaining soundness gap in the document.** Four sub-claims (`--json` on two verbs, `-y` on uninstall, the `id` schema) were typed from pattern, not read from `--help` or a doc. If `jq` or `git` is absent, Phases B and D lose their instruments; if a flag or the schema is absent, the affected step loses its instrument. The correct response in every case is to stop, not to substitute inspection — and A3 is deliberately built so that this gap cannot silently authorize C2.
- **Soundness verdict:** sound enough to act on, with one operator-executed check (A2's `status --porcelain`), one preflight (`claude plugin --help` et al., per P13), and one fail-closed gate (A3) standing between the argument and the only irreversible outcome in it. **No machine verified any of this.** The reasoning was structured, not proved; the mutating steps were never executed; a person or a real checker should confirm A2 and A3 on the live system before Phase C.

## Open questions

1. **Does `claude plugin marketplace remove` delete `installLocation` when that path is a directory source rather than a cache clone?** The single highest-value unknown. Resolvable safely: register a throwaway directory marketplace containing a trivial plugin, remove it, and check whether the directory survives. Until answered, A2 is non-negotiable.
2. **Are upstream issues #9537 and #17061 still open, and do they apply to the installed CLI version?** REPORTED only. If closed, Phase E becomes dead weight and the procedure can shrink.
3. **What writes `plugins/.install-manifests/`, and why does only one of five installed plugins have a manifest?** Verified asymmetry, unexplained. If manifests are the intended authoritative footprint record, its absence for the target is itself a residue risk the diff may not see.
4. **What creates and clears `.in_use/<pid>` markers, and what happens if a stale marker outlives its process?** Undocumented. A stale lease could block the sweep indefinitely and make AT6 permanently ambiguous.
5. **Are the four registry files tracked in the `$HOME` git repo?** Determines whether `git diff` is available as a second instrument alongside `git hash-object`. One command answers it: `git -C ~ ls-files --error-unmatch <paths>` — run it in Phase B. Either answer is now survivable, since `pre.copies/` supplies the untracked-case diff base for AT2/AT3.
6. **`~/.codex/` mirrors the same plugin/marketplace layout** (verified: `.codex/plugins/cache/...`, `.codex/.tmp/marketplaces/...`). The stated scope is `~/.claude`, so this rollback does not touch it — but if the same marketplace is registered there, "byte-clean" is true only within the declared scope. Worth confirming before declaring the rollback complete.
7. **Does removing a marketplace at `--scope user` while a plugin from it is installed at project scope leave a dangling project-scope entry?** Does not affect the target (user-only) but would matter for any sibling rollback, and all four siblings are dual-scope.
8. **Is Phase A1 strictly necessary?** The documented grace period may already make concurrent-session safety automatic, in which case the lease gate is belt-and-braces. Testable, and dropping it would make the procedure genuinely smaller.
9. **Do `claude plugin list --json`, `claude plugin marketplace list --json`, and `claude plugin uninstall -y` actually exist, and what is the `list --json` schema?** P13's ASSUMED block. One preflight answers all of it (`claude plugin --help`, `claude plugin list --help`, `claude plugin uninstall --help`); until it is run, AT5 and the Phase B CLI snapshots are instruments of unverified existence.
