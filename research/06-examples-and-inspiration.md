# Examples and inspiration: what to borrow without rebuilding Temporal

**Research date:** 2026-10-13  
**Scope:** Lobster, structured `llm-task` judgment, approvals, and the current
OpenClaw owners that replace the retired TaskFlow runtime.

## Verdict
The useful design is deliberately small:

```text
deterministic collect/normalize
        -> one schema-bound LLM judgment
        -> deterministic policy + exact preview
        -> human approval
        -> one narrow, idempotent effect
        -> compact receipt
```

Lobster should own the repeatable step graph and approval continuation.
`llm-task` should own one isolated JSON judgment. The surrounding lifecycle
belongs to the current native owner: Automations for schedules, subagents or
ACP for delegated execution, and Workboard when a durable backlog plus linked
worker lifecycle is actually useful.

**TaskFlow is historical, not a third current tool.** OpenClaw `2026.9.7`
removed its runtime, API, tools, UI, and webhooks. Borrowing concepts from other
orchestrators is useful; installing one to prove a local approval flow is not.

## Evidence labels used here
- **Supported now** means verified in the installed OpenClaw `2026.9.7` docs or
  this lab's local proof.
- **Upstream Lobster** means present on `openclaw/lobster` main or its latest
  release, but not automatically proven in the older embedded runtime installed
  here.
- **Inspiration** means a pattern from another product, not an OpenClaw feature.

