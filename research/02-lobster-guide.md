# Lobster: installed-runtime guide

**Research date:** 2026-10-13  
**Verified locally:** `@openclaw/lobster` `2026.9.7`, embedding
`@clawdbot/lobster` `2026.9.13`.

## Practical verdict

Lobster is the deterministic shell around agentic judgment. Use it for a stable
sequence with inspectable JSON handoffs, bounded failures, and explicit approval.
Do not turn one-off work into ceremony or mistake a remote timeout for a safe
retry. The embedded OpenClaw tool and standalone CLI share a runtime, but the
tool is a deliberately narrower `run`/`resume` surface.

```text
typed args -> deterministic steps -> structured results
                    |                       |
                    +-- data refs/conditions+
                    +-- approval -> persisted state -> approve/deny -> resume/cancel
```

- Lobster owns local sequencing, branching, retry policy, caps, and approvals.
- Small CLIs own deterministic transforms/effects; an LLM owns bounded judgment.
- The removed Tasks/TaskFlow runtime owns nothing in OpenClaw 2026.9.7. Native
  subagent registries and harness bindings own execution/completion; sessions own
  trajectories; Cron owns schedules/history; optional Workboard owns durable
  cards, dependencies, dispatch, and worker-run links.
- Lobster approval state remains local to Lobster, not a fleet task registry.

## Authoring forms
### Inline pipelines
Good for short linear transforms:

```text
exec --json --shell 'collect --json' | where 'priority=="high"' |
pick id,title | approve --preview-from-stdin --limit 5 --prompt 'Apply?'
```

The runtime includes data stages (`where`, `pick`, `head`, `sort`, `dedupe`,
`group_by`, `map`, `template`, `json`, `table`) and execution/integration stages
(`exec`, `approve`, `llm.invoke`, `llm_task.invoke`, `openclaw.invoke`,
`openclaw.agent`). Host configuration and authentication still govern access.

### Workflow files
Use YAML/JSON (`.lobster`, `.yaml`, `.yml`, `.json`) for reviewable work:

```yaml
name: review-items
args:
  limit: { default: 10 }
steps:
  - id: collect
    run: items list --json
    timeout_ms: 10000
    retry: { max: 3, backoff: exponential, delay_ms: 500, jitter: true }
  - id: select
    run: items select --json
    stdin: $collect.json
  - id: approve
    approval: "Apply selected items?"
    stdin: $select.json
  - id: apply
    run: items apply --json
    stdin: $select.json
    when: $approve.approved
    on_error: stop
```

`run` and `command` are aliases (`run` preferred); `pipeline` runs native stages.
The installed runtime also supports `workflow` sub-workflows, `parallel` branches,
and `for_each` loops. Validation rejects steps with multiple execution kinds.

## Data flow and expressions
- `$collect.stdout`: raw text; `$collect.json`: parsed JSON;
  `$collect.json.field`: nested field (numeric indexes for arrays).
- `$approve.approved`: approval decision; `$step.skipped`/`$step.error`: control
  and error state where applicable.
- References work in `stdin`, `env`, templates, and conditions. Conditions support
  `and`, `or`, `not`, equality/inequality, numeric comparisons, literals,
  parentheses, and step refs. Prefer explicit predicates over truthiness.
- `${arg}` is raw shell-text substitution. For unsafe/punctuation-heavy values,
  quote injected `LOBSTER_ARG_<NORMALIZED_NAME>` or `LOBSTER_ARGS_JSON` instead.
- There are no `LOBSTER_STEP_*` variables; use step references.

## Loops, parallelism, composition, cost
- `for_each` consumes an array ref and supports `batch_size`/`pause_ms`. Gates are
  forbidden inside loop children; aggregate, then approve. Retrying a loop starts
  from item one, so completed children may repeat.
- `parallel.branches` accepts shell/pipeline branches with `wait: all|any` and
  optional `timeout_ms`; sibling cancellation is bounded.
- `workflow` composes another file via `workflow_args`; cycle and duplicate-id
  checks keep the graph reviewable.
- `cost_limit: { max_usd, action: warn|stop }` bounds tracked LLM spend. Unknown
  model pricing records tokens but estimates `$0` and warns; keep pricing current.

## Failure policy

```yaml
timeout_ms: 15000
retry:
  max: 3
  backoff: exponential   # or fixed
  delay_ms: 500
  max_delay_ms: 5000
  jitter: true
on_error: stop           # continue | skip_rest
```

Defaults: one attempt, fixed 1-second delay, 30-second max delay, no jitter.
`timeout_ms` is per attempt. `continue` records the error and advances;
`skip_rest` ends later steps.

**Critical:** after `openclaw.invoke`, `clawd.invoke`, or `openclaw.agent`
dispatch is attempted, automatic retry is suppressed because the remote effect
may have happened. Reconcile remote state before manual retry. `dryRun` does not
make dispatch safe: Gateway does not guarantee it prevents execution. Retry only
pure/idempotent local work or reads with known remote guarantees.

## Embedded tool limits
| Parameter | Default | Installed behavior |
|---|---:|---|
| `timeoutMs` | `20000` | Whole embedded run/resume wall-clock cap |
| `maxStdoutBytes` | `512000` | Separate cap for stdout, stderr, serialized result |
| `cwd` | Gateway cwd | Relative and contained inside Gateway working dir |
| `argsJson` | none | Workflow-file args; ignored for inline pipelines |

