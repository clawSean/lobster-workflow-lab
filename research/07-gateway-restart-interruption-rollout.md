# Gateway restart interruption notices: rollout proposal

**Status:** reference design only; no hook, notification, configuration, or
Gateway change has been applied.

## Goal

After a Gateway restart, find human conversations that were probably interrupted
and send one restrained recovery notice to the exact conversation:

> 🦞 Your favorite lobster just restarted his system. If your last message or
> task got interrupted, just continue here and I'll pick it back up.

This is an interruption-recovery aid, not a broadcast that the Gateway restarted.
The useful signal is **an unanswered or aborted interaction**, not merely activity
within a time window.

## Current OpenClaw fit

```text
gateway:startup / boot-md
  -> enumerate recent human sessions
  -> inspect a bounded history tail
  -> deterministic interruption rules
  -> optional decision-model judgment for ambiguous cases
  -> resolve exact conversationRef
  -> dedupe + policy gate
  -> conversations_send
  -> append receipt
```

- `boot-md` runs `BOOT.md` in a fresh temporary session on `gateway:startup`.
  Normal final delivery is disabled, so any notice must use an explicit
  conversation destination.
- `sessions_list` supplies filtered session metadata; `sessions_history` supplies
  a bounded, redacted tail for candidate sessions.
- `conversations_list` resolves the opaque `conversationRef`; never derive an
  external address from a session key.
- `conversations_send` owns the exact fire-and-forget delivery.
- Application-owned state records restart identity, candidates, decisions,
  delivery receipts, and deduplication. Retired TaskFlow rows are not used.

## Candidate rule for the first useful version

A conversation is eligible only when every deterministic rule passes:

1. It belongs to a real human conversation on an allowed channel/account.
2. The latest human message arrived within the configured lookback window.
3. No completed assistant response follows that message, **or** the owning run
   has an explicit interrupted/aborted result.
4. The conversation is not a hook, automation, subagent, ACP run, internal
   session, delivery-only record, or already-completed exchange.
5. The exact external conversation can be resolved through
   `conversations_list` under the current agent's authority.
6. No receipt exists for the same `restartId + conversationRef`.

Start with a ten-minute lookback. For a planned restart, a custom
`gateway:pre-restart`/shutdown observer can persist the cutoff time. For an abrupt
crash, startup can only infer the window from startup time or a separately
persisted heartbeat/stability fact; this uncertainty must be recorded rather
than disguised as an exact restart timestamp.

## Where Jev fits

**Jev is a strong candidate for the ambiguous semantic gate, but it is not an
`llm-task` completion model.** OpenClaw models these as separate roles:

- `llm-task` calls a conversational completion model and accepts generated JSON
  validated by JSON Schema. It is useful when the workflow needs a short reason,
  summary, or other open-ended structured fields.
- Jev is a typed **decision model**. Through OpenClaw's decision-model contract,
  it answers Choice, Score, or Boolean questions with probabilities. It does not
  generate an explanation and should be called through `decision_evaluate` (or
  the provider-neutral decision runtime), not selected as `llm-task`'s model.

For this workflow, Jev's best question is narrow:

```text
State: the final bounded user/assistant turns plus explicit run-status facts.
Boolean: "Does the evidence indicate the user's interaction was interrupted
before receiving a complete answer?"
```

Code—not Jev—must still enforce recency, human-session filtering, exact-route
resolution, deduplication, thresholds, and all sends. A low-confidence result
means skip or human review, never “send anyway.”

On the currently installed OpenClaw `2026.9.7`, `llm-task` is loaded but the
external TypeSafe provider is not installed. The bundled docs describe the
decision-model/TypeSafe path as a candidate whose packaged publication is still
pending. Therefore Jev belongs in a later evaluation phase, not the first live
dependency. No provider install or configuration is authorized by this proposal.

## Rollout

### Phase 0 — frozen replay set

