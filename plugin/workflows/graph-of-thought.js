// graph-of-thought - explore/score/merge reasoning tournament (reasoning-bundle).
// Diverge into N distinct approaches, adversarially score them, then merge the winner grafting
// the best sub-ideas from the runners-up. It is graph-of-thought (not tree): the graph edges are
// the cross-branch scoring and the grafting merge, not recursive node expansion.
//
// Flat, one-level fan-out: workflow -> agents. Branch agents are leaves and never spawn, so
// nested-workflow and spawn-depth limits are never hit.
//
// Tiers = family aliases per the resolved matrix (WORKLOG 2026-08-20): worker sonnet/high, judge
// opus/xhigh, auditor fable/xhigh (or opus/max via args). INVARIANT: every agent() pins model +
// effort explicitly, and Phase-0 probes each agentType before spend.
// Uses this plugin's OWN bundled roster (rb-worker/rb-judge/rb-auditor in agents/) - no external
// plugin dependency. Phase-0 preflight aborts if a tier does not route. v0.2.0

export const meta = {
  name: 'graph-of-thought-run',
  description: 'Explore-score-merge reasoning tournament: N distinct approaches, adversarial scoring, then a synthesis that grafts the best of the runners-up. Tiered on the bundled swarm roster; composes the reasoning-bundle skills.',
  whenToUse: 'Hard problems or high-stakes designs with a wide solution space where one-shot reasoning is risky. Pass args: {problem, out_dir, slug?, angles?, criteria?, weights?, rounds?, max_branches?, audit_model?, audit_effort?}.',
  phases: [
    { title: 'Preflight', detail: 'assert every tier routes to its pinned alias; abort on fallback' },
    { title: 'Diverge', detail: 'one sonnet worker per angle -> a distinct approach', model: 'sonnet' },
    { title: 'Score', detail: 'opus attack per branch, then one opus weighted-matrix ranking', model: 'opus' },
    { title: 'Merge', detail: 'opus synthesis of the winner, grafting the best of the runners-up', model: 'opus' },
    { title: 'Audit', detail: 'one pass over the merged deliverable; audit tier confirmed with the user (fable default, opus/max optional)' },
  ],
}

// ---------- args ----------
const A = args || {}
if (!A.problem || !A.out_dir) {
  return { status: 'ABORTED_ARGS', error: 'graph-of-thought requires args.problem and args.out_dir (absolute, run-unique). Optional: slug, angles[], criteria[], weights[], rounds, max_branches, audit_model, audit_effort.' }
}
const SLUG = A.slug || 'run'
const OUT = A.out_dir.replace(/\/+$/, '')
const ROUNDS = Math.min(Math.max(parseInt(A.rounds || 1, 10) || 1, 1), 2)

// ---------- tier matrix (family aliases; audit configurable via args) ----------
const AUDIT_MODEL = A.audit_model || 'fable'
const AUDIT_EFFORT = A.audit_effort || 'xhigh'
const T = {
  worker:  { model: 'sonnet',    effort: 'high',       agentType: 'reasoning-bundle:rb-worker'  },
  judge:   { model: 'opus',      effort: 'xhigh',      agentType: 'reasoning-bundle:rb-judge'   },
  auditor: { model: AUDIT_MODEL, effort: AUDIT_EFFORT, agentType: 'reasoning-bundle:rb-auditor' },
}
const AUDIT_RESERVE_TOKENS = 250000
const hasBudget = (typeof budget !== 'undefined') && budget && budget.total
const remaining = () => (hasBudget ? budget.remaining() : Infinity)

