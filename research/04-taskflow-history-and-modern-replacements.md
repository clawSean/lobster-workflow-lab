# TaskFlow history and modern replacements

**Verified against installed OpenClaw `2026.9.7` on 2026-10-13.**

## Verdict

`TaskFlow` is now a **historical OpenClaw subsystem**, not a current third peer
beside Lobster and `llm-task`. OpenClaw `2026.9.7` removed the Tasks registry,
TaskFlow runtime/API/CLI/UI, and TaskFlow Webhooks plugin. No compatibility
facade or one-for-one replacement exists.

The accurate current phrase is:

> **Lobster + `llm-task`, with the surrounding job owned by native subagents,
> ACP, Automations, sessions/project state, or HTTP hooks as appropriate.**

When historical context matters, say:

> **Lobster + `llm-task` + formerly TaskFlow (retired in OpenClaw 2026.9.7).**

Do not say "TaskFlow is bundled," "TaskFlow wraps this run," or recommend
`openclaw tasks flow` on current OpenClaw. A read-only local check confirms
`openclaw tasks --help` now returns `OpenClaw does not know the command "tasks"`.

## What TaskFlow used to be

Immediately before removal, TaskFlow was a durable orchestration record above
the background Tasks ledger. It was **not an execution engine or scheduler**.

- A flow had status, JSON state, an optimistic-concurrency `revision`, owner
  session, controller identity, and linked Task records.
- **Managed** flows were driven explicitly by plugin/controller code.
  `createManaged` created state but launched nothing; `runTask` linked an
  already-authoritative child execution and did not start it.
- **Mirrored** flows were created automatically for detached ACP/subagent runs
  and projected one backing task.
- Mutations such as wait, resume, finish, fail, and cancel required the latest
  expected revision. Stale writers had to re-read.
- A `waiting` record did not register a timer or listener. The controller or an
  Automation still had to wake and resume it.
- Cancellation was sticky, blocked new child links, and finalized after active
  children settled.
- Flow records survived Gateway restart in shared SQLite. Terminal flows were
  historically pruned after seven days; resumable blocked flows were retained.
- Operators inspected them through `openclaw tasks flow list|show|cancel` and
  the Tasks UI.