- Create synthetic and redacted fixtures for completed, unanswered, aborted,
  delayed, group, automation, and duplicate cases.
- Label expected notify/skip outcomes before tuning rules or models.
- Define the error cost: a false positive messages an uninvolved person, so the
  initial policy favors silence.

**Exit:** deterministic evaluator passes the fixed fixtures and all effects are
disabled.

### Phase 1 — dry-run observer

- Trigger after startup and inspect only the bounded lookback.
- Record candidate reason codes, unresolved routes, and proposed notices.
- Send nothing. Keep restart and conversation identifiers hashed or otherwise
  minimally retained where full values are unnecessary.

**Exit:** several real restarts show useful candidates without noisy completed
conversations or duplicate proposals.

### Phase 2 — JPop-only delivery

- Allow only JPop-owned conversations across explicitly selected channels.
- Require deterministic evidence of an unanswered inbound or explicit aborted
  run; do not use a semantic model yet.
- Send once per restart/conversation and verify a real delivery receipt.

**Exit:** planned and unplanned restart tests recover the right JPop thread and
never notify a completed one.

### Phase 3 — allowlisted human chats

- Add individual conversations or relationship classes deliberately; do not
  enable all contacts or groups by default.
- Keep the deterministic rule as the only auto-send path.
- Route ambiguous cases to a review log rather than messaging them.

**Exit:** an observed pilot meets an agreed false-positive budget and every send
is traceable to evidence plus a dedupe receipt.

### Phase 4 — Jev versus `llm-task` bakeoff

- Evaluate Jev Boolean/Choice decisions and an `llm-task` JSON classifier on the
  same frozen tails.
- Compare false positives, false negatives, calibration, latency, cost, privacy,
  and unavailable/error behavior.
- Promote a model only if it improves ambiguous-case recall without weakening
  the deterministic gates. Pin its version and rubric/schema.

**Exit:** selected thresholds pass an untouched holdout. Otherwise keep the
model out of the send path.

### Phase 5 — disrupted jobs, separately

Only after chat recovery works, inspect native owners independently:

- subagent/session completion and run status;
- ACP session state;
- Automation/Cron run history and interruption receipts;
- Lobster approval checkpoints.

Do not merge these into a fake generic task ledger. Each runtime owns its own
recovery and proof.

## Safety and failure behavior

- Default to **skip** on history gaps, ambiguous routing, unavailable models,
  missing timestamps, or provider errors.
- Do not quote the user's prior message in the notice.
- Do not notify merely because a conversation was active.
- Never broadcast to every recent chat after each ordinary restart.
- Keep external sends behind an allowlist until the pilot proves precision.
- Treat iMessage's existing inbound replay as complementary; this workflow
  targets interrupted agent work, not duplicate message transport recovery.
- Make the observer idempotent because `BOOT.md` must be safe on every restart.

## Proof checklist before activation

1. Hook fires once for one restart and survives a repeated invocation safely.
2. Candidate selection handles completed, unanswered, aborted, and history-gap
   fixtures correctly.
3. Route resolution uses a current `conversationRef`, never a parsed session key.
4. Dry run proves zero outbound sends.
5. JPop-only canary delivers once and records the receipt.
6. Re-running the same restart produces zero additional sends.
7. Provider outage or malformed model output produces zero sends.
8. A completed conversation inside the ten-minute window produces zero sends.

## Sources

- Installed OpenClaw `2026.9.7`:
  `docs/automation/hooks/bundled-hooks.md`,
  `docs/automation/hooks/event-types.md`, and
  `docs/concepts/session-tool.md`.
- Installed decision-model guidance:
  `docs/concepts/decision-models.md` and `docs/plugins/typesafe.md`.
- TypeSafe System One design guidance:
  <https://docs.typesafe.ai/concepts/how-to-build-with-system-one>.
- TaskFlow removal and owner matrix:
  [report 04](04-taskflow-history-and-modern-replacements.md).
