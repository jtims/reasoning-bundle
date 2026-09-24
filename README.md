# reasoning-bundle

A Claude Code plugin that packages structured-reasoning discipline as skills, commands, opt-in hooks and a tiered reasoning tournament. The reasoning stays in your own model. Nothing is sent to a third party.

## Why it exists

The "reasoning tool" products sold as external MCP servers deliver scaffolds: argue the other side, weigh the options, reason in stages. They also see your task content. An assessment of one such service found that everything it sold was already matched, and usually exceeded, by in-house discipline (an operating manual, a structured adjudication protocol, and adversarial-verify swarm patterns), and that routing conversation content to a new vendor was a data-boundary downgrade. This bundle ships those methods as a portable plugin and adds the two capabilities the assessment found missing: loop detection and calibration tracking.

## What it installs

Seven skills that load on their triggers: staged-reasoning, perspective-switch, decision-matrix, devils-advocate, logic-check, convergence-detector, graph-of-thought. Two commands: `/reasoning-bundle:graph-of-thought` and `/reasoning-bundle:calibration-review`. Two hooks, both inert until you create their enable files: a Stop hook that records calibration labels to a local ledger, and a PreToolUse guard that routes a repeating tool call to a human question. One workflow, graph-of-thought, with its own bundled three-agent roster: rb-worker on Sonnet at high effort, rb-judge on Opus at extra-high effort, rb-auditor on Opus at extra-high effort and read-only.

`plugin/README.md` holds the full tables.

## Install

```
/plugin marketplace add jtims/reasoning-bundle
/plugin install reasoning-bundle@reasoning-bundle
```

## Layout

| Path | Holds |
|---|---|
| `.claude-plugin/marketplace.json` | The directory-source marketplace this repository publishes |
| `plugin/` | The shippable plugin: manifest, skills, commands, agents, hooks, scripts, workflow |
| `docs/AUDIT_Reasoning-Bundle_2026-08-21.md` | The adversarial code and audit review that preceded v0.2.1: confirmed defects, refuted findings, adjudicated fixes |
| `docs/Plugin-Rollback-Runbook_2026-08-22.md` | The verified install, update and rollback procedure for a directory-source plugin |
| `VERSION` | 0.2.1 |

## How it was built and verified

v0.2.0 was audited by a 49-agent adversarial workflow plus a three-path platform triangulation before publication. Fourteen of fifteen confirmed defects were fixed under owner adjudication. The biggest change made the plugin standalone, with its own roster instead of a dependency on a separate swarm plugin. v0.2.1 namespace-qualified the bundled agent types and added effort pins. Verification before publish: a calibration dry run in a sandbox, a live twelve-agent tournament ending in a clean human gate with all three tiers routed, an install test, and a roster lint. The audit and the runbook in `docs/` are the records.

## What this demonstrates

- Packaging discipline as a distributable artifact: skills, hooks and a workflow with a manifest, a marketplace and an install test.
- Zero-egress design as a deliberate alternative to a paid external service, with the assessment that justified it.
- Adversarial review before release, with findings, refutations and adjudicated fixes kept in the repository.
- Model tiering inside a workflow: the right model and effort per stage, pinned in the agent definitions.

## License

MIT. See `LICENSE`.
