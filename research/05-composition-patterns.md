# Composition patterns after TaskFlow
**Research date:** 2026-10-13  
**Scope:** direct `llm-task`, deterministic helpers, embedded Lobster, native
subagents, ACP, automations, and bounded session history.

## Verdict
There is no single replacement for TaskFlow, and the lab should not build one.
OpenClaw explicitly says the shared Tasks ledger, TaskFlow API, and TaskFlow
Webhooks plugin were removed. Use explicit owners and handoffs instead:

```text
schedule / user turn
        |
        v
agent controller ------------------+----------------------+
        |                           |                      |
        v                           v                      v
direct llm-task              native subagent / ACP    deterministic helper
(bounded judgment)           (open-ended work)        (validate/package)
        |                           |                      |
        +---------------------------+----------------------+
                                    |
                                    v
                         embedded Lobster approval
                         needs_approval -> resume
                                    |
                                    v
                            narrow side effect

Evidence: project artifacts + automation run history + bounded session recall
```
Make the **artifact envelope** the durable handoff, not a hidden task ledger or
chat transcript. Each execution owner keeps its native lifecycle; the project
records only the identifiers and safe outputs needed to reconcile them.

## Responsibility split
| Need | Use | It owns | It does not own |
|---|---|---|---|
| Classification, extraction, draft, ranking, review | Direct `llm-task` | One fresh JSON inference and schema validation | Workflow state, tools, delivery, effects |
| Parsing, policy checks, packaging, hashing | Small JSON helper | Reproducible transforms and invariants | Model judgment |
| Stable sequence, branch, retry, approval/resume | Embedded Lobster | Step graph and local continuation | Global queue/schedule; nested `llm-task` until proven |
| Parallel research, review, slow tool work | Native subagent | Isolated delegated run and completion | Permanent workflow state |
| Repository implementation | ACP one-shot/persistent | Harness context, edits, tests, coding continuation | Sandbox or general task ledger |
| Clock/event-driven start | Automation | Durable schedule, admission, history, delivery result | Interactive approval or business state |
| Recover conversation evidence | `sessions_search` + bounded `sessions_history` | Redacted recall within visibility rules | Raw log, canonical artifacts, completion polling |

## Canonical run envelope
Use one project-owned envelope at every boundary:
```json
{
  "runId": "lab-20261013-...",
  "workflow": "research-ingest-v1",
  "trigger": { "kind": "interactive|automation", "jobId": null, "runId": null },
  "inputs": { "fixtureId": "public-safe-001", "sha256": "..." },
  "stages": [{
    "id": "classify", "owner": "llm-task", "contractVersion": "classify-v1",
    "status": "succeeded", "resolvedModel": "provider/model",
    "artifact": "artifacts/.../classify.json"
  }],
  "approval": { "status": "not_requested", "approvalId": null },
  "result": { "status": "proposed", "artifact": "artifacts/.../proposal.json" }
}
```
Keep the full Lobster resume token out of shared logs; it is a continuation
capability. Record the short approval id and a protected pointer to local state.
For subagents/ACP, distinguish accepted, completed, and delivered. For
automations, preserve execution `status` and whole-run `completionStatus`;
successful work with failed delivery is not end-to-end success.

## Five sequence patterns
### 1. Judge, validate, approve, apply
1. The controller calls `llm-task` directly through Gateway `tools.invoke`.
2. A helper validates the object, enforces policy, hashes inputs, and builds the
   exact proposed side-effect payload.
3. Embedded Lobster receives that package and stops at an approval preview.
4. A later interactive call resumes with approve or deny.
5. Approval runs one narrow idempotent effect; denial writes nothing.
This respects the current boundary: embedded Lobster does not transparently
authenticate a nested `llm-task` call. Lobster still supplies deterministic
packaging and durable approval/resume.

### 2. Parallel discovery, deterministic merge
1. The parent spawns isolated native subagents with exclusive lanes.
2. Children return source-backed reports through native completion.
3. The parent yields for announcements; it does not poll history/session lists.
4. A helper checks required lanes, duplicate sources, citations, and hashes.
5. Optionally use one `llm-task` to rank the verified set.
6. Lobster gates publication or another consequential action.
Use forked context only when work needs the live conversation. Self-contained
research should start isolated to avoid irrelevant assumptions and extra tokens.

### 3. ACP implementation, native review
1. Spawn one-shot ACP in the exact repo cwd, or a persistent bound session only
   when continued human steering matters.
2. ACP edits/tests and returns a patch/test receipt.
3. A native subagent independently reviews or runs a separate QA lane.
4. Deterministic checks decide pass/fail; `llm-task` cannot waive failed tests.
5. Lobster may package the exact publish action for approval.
ACP runs on the host and is not wrapped by OpenClaw's sandbox. Use a native
subagent when sandbox enforcement is required. `resumeSessionId` restores ACP
harness history, not an OpenClaw task record.

### 4. Scheduled proposal, interactive approval
1. An isolated automation owns the schedule and run history.
2. Its unattended turn uses helpers, `llm-task`, or subagents within its saved
   tool ceiling, writes a proposal artifact, and delivers a compact summary.
3. A later user turn starts or resumes Lobster approval.
Do not make unattended automation wait for a human. If it creates Lobster
approval state, deliver safe resume metadata and treat missing delivery as
unresolved. Smoke-test with `automations run <job> --wait`, then inspect the
exact history row.

