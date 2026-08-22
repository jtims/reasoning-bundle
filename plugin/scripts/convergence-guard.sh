#!/bin/bash
# reasoning-bundle :: convergence-guard.sh
# PreToolUse hook (opt-in). When the SAME tool call (tool + normalized input)
# repeats N times in a row within a session, route to a human "ask" with a
# reframe prompt, then reset. Catches "iteration 30 of the wrong approach".
# Decision is "ask", never "deny". Inert unless enabled. Fail-open on error.
RB_DIR="${RB_DATA_DIR:-$HOME/.claude/reasoning-bundle}"
[ -f "$RB_DIR/convergence.enabled" ] || exit 0
command -v jq >/dev/null 2>&1 || exit 0
THRESHOLD="${RB_CONVERGENCE_THRESHOLD:-4}"; case "$THRESHOLD" in ''|*[!0-9]*) THRESHOLD=4 ;; esac; [ "$THRESHOLD" -ge 2 ] || THRESHOLD=4
INPUT=$(cat)
SID=$(printf '%s' "$INPUT" | jq -r '.session_id // "nosession"' 2>/dev/null)
TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null); [ -n "$TOOL" ] || exit 0
SIG=$(printf '%s' "$INPUT" | jq -S -c '.tool_input // {}' 2>/dev/null | tr -d ' \n\t' \
      | { command -v shasum >/dev/null 2>&1 && shasum -a 256 || cat; } | cut -c1-16)
SIG="${TOOL}:${SIG}"
SDIR="$RB_DIR/state"; mkdir -p "$SDIR" 2>/dev/null || exit 0
ST="$SDIR/convergence-${SID}.state"; LAST=""; N=0
[ -r "$ST" ] && { LAST=$(sed -n '1p' "$ST"); N=$(sed -n '2p' "$ST"); }; case "$N" in ''|*[!0-9]*) N=0 ;; esac
if [ "$SIG" = "$LAST" ]; then N=$((N+1)); else N=1; fi
printf '%s\n%s\n' "$SIG" "$N" > "$ST" 2>/dev/null
if [ "$N" -ge "$THRESHOLD" ]; then
  printf '%s\n%s\n' "$SIG" "0" > "$ST" 2>/dev/null
  jq -nc --arg r "Convergence guard: this same tool call has repeated $N times in a row - a strong loop signal. Before continuing: name the loop, state what each prior attempt ruled out, and either change strategy/altitude or escalate with 2-3 options. Approve to proceed if the repetition is genuinely intended." \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"ask",permissionDecisionReason:$r}}'
fi
exit 0