const DEFAULT_ANGLES = [
  { key: 'first-principles',      hint: 'Derive an approach from the fundamentals, ignoring how it is usually done.' },
  { key: 'prior-art-analogy',     hint: 'Adapt the strongest existing solution to an analogous problem.' },
  { key: 'constraint-relaxation', hint: 'Identify the binding constraint and design as if it were removed or cheap.' },
  { key: 'inversion',             hint: 'Design for what would most guarantee failure, then invert it into what to avoid.' },
  { key: 'simplest-viable',       hint: 'The smallest thing that could possibly work; strip every non-essential.' },
]
let angles = (Array.isArray(A.angles) && A.angles.length ? A.angles : DEFAULT_ANGLES)
  .map(a => (typeof a === 'string' ? { key: a, hint: '' } : a))
if (A.max_branches) angles = angles.slice(0, A.max_branches)

// ---------- Phase 0: preflight (routing assertion; aborts before spend) ----------
const auditExpect = AUDIT_MODEL.toLowerCase().includes('fable') ? 'fable'
  : AUDIT_MODEL.toLowerCase().includes('opus') ? 'opus'
  : AUDIT_MODEL.toLowerCase().includes('sonnet') ? 'sonnet'
  : AUDIT_MODEL.toLowerCase().includes('haiku') ? 'haiku'
  : AUDIT_MODEL.toLowerCase()
const PIN_SCHEMA = { type: 'object', properties: { stated_model: { type: 'string' }, self_id: { type: 'string' } }, required: ['stated_model', 'self_id'] }
const PIN_PROMPT = 'Use NO tools. Report verbatim the model line from your own system prompt/environment context in stated_model, and your best self-identification in self_id. Be literal.'
const pinSpecs = [
  { tier: 'worker', expect: 'sonnet' },
  { tier: 'judge', expect: 'opus' },
  { tier: 'auditor', expect: auditExpect },
]
phase('Preflight')
const pinRes = await parallel(pinSpecs.map(p => () =>
  agent(PIN_PROMPT, { label: 'preflight:' + T[p.tier].agentType, phase: 'Preflight', schema: PIN_SCHEMA, agentType: T[p.tier].agentType, model: T[p.tier].model, effort: 'low' })))
const pinFailures = pinSpecs.map((p, i) => {
  const r = pinRes[i]
  const id = r ? ((r.stated_model || '') + ' ' + (r.self_id || '')).toLowerCase() : ''
  return { tier: p.tier, requested: T[p.tier].model, ok: !!r && id.includes(p.expect), reported: r ? r.stated_model : 'NO RESPONSE' }
}).filter(f => !f.ok)
if (pinFailures.length) {
  log('PREFLIGHT FAILED - aborting before spend: ' + JSON.stringify(pinFailures))
  return { status: 'ABORTED_PREFLIGHT', failures: pinFailures, note: 'A tier did not route to its pinned alias or agentType. This plugin bundles the rb-worker/rb-judge/rb-auditor agentTypes in agents/ (registered namespace-qualified as reasoning-bundle:<name>); if a tier fails, check the plugin installed cleanly and that the model alias is permitted for your account. Fix and re-run - never fan onto an unverified tier.' }
}
log('Preflight OK: worker/judge/auditor agentTypes routed (audit tier = ' + AUDIT_MODEL + '/' + AUDIT_EFFORT + ').')