Historical contract (frozen pre-removal source):
[TaskFlow guide at the removal parent](https://github.com/openclaw/openclaw/blob/44f67c2a7d3b1752de4d8998fcc85cab1afbc756/docs/automation/taskflow.md).

## Removal timeline and rationale

| Date | Change | Meaning |
|---|---|---|
| 2026-09-25 | [PR #158225](https://github.com/openclaw/openclaw/pull/158225), commit [`91b8f10`](https://github.com/openclaw/openclaw/commit/91b8f103cbed9339e643982301c1da9cbd30da0a) | Retired the TaskFlow-only Webhooks plugin. |
| 2026-09-27 | [PR #159179](https://github.com/openclaw/openclaw/pull/159179), commit [`6652f7e`](https://github.com/openclaw/openclaw/commit/6652f7eac8d96ccc50b0da648cbbd8b556fcfb7b) | Removed Tasks/TaskFlow runtime, APIs, CLI, SDK surfaces, and panels. |
| 2026-09-29 | [`v2026.9.7`](https://github.com/openclaw/openclaw/releases/tag/v2026.9.7) | First local stable tag containing both removals. |

The reason was architectural duplication: Tasks/TaskFlow maintained a second
execution and completion ledger beside Cron, native subagents/sessions, ACP,
and media owners. The accepted cut returned each responsibility to its native
owner. It deliberately introduced no replacement ledger or compatibility API.

Primary current contract:
[installed removal guide](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/plugins/sdk-migration/removed-surfaces.md#L357-L373)
and [automation overview](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/automation/index.md#L73-L82).

## Data-retention behavior after removal

The database tables were **not dropped**:

- `task_runs`, `task_delivery_state`, and `flow_runs` remain physically present.
- Non-Cron Task and TaskFlow rows remain byte-preserved, untouched, and unused.
- They are not migrated into a new ledger and do not authorize launch, resume,
  cancellation, or result delivery.
- Cron alone still owns `runtime = 'cron'` rows in `task_runs` through its own
  history store.
- A one-time Doctor path may import eligible owner-stamped native Codex recovery
  facts into existing parent-binding metadata. That is a migration-only read,
  not a runtime Task reader; ambiguous rows remain for operator recovery.
- The old Webhooks plugin config is ignored with a warning. Doctor can remove
  stale entries, but retirement does not delete Tasks/TaskFlows. TaskFlow record
  actions have no replacement HTTP endpoint.

Sources:
[database layout](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/reference/database-schemas/layout.md#L17-L31) ·
[retired Webhooks migration](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/gateway/doctor/config-migrations.md#L119-L148).

Current owners have their own retention rules. Automation terminal history is
retained for seven days (`lost` for 24 hours), capped at the newest 2,000 rows
per job/history class; isolated automation session entries default to 24 hours.
Lobster approval checkpoints live as small files under `~/.lobster/state` (or
`LOBSTER_STATE_DIR`); the installed guide does not promise a global pruning
schedule for them. Native session/subagent and ACP history follows those
runtimes' session lifecycle rather than the retired flow table.

Sources:
[Automation retention](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/automation/cron-jobs/managing-jobs.md#L212-L229) ·
[Lobster checkpoint storage](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/tools/lobster.md#L346-L357).

## Supported replacement matrix

| Former TaskFlow responsibility | Supported current owner | Boundary |
|---|---|---|
| Deterministic steps, branching, approval/resume | Ordinary Lobster `run` / `resume` | Approval checkpoints only; not a detached-job ledger. |
| One schema-checked model judgment | `llm-task` | JSON-only inference; not workflow state. |
| Launch native delegated work | `sessions_spawn` | Native runtime owns execution and completion. |
| Wait for announced children | `sessions_yield`; selected same-turn waits via `subagents wait` | Prefer push completion; do not polling-loop. |
| Inspect child transcript/history | `sessions_history` | Redacted/bounded orchestration read; page when needed. |
| Stop/steer/follow up on native child | `subagents cancel`, `sessions_send`, or native collaboration controls | Requires controller authority. |
| External coding harness | ACP (`sessions_spawn` with `runtime: "acp"`) | ACP owns session, cancellation, resume, and harness permissions. |
| Schedule, retry, run history, transcript | Automations/Cron | Inspect with `openclaw automations runs`; no generic flow join. |
| External authenticated trigger | `POST /hooks/agent`, `/hooks/wake`, or mapped hooks | Trigger only; no TaskFlow record mutation. |
| Gateway/session lifecycle reaction | Internal hooks | Trusted in-process event handlers, not durable orchestration. |
| Plugin tool-call interception | Plugin hooks | In-process capability with its own contract. |
| Harness completion routing | `agent-harness-completion` SDK subpath | Completion-only; not a task registry. |
| Arbitrary durable cross-system state machine | Application-owned state or a dedicated external workflow engine | OpenClaw intentionally has no generic TaskFlow replacement. |

Native subagent source:
[wait and control](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/tools/subagents/tool-reference.md#L257-L285) ·
[status/cancel](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/tools/subagents/tool-reference.md#L376-L415) ·
[history safety](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/tools/subagents/announce.md#L141-L150).

ACP source:
[ownership and routing](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/tools/acp-agents.md#L14-L65) ·
[spawn/resume](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/tools/acp-agents/sessions.md#L10-L34).

## Concrete migration patterns

### 1. Research or review fan-out

**Old:** create managed flow -> launch children -> link Task rows -> inspect flow.

**Now:** spawn native children -> use `sessions_yield` for announced completion
or a bounded selected wait -> read exact child history with `sessions_history`
only when needed -> parent synthesizes. Store cross-session objective, decisions,
evidence, and next action in the project `STATUS.md`/`LOG.md`, not an inert row.

### 2. Coding-harness work

**Old:** wrap ACP execution in a TaskFlow and rely on mirrored state.

**Now:** start ACP explicitly with `sessions_spawn({runtime:"acp"})`; use one-shot
or persistent/thread-bound mode as needed. Resume supported harness state with
`resumeSessionId`; ACP owns cancellation and completion delivery.

### 3. Scheduled workflow

**Old:** Automation -> managed TaskFlow -> child Tasks -> Lobster.

**Now:** Automation owns timing, retry, terminal status, and transcript. Its
agent turn can run Lobster for deterministic steps and pause on a Lobster
approval token. Inspect exact runs with `openclaw automations runs <jobId>` and
`--run-id`; do not recreate a generic flow ledger.

### 4. External event or approval callback

**Old:** TaskFlow Webhooks `create_flow`, `set_waiting`, `resume_flow`, etc.

**Now:** call `/hooks/agent`, `/hooks/wake`, or a mapped hook. Reuse an
`Idempotency-Key` for retries of the same `/hooks/agent` payload. The receiving
agent/controller validates correlation against application-owned state, then
resumes Lobster or starts the appropriate native runtime. HTTP admission is not
proof of execution or delivery; use completion facts/logs.

### 5. Lobster approvals

**Old:** pass `flowControllerId`/`flowGoal` or flow revision parameters to run
Lobster in managed TaskFlow mode.

**Now:** use ordinary Lobster `run`; on `needs_approval`, persist and protect the
returned checkpoint reference, obtain the decision, then call `resume` with the
token or approval ID and `approve`. Lobster owns this checkpoint; the project or
calling session owns the larger job narrative.

### 6. Plugin migration

Remove calls to `api.runtime.tasks`, `registerDetachedTaskRuntime`, and the
`agent-harness-task-runtime` import. Use the execution owner's API (subagent,
ACP/harness, Cron, media, or session) and `agent-harness-completion` only for
harness completion routing. Do not read legacy tables as a private compatibility
layer.

## Stale local references discovered

These workspace files still describe TaskFlow as current and should not guide
new work without repair through their owning lifecycle:

- `skills/development-orchestration/SKILL.md`
- `skills/development-orchestration/references/orchestration-lanes.md`
- `skills/claude-foreman/PHASE2.md`
- `knowledge/procedures/openclaw-taskflow-issue-intake.md`

The local `/Users/Sean/projects/openclaw` working tree is also far behind its
remote and still contains pre-removal TaskFlow source/docs. Use the installed
`2026.9.7` docs for current behavior and the old tree only as historical
evidence. The missing `skills/taskflow/SKILL.md` path is another drift signal.

## Practical design rule for this lab

Design the lab as **two live tools plus an owner-selected envelope**:

```text
trigger/session
  -> direct schema-validated llm-task judgment
  -> separate ordinary Lobster package/approval call
  -> native owner: subagent | ACP | Automation | hook-triggered agent
  -> project STATUS/LOG + owner-specific history
```

TaskFlow belongs in the history section of the diagram, not the live execution
path.
