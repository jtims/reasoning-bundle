# reasoning-bundle

Structured-reasoning discipline for Claude Code, as a portable plugin — **the reasoning stays in
your own model; nothing is sent to a third party.**

Most "reasoning tool" products sell scaffolds (argue the other side, weigh options, reason in
stages) delivered as external MCP servers that see your task content. This bundle gives you the same
primitives — and stronger, adversarially-verified versions of them — running locally, plus the two
capabilities those products gesture at but our own stack was missing: **loop detection** and
**calibration tracking**.

**Status: v0.2.1, feature-complete and standalone.** Skills auto-load on their triggers; both hooks
are opt-in and inert until enabled; the graph-of-thought tournament runs as a workflow with this
plugin's own bundled roster.

## What it installs

### Skills (auto-load on their triggers)

| Skill | Purpose |
|---|---|
| `staged-reasoning` | Decompose by verifiability, run the kill-shot check first, gate stages so conclusions don't outrun evidence. |
| `perspective-switch` | Evaluate from multiple independent viewpoints (technical, user, business, risk, ops) to surface blind spots. |
| `decision-matrix` | Weighted, multi-criterion option scoring with a sensitivity check, on top of the structured-adjudication method. |
| `devils-advocate` | Adversarial self-attack — premortem, assumption challenge, attack-tree — before committing. |
| `logic-check` | Make an argument's premises/inferences explicit and test validity/soundness — honestly, never claiming a machine proof. |
| `convergence-detector` | Notice when reasoning is looping and force a reframe or escalation. |
| `graph-of-thought` | Heavyweight explore-score-merge tournament for wide-solution-space problems (runs as a workflow; see below). |

### Commands

| Command | Purpose |
|---|---|
| `/reasoning-bundle:graph-of-thought` | Launch the explore-score-merge reasoning tournament — confirms the tier plan, then runs the workflow headless. |
| `/reasoning-bundle:calibration-review` | Reconcile logged calibration labels against outcomes and report hit-rate by label. |

### Hooks (opt-in — inert until you enable them)

| Hook | Event | Purpose | Enable |
|---|---|---|---|
| `calibration-track` | Stop | Capture confidence labels (VERIFIED/REPORTED/INFERRED/ASSUMED/UNKNOWN) each turn to a local ledger for later review. | `touch ~/.claude/reasoning-bundle/calibration.enabled` |
| `convergence-guard` | PreToolUse | When the same tool call repeats N times in a row, route to a human "ask" with a reframe prompt. | `touch ~/.claude/reasoning-bundle/convergence.enabled` |

## Does no harm on install

Ships **no global hooks that alter unrelated behavior.** Both hooks are **opt-in** and inert until
you enable them (each exits immediately if its enable-file is absent). Skills auto-load on their
triggers only. The reasoning stays in your own model — zero data egress.

## Self-contained (graph-of-thought)

The `graph-of-thought` workflow spawns this plugin's own bundled `rb-worker` / `rb-judge` /
`rb-auditor` agents (in `agents/`) - no external plugin is required. Its Phase-0 preflight probes each
agentType and aborts cleanly before any spend if a tier does not route.

## Install (once published)

```
/plugin marketplace add jtims/reasoning-bundle
/plugin install reasoning-bundle@reasoning-bundle
```

## Uninstall

```
/plugin uninstall reasoning-bundle@reasoning-bundle
```