// ---------- schemas ----------
const BRANCH_SCHEMA = { type: 'object', properties: { angle: { type: 'string' }, thesis: { type: 'string' }, sketch: { type: 'string' }, key_assumptions: { type: 'array', items: { type: 'string' } }, file_path: { type: 'string' } }, required: ['angle', 'thesis', 'sketch', 'key_assumptions', 'file_path'] }
const ATTACK_SCHEMA = { type: 'object', properties: { angle: { type: 'string' }, strongest_objection: { type: 'string' }, severity: { type: 'string', enum: ['fatal', 'high', 'medium', 'low'] }, survives: { type: 'boolean' } }, required: ['angle', 'strongest_objection', 'severity', 'survives'] }
const SCORE_SCHEMA = { type: 'object', properties: { criteria: { type: 'array', items: { type: 'string' } }, weights: { type: 'array', items: { type: 'number' } }, ranked: { type: 'array', items: { type: 'object', properties: { angle: { type: 'string' }, weighted_score: { type: 'number' }, rationale: { type: 'string' } }, required: ['angle', 'weighted_score', 'rationale'] } }, sensitivity_note: { type: 'string' }, winner: { type: 'string' }, runners_up: { type: 'array', items: { type: 'string' } }, adequate: { type: 'boolean' }, refine_hint: { type: 'string' } }, required: ['criteria', 'weights', 'ranked', 'sensitivity_note', 'winner', 'runners_up', 'adequate', 'refine_hint'] }
const MERGE_SCHEMA = { type: 'object', properties: { merged_path: { type: 'string' }, exec_summary: { type: 'string' }, grafted_from: { type: 'array', items: { type: 'object', properties: { idea: { type: 'string' }, source_angle: { type: 'string' } }, required: ['idea', 'source_angle'] } }, open_questions: { type: 'array', items: { type: 'string' } } }, required: ['merged_path', 'exec_summary', 'grafted_from', 'open_questions'] }
const AUDIT_SCHEMA = { type: 'object', properties: { verdict: { type: 'string', enum: ['SHIP', 'FIX', 'REJECT'] }, findings: { type: 'array', items: { type: 'string' } }, required_fixes: { type: 'array', items: { type: 'string' } } }, required: ['verdict', 'findings', 'required_fixes'] }

// ---------- diverge / attack helpers ----------
async function divergeAngles(seed, round) {
  return (await parallel(seed.map(a => () =>
    agent(
      'GRAPH-OF-THOUGHT branch "' + a.key + '"' + (a.hint ? ' - ' + a.hint : '') + '.\n\nProblem: ' + A.problem +
      '\n\nProduce ONE distinct, self-contained approach to this problem from this angle. Reason under the staged-reasoning discipline (define the problem and its acceptance test, decompose by verifiability, then sketch the approach) - load the staged-reasoning skill if it is available. Deliberately DIVERGE from the obvious/default approach.\n\n' +
      'Write your full approach as markdown to ' + OUT + '/branches/branch_' + a.key + '_r' + round + '_' + SLUG + '.md (create parent dirs; write nowhere else), opening with a one-line title and the angle. Then return: thesis (one sentence), sketch (the approach), key_assumptions (what must hold for it to work), and file_path.',
      { label: 'diverge:' + a.key, phase: 'Diverge', schema: BRANCH_SCHEMA, agentType: 'reasoning-bundle:rb-worker', model: T.worker.model, effort: T.worker.effort }
    ))))
    .filter(Boolean)
}
async function attackBranches(brs) {
  return (await parallel(brs.map(b => () =>
    agent(
      'Apply the devils-advocate discipline to this approach - a premortem plus an attack on its WEAKEST assumption (load the devils-advocate skill if available). Identify the single strongest objection and decide whether the approach SURVIVES it.\n\nApproach [' + b.angle + ']: ' + b.thesis + '\nSketch: ' + b.sketch + '\nAssumptions: ' + (b.key_assumptions || []).join('; '),
      { label: 'attack:' + b.angle, phase: 'Score', schema: ATTACK_SCHEMA, agentType: 'reasoning-bundle:rb-judge', model: T.judge.model, effort: T.judge.effort }
    ).then(at => (at ? { branch: b, attack: at } : null))))).filter(Boolean)
}