The CLI also offers `LOBSTER_MAX_OUTPUT_BYTES` per process stream and
`LOBSTER_MAX_HTTP_RESPONSE_BYTES` per response. Unset means unlimited at that
layer, but embedded outer caps remain. Split long work instead of reflexively
raising the host timeout.

## Approval and resume
An approval returns `needs_approval` plus prompt/preview and both a full
`resumeToken` and short `approvalId`. Resume with either capability and required
boolean `approve`; approval continues from completed steps, while denial returns
`cancelled` and cleans state.

State is small JSON under `~/.lobster/state` or `LOBSTER_STATE_DIR`; the token is
a pointer, not the full run. Resume claims are consumed at execution boundaries
to resist double execution, and later gates replace superseded continuation
markers. Approval objects can enforce `required_approver`,
`require_different_approver`, and `initiated_by`; runtime identities come from
`LOBSTER_APPROVAL_APPROVED_BY`/`LOBSTER_APPROVAL_INITIATED_BY`.

**Current embedded limitation:** the OpenClaw plugin rejects `needs_input`.
Structured input gates are CLI/SDK features; embedded approval gates work.

## Embedded tool versus CLI
| Concern | OpenClaw tool | Standalone CLI |
|---|---|---|
| Runtime/API | In-Gateway `run`/`resume` | Process; run/resume/graph/doctor/dry-run/SDK |
| Sandbox | Tool absent when sandboxed | Caller-dependent |
| Approval/input | Approval yes; input no | Both |
| Nested OpenClaw | No inherited URL/auth | Works with explicit URL/auth |
| LLM adapter | None injected by plugin | Configured OpenClaw/Pi/HTTP adapters |

This project's direct Gateway `llm-task` proof is correctly separate. Do not
claim embedded Lobster-to-`llm-task` composition until a live workflow proves
adapter/auth context. Embedded `openclaw.invoke` needs explicit connection
context; ambient credentials are accepted only for loopback destinations.

## Testing/debugging checklist

1. Keep helpers independently runnable and JSON-in/JSON-out.
2. Validate before effects; reject bad refs/policies early.
3. Inspect with `lobster graph --file x.lobster --format mermaid|dot|ascii`.
4. Author with CLI dry-run, then test the narrower embedded tool surface.
5. Cover `ok`, approval, denial, resume, timeout, malformed JSON, overflow, and
   uncertain post-dispatch failure.
6. Put effects after a standalone approval; prove first call/denial writes nothing.
7. Use temporary `LOBSTER_STATE_DIR`; prove terminal outcomes clean state.
8. Give mutations external idempotency keys plus reconciliation queries.
9. Preserve exact envelopes/artifacts; debug observed step I/O, not guesses.

## Recommended lab proof
1. Existing direct `llm-task` stages emit fully synthetic proposed JSON.
2. A deterministic helper validates/packages it.
3. Lobster shows that exact package in an approval preview.
4. Approval resumes to a harmless ignored `artifacts/` write.
5. Tests prove denial writes nothing and resume does not rerun prior work.

This demonstrates Lobster's advantage—deterministic packaging plus durable
approval—without conflating it with LLM judgment or removed TaskFlow machinery.

## Limits and anti-patterns

- Not a scheduler, distributed queue, or durable fleet-task registry.
- Resume state is local filesystem state; the host owns backup/cleanup.
- Shell steps inherit host env; never place secrets in files, args, previews,
  logs, or state.
- A small DSL still runs real commands: retain policy, narrow CLIs, cwd
  containment, and approvals.
- Move complex logic from conditions into tested JSON helpers.
- Never put approval inside retryable mutation or infer failure from timeout.
- Do not depend on CLI-only features when production uses the embedded tool.

## Sources

Primary installed evidence:

- OpenClaw guide: `/Users/Sean/.npm-global/lib/node_modules/openclaw/docs/tools/lobster.md`
- Plugin guards/API: `/Users/Sean/.openclaw/extensions/lobster/dist/index.js`
- Runtime README/package: `/Users/Sean/.openclaw/extensions/lobster/node_modules/@clawdbot/lobster/{README.md,package.json}`
- Runtime implementation/tests: `/Users/Sean/.openclaw/extensions/lobster/node_modules/@clawdbot/lobster/dist/{src,test}`
- Removed TaskFlow/current owners: `/Users/Sean/.npm-global/lib/node_modules/openclaw/docs/reference/database-schemas/layout.md`
- Project proof: this repo's `README.md`, `STATUS.md`, `VISION.md`, `src/`, `test/`.

Public references: [OpenClaw docs](https://docs.openclaw.ai/tools/lobster),
[Lobster source](https://github.com/openclaw/lobster),
[plugin source](https://github.com/openclaw/openclaw/tree/main/extensions/lobster),
[community example](https://github.com/bloomedai/brain-cli).

## Confidence

Installed source/tests outrank generic summaries. Public repo HEAD observed on
2026-10-13: `1fb7da8f4af1284647d3b213a1489c4a2782fc3c`. Native web search was unavailable;
external discovery was limited to live Git verification and primary URLs shipped
with the installed docs. Future releases may differ.
