# Current architecture: Lobster, `llm-task`, and TaskFlow

**Verified locally against OpenClaw `2026.9.7` on 2026-10-13.**

## Bottom line

These are **not three current peer tools**:

1. **Lobster exists and is live.** It is a separately installed official plugin
   for deterministic local pipelines and resumable approval gates.
2. **`llm-task` exists and is live.** It is a bundled optional plugin tool for
   one fresh JSON-only inference with optional JSON Schema validation.
3. **Tasks/TaskFlow is removed.** OpenClaw `2026.9.7` has no TaskFlow runtime,
   tools, API, UI, compatibility facade, or TaskFlow Webhooks plugin.

The buildable architecture is **Lobster + `llm-task` + the native owner for the
surrounding job**: subagents for delegated runs, Automations/Cron for schedules,
ACP for coding sessions, or Gateway HTTP hooks for external ingress.

## Installed-state snapshot

`openclaw plugins list --json` reported:

| Component | Distribution | Local state | Surface |
|---|---|---|---|
| Lobster | `@openclaw/lobster` | `2026.9.7`, enabled, loaded | `lobster` |
| Embedded runtime | `@clawdbot/lobster` | `2026.9.13` | in-process |
| `llm-task` | bundled `@openclaw/llm-task` | `2026.9.7`, enabled, loaded | `llm-task` |
| Tasks/TaskFlow | removed | absent | none |
| TaskFlow Webhooks | removed | absent | none |

Primary installed evidence:

- `/Users/Sean/.openclaw/extensions/lobster/package.json`
- `/Users/Sean/.openclaw/extensions/lobster/openclaw.plugin.json`
- `/Users/Sean/.npm-global/lib/node_modules/openclaw/dist/extensions/llm-task/package.json`
- `/Users/Sean/.npm-global/lib/node_modules/openclaw/dist/extensions/llm-task/openclaw.plugin.json`

## Lobster: current contract

Lobster is a constrained workflow DSL/runtime. One tool call can execute a
pipeline, stop at an approval gate, and resume by token or approval ID without
rerunning completed steps. Approval state belongs to Lobster; it is **not** a
general task registry.

The installed OpenClaw plugin:

- loads `@clawdbot/lobster/core` lazily and runs it in-process;
- accepts inline pipelines or `.lobster`, `.yaml`, `.yml`, and `.json` files;
- exposes only `run` and `resume` actions;
- normalizes results to `ok`, `status`, `output`, and `requiresApproval`;
- defaults to a 20-second timeout and 512,000-byte output cap;
- confines `cwd` to a relative path under the Gateway working directory;
- is unavailable in sandboxed tool contexts;
- rejects `needs_input`; interactive input requests are not yet supported by
  the OpenClaw tool.

Approval state is stored as small JSON files under `~/.lobster/state` by default
or `LOBSTER_STATE_DIR`. The token points to state rather than containing it. This
is durable approval/resume state, **not** the retired shared Tasks ledger.

Lobster supplies sequencing, validation, bounds, and approval gates. It does not
manage OAuth or make a called operation idempotent. The plugin itself makes no
network calls, but workflow commands may.

Primary sources:

- Installed guide, scope and approvals:
  [`docs/tools/lobster.md` lines 9-32, 346-366](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/tools/lobster.md)