// ---------- rounds: diverge -> attack -> score (barrier) ----------
const branches = []
let score = null
let roundsUsed = 0
phase('Diverge')
for (let round = 1; round <= ROUNDS; round++) {
  let seed
  if (round === 1) {
    seed = angles
  } else if (score && !score.adequate) {
    if (!score.refine_hint) log('Round ' + round + ': winner inadequate but scorer returned no refine_hint - re-diverging with a hybrid + generic-refine seed.')
    seed = [
      { key: 'refine' + round, hint: score.refine_hint || 'Address the specific weaknesses that kept the current winner from being adequate, and explore a materially different angle.' },
      { key: 'hybrid' + round, hint: 'Hybridize the two top-ranked approaches so far into a single stronger approach.' },
    ]
  } else {
    seed = []
  }
  if (!seed.length) break
  if (round > 1 && remaining() < AUDIT_RESERVE_TOKENS) { log('Budget guard: skipping re-diverge round ' + round + ' to preserve the audit reserve.'); break }
  const newBranches = await divergeAngles(seed, round)
  if (!newBranches.length) {
    if (round === 1) return { status: 'ABORTED_DIVERGE', error: 'All diverge branches failed' }
    break
  }
  roundsUsed = round
  phase('Score')
  const attacked = await attackBranches(newBranches)
  branches.push(...attacked)
  const scoreInput = branches.map(x => ({ angle: x.branch.angle, thesis: x.branch.thesis, sketch: x.branch.sketch, assumptions: x.branch.key_assumptions, objection: x.attack.strongest_objection, severity: x.attack.severity, survives: x.attack.survives }))
  score = await agent(
    'Score and RANK these candidate approaches, using the decision-matrix discipline (load the decision-matrix skill if available): derive weighted criteria - draw them from multiple stakeholder viewpoints via the perspective-switch lens (technical, user, business, risk, operations) - then score every approach per criterion with a one-line rationale, compute weighted totals, and run a sensitivity check on the top weights. A fatal or unsurvived high objection should sink an approach.\n\n' +
    'Problem: ' + A.problem + (A.criteria ? '\nCaller-supplied criteria: ' + JSON.stringify(A.criteria) : '') + (A.weights ? '\nCaller-supplied weights: ' + JSON.stringify(A.weights) : '') +
    '\n\nCANDIDATES:\n' + JSON.stringify(scoreInput, null, 1) +
    '\n\nReturn: criteria, weights, the full ranking, winner, runners_up (angles, best first), sensitivity_note, adequate (is the winner good enough to build on, or is another diverge round warranted?), and refine_hint (if not adequate, the new angle worth exploring).',
    { label: 'score:r' + round, phase: 'Score', schema: SCORE_SCHEMA, agentType: 'reasoning-bundle:rb-judge', model: T.judge.model, effort: T.judge.effort }
  )
  if (!score) return { status: 'ABORTED_SCORE', error: 'Scorer failed', branches: branches.length }
  log('Round ' + round + ': ' + branches.length + ' branches scored; winner=' + score.winner + '; adequate=' + score.adequate)
  if (score.adequate) break
}

// ---------- Phase 3: merge (winner + graft best of runners-up) ----------
phase('Merge')
const winnerBranch = branches.find(x => x.branch.angle === score.winner) || branches[0]
const runnersUp = (score.runners_up || []).map(a => branches.find(x => x.branch.angle === a)).filter(Boolean)
const merge = await agent(
  'MERGE into the final answer. Synthesize the WINNING approach and graft the best sub-ideas from the runners-up into a single approach stronger than any one branch. Apply the logic-check discipline to the merged argument (load logic-check if available): lay out the premises and the inference to the recommendation, test validity and soundness separately, and do NOT claim any machine proof.\n\n' +
  'Problem: ' + A.problem +
  '\nWinner [' + score.winner + ']: read ' + winnerBranch.branch.file_path +
  '\nRunners-up: ' + (runnersUp.length ? runnersUp.map(r => r.branch.angle + ' (' + r.branch.file_path + ')').join(', ') : 'none') +
  '\nScoring rationale: ' + JSON.stringify(score.ranked) +
  '\n\nWrite the deliverable to ' + OUT + '/GraphOfThought_' + SLUG + '.md - open with standard frontmatter (title, project: "' + SLUG + '", type: graph-of-thought, version: v1.0, date: <today>, run_id: n/a, status: merged), then answer-first (the recommended approach in the first paragraph), a section naming which grafted ideas came from which branch, a logic-check section (premises -> inference -> validity/soundness), and open_questions. Return merged_path, exec_summary, grafted_from, open_questions.',
  { label: 'merge', phase: 'Merge', schema: MERGE_SCHEMA, agentType: 'reasoning-bundle:rb-judge', model: T.judge.model, effort: T.judge.effort }
)
if (!merge) return { status: 'ABORTED_MERGE', error: 'Merge failed', winner: score.winner, branches: branches.length }