### 5. Recovery by receipts, not replay
1. Read the run envelope and inspect the native owner's status/history.
2. Verify interrupted subagent execution stopped; restarts do not relaunch it.
3. Inspect an automation's exact run plus execution/completion status.
4. Use search and anchored history only for missing conversational context; the
   view is bounded and redacted.
5. Reconcile effects by idempotency key or remote read before replay.
6. Resume Lobster only when approval capability and payload match the envelope.

## Decision table
| Situation | Primary | Companion | Reason |
|---|---|---|---|
| Fixed judgment over bounded JSON | `llm-task` | Schema + helper | Small contract; malformed output fails closed |
| Pure transform/rule | Helper | Unit tests | Cheap and reproducible |
| Human inspects exact payload | Lobster approval | Helper preview | Resume skips completed steps |
| Independent research lanes | Native subagents | Merge helper | Parallel work and push completion |
| Multi-turn repo implementation | ACP persistent | Native review | Harness context plus human steering |
| One-off bounded code task | ACP one-shot | Tests + receipt | No needless persistent session |
| Daily/weekly execution | Automation | Isolated session/history | Durable clock and delivery tracking |
| Facts from an old conversation | Search + anchored history | Project artifact | Recall is evidence, not state |
| External mutation after timeout | Reconcile first | Idempotency key | Timeout does not prove non-execution |

## Anti-patterns
- Recreating TaskFlow as a JSON task database inside this lab.
- Treating `llm-task` as an agent, orchestrator, retry loop, or executor.
- Claiming embedded Lobster-to-`llm-task` nesting before a live auth proof.
- Using transcripts or automation history as the only artifact store.
- Polling session/subagent history to await completion.
- Treating spawn acceptance as completion, or completion as delivery.
- Using ACP for deterministic transforms, or assuming ACP is sandboxed.
- Retrying remote dispatch after timeout without reconciliation.
- Approving before the final payload, or logging resume tokens, secrets,
  private prompts, or unredacted data in previews.
- Scheduling before interactive output and failure behavior are proven.

## Observability contract
Every stage should emit a compact receipt with:
- root run id, stage id, attempt, timestamps, and terminal status;
- input fixture/hash and prompt/schema/helper version;
- resolved model/provider and validation outcome for `llm-task`;
- subagent/ACP run/session id plus completion and delivery state;
- automation job/run ids, execution `status`, `completionStatus`, and delivery;
- Lobster workflow version, approval id/status, and state location;
- output artifact path/hash and external idempotency key.
Log safe metadata thoroughly but keep one canonical artifact. Chat should point
to it rather than create a divergent state record.

## Test matrix
1. **Helpers:** golden fixtures, malformed JSON, field checks, stable hashes,
   and idempotent writes.
2. **`llm-task`:** valid schema, invalid JSON, schema rejection, timeout,
   unauthorized override, semantic-review failure.
3. **Lobster:** graph/validation, `needs_approval`, denial, approval, token reuse,
   timeout/output cap, and proof completed steps do not rerun.
4. **Subagents:** isolated/fork context, partial failure, late completion,
   restart interruption, completion-versus-delivery.
5. **ACP:** one-shot/resume, failed test, wrong cwd, and no assumed sandbox.
6. **Automations:** forced test run, delivery failure, backoff, restart recovery,
   and exact history reconciliation.
7. **End to end:** no effect before approval; denial writes nothing; repeated
   resume or controller retry cannot duplicate the effect.

## Candidate lab workflows, ranked
1. **Support-ticket proposal + local approval:** schemas, helper-built exact
   payload, embedded approval/resume, harmless ignored local write. Best next proof.
2. **Research-ingest packet:** parallel collectors, deterministic citation and
   dedup checks, `llm-task` relevance scoring, approval, source-backed note.
3. **Project-status distillation:** helper extracts LOG facts, `llm-task`
   proposes STATUS text, Lobster gates the exact patch.
4. **Release-note intake:** scheduled fetch, deterministic version extraction,
   parallel impact review, classification, proposal delivery; no auto-mutation.
5. **Clawloop PR triage:** deterministic GitHub/CI facts stay authoritative;
   subagents investigate, `llm-task` proposes, approval gates writes. Attempt
   only after synthetic lanes are reliable.

## Primary sources
- Installed TaskFlow-removal/automation overview:
  `/Users/Sean/.npm-global/lib/node_modules/openclaw/docs/automation/index.md`
- Automation lifecycle, payload, and history contracts:
  `docs/automation/cron-jobs/{how-it-works,payloads,managing-jobs}.md`
  under the installed OpenClaw package above.
- Native subagent contract/recovery:
  `docs/tools/subagents/{tool-reference,operations}.md`.
- ACP sessions/sandbox: `docs/tools/acp-agents/{sessions,delivery}.md`.
- Bounded session history: `docs/concepts/session-tool.md`.
- Installed tool analyses: `research/02-lobster-guide.md` and
  `research/03-llm-task-guide.md` in this repository.
- Public official docs: <https://docs.openclaw.ai/automation>,
  <https://docs.openclaw.ai/tools/lobster>,
  <https://docs.openclaw.ai/tools/llm-task>,
  <https://docs.openclaw.ai/tools/subagents>, and
  <https://docs.openclaw.ai/tools/acp-agents>.

## Confidence/version note
Grounded in installed OpenClaw `2026.9.7` docs and this lab's live proof. If
public docs diverge, re-check installed source and a live smoke before changing
the workflow contract.
