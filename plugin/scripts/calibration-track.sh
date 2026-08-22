#!/bin/bash
# reasoning-bundle :: calibration-track.sh
# Stop hook (opt-in). Captures confidence labels emitted in the CURRENT turn
# (VERIFIED/REPORTED/INFERRED/ASSUMED/UNKNOWN) from the transcript and appends
# one JSONL record per turn to the calibration ledger. Reconcile later with
# /reasoning-bundle:calibration-review.
#
# Self-contained + portable: tracks its OWN per-turn boundary under RB_DIR (an
# assistant-message index in last-index) instead of any external turn-stamp, and
# uses no epoch->string date math. Inert unless enabled. Fail-safe: any error ->
# exit 0 (no capture); never blocks, never fabricates.
RB_DIR="${RB_DATA_DIR:-$HOME/.claude/reasoning-bundle}"
[ -f "$RB_DIR/calibration.enabled" ] || exit 0
command -v jq >/dev/null 2>&1 || exit 0
INPUT=$(cat)
TRANSCRIPT=$(printf '%s' "$INPUT" | jq -r '.transcript_path // empty' 2>/dev/null)
[ -n "$TRANSCRIPT" ] && [ -r "$TRANSCRIPT" ] || exit 0
mkdir -p "$RB_DIR" 2>/dev/null || exit 0

# Total assistant text blocks in the transcript so far.
TOTAL=$(jq -s -r '[ .[] | select(.isSidechain != true) | select(.type=="assistant")
                 | .message.content[]? | select(.type=="text") ] | length' "$TRANSCRIPT" 2>/dev/null)
case "$TOTAL" in ''|*[!0-9]*) exit 0 ;; esac

# First run for this RB_DIR: set the boundary, capture nothing (no backlog over-count).
if [ ! -f "$RB_DIR/last-index" ]; then
  printf '%s\n' "$TOTAL" > "$RB_DIR/last-index" 2>/dev/null
  exit 0
fi
LAST=$(cat "$RB_DIR/last-index" 2>/dev/null); case "$LAST" in ''|*[!0-9]*) LAST=0 ;; esac
# Transcript shrank (new session reusing RB_DIR): reset the boundary and skip.
if [ "$TOTAL" -lt "$LAST" ]; then printf '%s\n' "$TOTAL" > "$RB_DIR/last-index" 2>/dev/null; exit 0; fi

# Portable current-time stamp (no epoch conversion; works on BSD and GNU date).
TS=$(date -u +%Y-%m-%dT%H:%M:%S 2>/dev/null); [ -n "$TS" ] || TS="unknown"

# Count labels ONLY in the assistant text blocks added since the last boundary.
REC=$(jq -s -c --arg ts "$TS" --argjson last "$LAST" '
  def labels: ["VERIFIED","REPORTED","INFERRED","ASSUMED","UNKNOWN"];
  [ .[] | select(.isSidechain != true) | select(.type=="assistant")
        | .message.content[]? | select(.type=="text") | .text ] as $all
  | [ $all | to_entries[] | select(.key >= $last) | .value ] as $new
  | ($new | join("\n")) as $body
  | ($body | split("\n") | map(select(test("\\b(VERIFIED|REPORTED|INFERRED|ASSUMED|UNKNOWN)\\b")))) as $claims
  | (labels | map(. as $lab | {key: $lab, value: ([ $body | scan("\\b"+$lab+"\\b") ] | length)}) | from_entries) as $counts
  | select(([ $counts[] ] | add) > 0)
  | {ts:$ts, counts:$counts, claims:$claims, reconciled:false}
' "$TRANSCRIPT" 2>/dev/null)

# Advance the boundary regardless of whether this turn had labels.
printf '%s\n' "$TOTAL" > "$RB_DIR/last-index" 2>/dev/null
[ -n "$REC" ] && printf '%s\n' "$REC" >> "$RB_DIR/calibration-log.jsonl" 2>/dev/null
exit 0