// ---------- Phase 4: audit (merged deliverable ONLY) + one repair round ----------
// Repair follows the corrected rule 6: the merged artifact is judge-produced (opus/xhigh), so
// repair runs on the JUDGE tier - never the auditor (fixer != auditor), never on Fable - and the
// auditor RE-RUNS (round 2) rather than repairing its own finding.
phase('Audit')
const auditPrompt = (round) =>
  'FINAL AUDIT (round ' + round + '). Read ONLY the merged deliverable at ' + merge.merged_path + '. Run the full five-question audit protocol from your role definition and the mimic scan. Verify it opens with the standard frontmatter. CONTRACT check against the original problem: ' + A.problem + '. Return SHIP, FIX (itemized minimal fixes), or REJECT (name the failed premise).'
let audit = await agent(auditPrompt(1), { label: 'audit:r1', phase: 'Audit', schema: AUDIT_SCHEMA, agentType: 'reasoning-bundle:rb-auditor', model: T.auditor.model, effort: T.auditor.effort })
let repairApplied = false
if (audit && audit.verdict === 'FIX') {
  const fixList = (audit.required_fixes && audit.required_fixes.length) ? audit.required_fixes
    : ((audit.findings && audit.findings.length) ? audit.findings : [])
  if (!fixList.length) {
    log('Audit FIX but neither required_fixes nor findings were populated - skipping the repair round (auditor contract violation); leaving the deliverable for the human gate.')
  } else {
    log('Audit FIX - one repair round on the judge tier (two-attempt cap): ' + fixList.join(' | '))
    const repair = await agent(
      'REPAIR the deliverable at ' + merge.merged_path + ' by applying EXACTLY these audit fixes (add a top changelog line "v1.1 - post-audit repairs"; change nothing else):\n- ' + fixList.join('\n- ') + '\nReturn {merged_path, exec_summary, grafted_from, open_questions} with the same path.',
      { label: 'repair', phase: 'Audit', schema: MERGE_SCHEMA, agentType: 'reasoning-bundle:rb-judge', model: T.judge.model, effort: T.judge.effort }
    )
    repairApplied = !!repair
    if (repair) audit = await agent(auditPrompt(2), { label: 'audit:r2', phase: 'Audit', schema: AUDIT_SCHEMA, agentType: 'reasoning-bundle:rb-auditor', model: T.auditor.model, effort: T.auditor.effort })
  }
}

// ---------- result ----------
return {
  status: audit ? (audit.verdict === 'SHIP' ? 'SHIPPED' : (audit.verdict === 'FIX' ? 'FIX_UNRESOLVED_HUMAN_GATE' : audit.verdict)) : 'UNAUDITED_HUMAN_GATE',
  deliverable: merge.merged_path,
  exec_summary: merge.exec_summary,
  winner: score.winner,
  ranked: score.ranked,
  grafted_from: merge.grafted_from,
  open_questions: merge.open_questions,
  audit: audit || 'auditor failed - treat as UNAUDITED',
  repair_applied: repairApplied,
  audit_tier: { model: T.auditor.model, effort: T.auditor.effort },
  stats: { branches: branches.length, rounds_used: roundsUsed, sensitivity: score.sensitivity_note },
  next: 'Main session: surface exec_summary + winner + open_questions + any FIX/REJECT findings to the operator; place the deliverable in the vault only if the user asks.',
}