This distinction matters because upstream Lobster main at commit
[`1fb7da8`](https://github.com/openclaw/lobster/commit/1fb7da8f4af1284647d3b213a1489c4a2782fc3c)
and release [`v2026.9.16`](https://github.com/openclaw/lobster/releases/tag/v2026.9.16)
document a native `pipeline: llm.invoke --provider openclaw` adapter. The lab's
installed OpenClaw docs and live proof still retain the embedded-auth boundary
described in [01-current-architecture-and-version-status.md](01-current-architecture-and-version-status.md).
Treat the upstream adapter as an upgrade candidate to re-prove, not as a
capability receipt for this installation.

## Official and community Lobster examples
| Example | Evidence | What it teaches | Best lab adaptation |
|---|---|---|---|
| `github.pr.monitor.notify` | **Upstream Lobster** README and `src/recipes/github/` | Fetch deterministic facts, compare them with a saved snapshot, and emit only on change. | Add an input/version hash and prove `unchanged -> no proposal`; keep GitHub writes out of the first experiment. |
| `jacket-advice` | **Upstream Lobster** README | A shell `run:` collects data, a dedicated `approval:` pauses, and a native `pipeline:` LLM step receives prior JSON. | Use the same shape with a synthetic ticket, but place the approval immediately before the eventual effect rather than before harmless analysis. |
| Daily standup from issue [#26](https://github.com/openclaw/lobster/issues/26) | **Community example accepted into docs** | Use `pipeline:` for native Lobster stages, `run:` for real shell executables, and `stdin: $step.json` instead of temp files. | Create a fixture-backed standup summary and assert malformed upstream JSON stops before inference. |
| `email.triage` | **Upstream Lobster** source, `src/commands/stdlib/email_triage.ts` | Deterministic triage is the default; optional LLM mode returns drafts; sending remains behind `approve`. | Mirror the separation with fictional messages only: classify/draft, show exact recipients and bodies, approve, then call a local stub. |
| Static `lobster graph` | **Upstream Lobster** README | Mermaid, DOT, and ASCII expose step/data/condition/approval structure before execution. | Commit a generated Mermaid graph beside each workflow contract, but do not confuse it with live telemetry. |
| Saved approval/resume | **Supported now** OpenClaw Lobster docs | A halted run returns approval metadata and a continuation token; completed prior steps are not rerun on normal resume. | Test approve, deny, expired/invalid token, token reuse, and interruption around the effect boundary. |

### Peter Steinberger / `steipete` check
Peter's concrete Lobster signal is appropriately conservative. In the request
for an n8n-like GUI with active/past runs, he kept the feature as reasonable
backlog but said it was **not planned for the near term** and welcomed a focused
tested PR. The current Lobster vision likewise separates static graphs from a
future live dashboard and retained run history.

That argues for project-owned compact receipts now, not inventing a dashboard or
claiming Lobster already has one. The similarly named
[`steipete/lobsterbot`](https://github.com/steipete/lobsterbot) is a name-reservation
package, not workflow inspiration.

Sources:
- <https://github.com/openclaw/lobster>
- <https://github.com/openclaw/lobster/issues/26>
- <https://github.com/openclaw/lobster/issues/163>
- Peter's maintainer note:
  <https://github.com/openclaw/lobster/issues/163#issuecomment-5669483773>

## What replaces TaskFlow now
TaskFlow's old responsibilities did not move into one successor. They split
across explicit owners:

| Need | Current owner | Boundary |
|---|---|---|
| Deterministic local steps, branches, bounded retry | Lobster | Not a fleet-wide queue or run ledger |
| Human approval and continuation | Lobster | Approval protects steps after the gate; it is not an automatic sandbox |
| One structured model decision | `llm-task` | Fresh JSON-only inference; no workflow state or side effects |
| Scheduled or recurring launch | Automations | Owns schedule and run/delivery history, not interactive approval |
| Parallel delegated investigation | Native subagents | Own their run/completion lifecycle; no graph DSL |
| Coding-harness session | ACP | Owns harness context; not a general durable workflow |
| Durable backlog, dependencies, linked worker attempts | Optional Workboard plugin | Kanban/card lifecycle, not a replacement workflow language |
| Authenticated external trigger | Gateway HTTP hooks | Ingress/wake mechanism, not the retired TaskFlow Webhooks record API |

Workboard is the closest current answer when the missing need is **durable work
coordination**, not deterministic execution. It persists cards, parents,
claims, heartbeats, attempts, proof, and replay-safe notification cursors, then
dispatches through native subagent workers. Use it only when the lab needs a
backlog or multi-worker handoff; do not wrap a five-step local workflow in cards.

Primary OpenClaw sources:
- TaskFlow removal and current automation routing:
  <https://docs.openclaw.ai/automation>
- Lobster: <https://docs.openclaw.ai/tools/lobster>
- `llm-task`: <https://docs.openclaw.ai/tools/llm-task>
- Workboard: <https://docs.openclaw.ai/plugins/workboard>
- Installed database boundary:
  `/Users/Sean/.npm-global/lib/node_modules/openclaw/docs/reference/database-schemas/layout.md`

## Transferable lessons from other orchestrators
These are **inspiration only**. None establishes OpenClaw behavior.
| System | Useful source-backed pattern | Borrow here | Do not import |
|---|---|---|---|
| [Temporal](https://docs.temporal.io/workflow-execution/event) | Event history supports recovery; Activities must be safe under retry; Signals/updates represent external decisions. | Give each proposed effect a stable business-operation key; reconcile after uncertain dispatch; keep replay/resume tests. | A Temporal server, worker fleet, and event-sourced compatibility regime for a local lab. |
| [LangGraph](https://docs.langchain.com/oss/python/langgraph/interrupts) | Interrupt/resume depends on checkpoint identity, and resumed nodes may re-enter from their beginning. | Put approval in its own step and test that repeated resume cannot duplicate the action. | A stateful agent graph where deterministic Lobster steps already suffice. |
| [Prefect](https://docs.prefect.io/v3/examples/ai-database-cleanup-with-approval) | Its AI cleanup example previews candidate deletions and pauses for typed approval; retries are bounded policies. | Preview the exact effect, distinguish approve/deny/timeout, and retry only known-safe reads/judgments. | Treating an LLM confidence field as authorization or adding a distributed flow backend. |
| [Dagster](https://docs.dagster.io/guides/automate/sensors/testing-sensors) | Sensors use cursors/run keys to avoid duplicate launches and can be previewed/tested. | Hash the observed input/version and assert unchanged input produces no new proposal. | Asset catalogs, partitions, and sensors for a workflow with no data-platform need. |
| [n8n](https://docs.n8n.io/advanced-ai/human-in-the-loop-tools/) | Human review exposes the proposed tool and parameters before the tool executes. | Show destination, payload, input hash, and action key—not a vague “approve workflow?” prompt. | A visual editor as the canonical contract, or an opaque AI agent that both judges and acts. |
| [Inngest](https://www.inngest.com/docs/features/inngest-functions/steps-workflows/wait-for-event) | Durable steps have stable IDs; external events are correlated and time-bounded; idempotency remains necessary around effects. | Stable stage IDs, approval correlation, explicit expiry, and compact step receipts. | A cloud event platform until a real external event-driven requirement exists. |

Additional primary references:
- Temporal Activity semantics:
  <https://docs.temporal.io/activity-definition>
- LangGraph persistence:
  <https://docs.langchain.com/oss/python/langgraph/persistence>
- Dagster sensors:
  <https://docs.dagster.io/guides/automate/sensors/using-sensors>
- Inngest idempotency:
  <https://www.inngest.com/docs/guides/handling-idempotency>

## Ranked experiment backlog
### 1. Harden the synthetic support-ticket flow
**Why first:** it already runs and is public-safe.
Add strict schemas to triage/draft/review, deterministic packaging, an exact
approval preview, and a local idempotent write stub. Prove:

- invalid JSON/schema stops the run;
- denial creates no effect artifact;
- approval creates exactly one effect artifact;
- repeated resume/retry does not create a second artifact;
- the receipt records input hash, model/provider, approval outcome, and action
  key without storing the continuation token in broad logs.

### 2. Snapshot-based PR monitor
Use the official `github.pr.monitor.notify` idea with fixture data first. Store
the last input hash and emit a proposal only on meaningful change. Then use one
`llm-task` call to classify the change; deterministic GitHub/CI facts remain
authoritative.

**Learning target:** Dagster-style run keys without adding Dagster, plus clean
separation between observation, judgment, and notification.

### 3. Research-ingest approval packet
Collect public URLs, normalize provenance (`sourceUrl`, `retrievedAt`, content
hash), use `llm-task` for relevance/tags, dedupe deterministically, and ask for
approval before writing the canonical note.

**Learning target:** schema-bound judgment over evidence and exact diff review.

### 4. Project-status distillation
Parse append-only `LOG.md` facts, let `llm-task` propose a STATUS update, render
the exact patch, and approve before applying it.

**Learning target:** n8n-style exact-parameter review with a recoverable local
mutation and deterministic tests.

### 5. Scheduled proposal, interactive approval
Run a read-only scan from an Automation, persist a proposal receipt, and deliver
a link/identifier. A later user turn owns the Lobster approval and effect.

**Learning target:** current post-TaskFlow ownership. Do not leave an unattended
automation blocked waiting for a human.

### 6. Workboard-backed multi-lane research
Only after the simpler patterns are proven, represent a larger research program
as a parent card with independent child cards, proofs, and a deterministic merge
gate.

**Learning target:** durable backlog/worker coordination without pretending
Workboard is the workflow runtime.

## Borrow / avoid checklist
### Borrow
1. **Exact approval previews.** Include destination, payload, input version, and
   stable action key.
2. **Schema-bound LLM output.** Use narrow enums and required fields; reject
   extra fields when the contract should be closed.
3. **Deterministic policy after judgment.** A model proposes; code decides
   whether the object is complete and eligible for review.
4. **Effect-aware retries.** Retry pure reads and validation; reconcile any
   dispatch whose outcome is uncertain.
5. **Stable identities.** Run ID, stage ID, input hash, contract version,
   approval ID, and effect key should survive interruption.
6. **Small receipts.** Keep canonical artifacts in the project; record actual
   provider/model and terminal outcome, but protect secrets and resume tokens.
7. **Failure-path tests.** Malformed JSON, schema failure, deny, timeout,
   interruption, stale approval, duplicate resume, and uncertain dispatch.

### Avoid
1. Recreating TaskFlow as a home-grown JSON ledger.
2. Treating `llm-task` as an agent, retry engine, approver, or action executor.
3. Treating approval as retroactive protection for commands that already ran.
4. Retrying a remote write because the caller timed out.
5. Adding Temporal/Prefect/Dagster/Inngest/n8n before a concrete requirement
   exceeds Lobster plus the current native owners.
6. Claiming upstream Lobster behavior works in the installed embedded plugin
   until a local live test proves the exact version and auth path.
7. Building a GUI before the workflow contracts, receipts, and recovery rules
   are stable. Peter's backlog note is a useful restraint here.

## Recommended next move
Implement backlog item **#1** and make it the lab's reference pattern. It tests
the high-value boundaries—structured judgment, deterministic validation,
approval, idempotency, resume, and receipts—without external accounts or a new
orchestration service. After it passes, item #3 is the best candidate to evolve
into a reusable workflow-creation skill.