- Installed implementation:
  [`dist/index.js` lines 38-54, 106-207](file:///Users/Sean/.openclaw/extensions/lobster/dist/index.js)
- Official docs: <https://docs.openclaw.ai/tools/lobster>
- Runtime source: <https://github.com/openclaw/lobster>

## `llm-task`: current contract

`llm-task` performs one isolated prompt-only inference, parses the answer as
JSON, and optionally validates it against a supplied schema. It is a bounded
judgment step—not a conversation, workflow engine, or side-effect executor.

Its implementation:

- resolves provider/model from the call, plugin defaults, or agent default;
- accepts optional auth profile, thinking, temperature, token, and timeout
  controls;
- rejects non-JSON-serializable input;
- uses a JSON-only/no-tools system instruction and `isolated-agent-runtime`;
- parses the result and fails invalid JSON or schema violations;
- returns parsed JSON plus actual provider/model metadata;
- defaults to a 30-second timeout.

The host-owned `plugins.entries.llm-task.llm` block authorizes model/profile
overrides. `allowedCompletionModels`, when set, also restricts the resolved
default. Old `config.allowedModels` settings migrate to that field without
widening the list.

Supported runtimes receive no supplied tools, calling transcript, lifecycle
hooks, channel delivery, session reuse, or provider fallback. Unsupported
harnesses fail closed before inference. One caveat: Agents API may retain
service-native helpers despite receiving no supplied tools, so it cannot promise
literal zero-tool inference.

Primary sources:

- Installed guide:
  [`docs/tools/llm-task.md` lines 9-12, 42-122, 165-176](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/tools/llm-task.md)
- Installed implementation:
  [`llm-task-tool-DUI1Rxj-.mjs` lines 54-149](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/dist/llm-task-tool-DUI1Rxj-.mjs)
- Official docs: <https://docs.openclaw.ai/tools/llm-task>

## Lobster + `llm-task`: supported seam

The conceptual flow is:

```text
collect/normalize -> llm-task -> schema gate -> deterministic package
                  -> Lobster approval -> side effect
```

But embedded Lobster does **not** currently provide a supported authenticated
bridge for nested `openclaw.invoke --tool llm-task`. It does not automatically
inherit Gateway URL/auth context. Current safe choices are:

1. call `llm-task` directly, then pass its validated artifact into a later
   Lobster packaging/approval stage;
2. use standalone Lobster where `openclaw.invoke` has explicit working
   Gateway/auth context; or
3. keep embedded Lobster deterministic until a supported bridge exists.

Lobster also will not automatically retry a nested invocation that times out
after dispatch, because the Gateway may already have performed it.

Sources:

- [`docs/tools/lobster.md` lines 186-210](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/tools/lobster.md)
- [`docs/tools/llm-task.md` lines 124-141](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/tools/llm-task.md)

## TaskFlow removal and version drift

OpenClaw removed the shared Tasks registry, TaskFlow orchestration APIs/tools/UI,
`api.runtime.tasks`, `registerDetachedTaskRuntime`, the
`agent-harness-task-runtime` SDK subpath, and the TaskFlow Webhooks plugin. There
is no compatibility facade.

The local official repository identifies:

- `91b8f103cbed9339e643982301c1da9cbd30da0a` — retire TaskFlow Webhooks,
  authored 2026-09-25;
- `6652f7eac8d96ccc50b0da648cbbd8b556fcfb7b` — remove Tasks/TaskFlow runtime,
  authored 2026-09-27.

Both are ancestors of `v2026.9.7`; that is the first local stable tag containing
each removal.

The SQLite tables `task_runs`, `task_delivery_state`, and `flow_runs` remain for
compatibility/recovery, but non-Cron rows are untouched and unused. Cron owns
only `runtime = 'cron'` history rows. Retained tables do not prove the runtime
still exists and are not an undocumented API.

Primary sources:

- Removed APIs and replacements:
  [`removed-surfaces.md` lines 357-373](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/plugins/sdk-migration/removed-surfaces.md)
- Retained-but-unused tables:
  [`database-schemas/layout.md` lines 12-31](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/reference/database-schemas/layout.md)
- Removal commits:
  <https://github.com/openclaw/openclaw/commit/91b8f103cbed9339e643982301c1da9cbd30da0a>,
  <https://github.com/openclaw/openclaw/commit/6652f7eac8d96ccc50b0da648cbbd8b556fcfb7b>
- Accepted removal evidence:
  <https://github.com/openclaw/openclaw/pull/156532#issuecomment-5798987497>

## Supported replacement matrix

| Former need | Current owner | Boundary |
|---|---|---|
| Deterministic local pipeline | Lobster | Not a fleet task ledger |
| Human approval/resume | Lobster | State belongs to its runner |
| Delegated agent launch/wait/history | Native subagent APIs | Runtime owns completion |
| Coding-agent session | ACP | ACP owns the harness session |
| One-shot or recurring schedule | Automations/Cron | Cron owns history |
| Authenticated external wake/turn | Gateway HTTP hooks | Generic ingress only |
| Old TaskFlow webhook record actions | **No equivalent** | Redesign around native owners |
| Harness completion routing | `agent-harness-completion` | Completion-only |
| Typed LLM judgment | `llm-task` | Validate; no side effects |

Sources:

- Current automation routing:
  [`automation/index.md` lines 16-82](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/automation/index.md)
- Webhook retirement and no-equivalent boundary:
  [`config-migrations.md` lines 119-148](file:///Users/Sean/.npm-global/lib/node_modules/openclaw/docs/gateway/doctor/config-migrations.md)

## Project implications

1. Treat “TaskFlow” as historical context, not a third build target.
2. Correct any diagram/report showing TaskFlow as a current outer orchestrator.
3. Keep the first proof at the supported seam: direct `llm-task`, schema check,
   then deterministic Lobster packaging/approval.
4. Pick the outer owner per job: Automations, subagents, ACP, or hooks.
5. Put approval before send/post/delete/exec actions consuming model output.
6. Recheck after upgrades; this is pinned to OpenClaw/Lobster plugin `2026.9.7`
   and embedded runtime `2026.9.13`.

No installs, config changes, repairs, restarts, or external mutations were made.
