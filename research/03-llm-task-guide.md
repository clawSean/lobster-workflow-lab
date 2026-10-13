# `llm-task`: bounded LLM judgment inside deterministic workflows

_Verified against locally installed OpenClaw `2026.9.7` docs, bundled plugin source, and this lab's October 13 proof._

## Executive take

`llm-task` is an optional bundled OpenClaw tool for **one fresh, JSON-only LLM call**. It fits narrow judgments deterministic code cannot express cleanly: classify, extract, summarize, draft, rank, or review. It is not a workflow engine, agent session, or action executor.

The sound composition is:

1. deterministic code prepares bounded input;
2. `llm-task` performs one isolated inference;
3. JSON Schema validates the result;
4. deterministic code branches on the validated object;
5. explicit approval gates any external side effect.

Direct Gateway `tools.invoke` calls work in this lab. Standalone Lobster can invoke the tool when `openclaw.invoke` has Gateway URL/auth context. The bundled **embedded** Lobster runner does not currently provide a supported authenticated bridge for that nested CLI call, so embedded Lobster-to-`llm-task` composition remains an experiment, not a claimed capability.

## Exact surface

### Enablement and authorization

The plugin is bundled but optional. Two independent gates apply:

```json
{
  "plugins": { "entries": { "llm-task": { "enabled": true, "config": {} } } },
  "tools": { "alsoAllow": ["llm-task"] }
}
```

- `plugins.entries.llm-task.enabled` loads the plugin.
- `tools.alsoAllow` exposes it without making the entire tool policy restrictive. Agent-local policy can narrow it.
- Model/auth-profile overrides require separate host trust under `plugins.entries.llm-task.llm`.

Current lab posture, observed 2026-10-13: enabled and loaded, included in `tools.alsoAllow`, empty plugin `config`, and no model allowlist or configured pin. Calls omitting model selection use the agent's resolved default route. The successful smoke happened to use `openai/gpt-6-sol`; that is evidence from one run, **not** a pin.

### Call parameters

| Parameter | Required | Runtime behavior |
|---|---:|---|
| `prompt` | yes | Nonblank task instruction; blank fails before inference. |
| `input` | no | JSON-serialized and appended as `INPUT_JSON`; missing/null becomes `null`. |
| `schema` | no | JSON Schema object validating the parsed result. |
| `provider` | no | Provider override, subject to plugin LLM authorization. |
| `model` | no | Bare id, alias, or `provider/model`; duplicate provider prefix is normalized. |
| `thinking` | no | Reasoning effort supported by the resolved model. |
| `authProfileId` | no | Auth-profile override, separately authorization-gated. |
| `temperature` | no | Finite number; best effort because transports differ. |
| `maxTokens` | no | Positive integer output cap; call overrides plugin default. |
| `timeoutMs` | no | Positive integer; call, then config, then `30000`. |

Plugin `config` accepts only `defaultProvider`, `defaultModel`, `defaultAuthProfileId`, `maxTokens`, and `timeoutMs`; its manifest rejects additional properties.

Model resolution is per-call selection, plugin selection, then agent default. Provider/model selection from the call or plugin config counts as an override and must pass host policy. `allowedCompletionModels`, when configured, restricts **every** completion, including the resolved default. Prefer canonical `provider/model` entries; wildcard access is intentionally broad.

### Output contract

```json
{
  "details": {
    "json": { "category": "sync", "urgency": "normal" },
    "provider": "openai",
    "model": "gpt-6-sol"
  }
}
```

The text body is also the parsed value re-serialized as pretty JSON. Consumers should read `details.json` and record `details.provider` / `details.model` for reproducibility.

Without a schema, the tool accepts any valid JSON value: object, array, string, number, boolean, or null. This lab's `readTaskJson` wrapper narrows that to a non-array object; that check is not part of the plugin.

## What happens during a call

1. Resolve provider/model/auth and validate numeric/thinking inputs.
2. JSON-serialize `input`; circular values, `BigInt`, and other `JSON.stringify` failures produce `input must be JSON-serializable`.
3. Build a fixed system prompt: JSON only, no fences/commentary/tools.
4. Send one user message containing `TASK:` and `INPUT_JSON:`.
5. Request `execution.mode = "isolated-agent-runtime"` with the timeout.
6. Trim whitespace and tolerate one complete outer ```json code fence.
7. Run `JSON.parse` once.
8. If a non-array object schema was supplied, validate once.
9. Return parsed JSON plus the provider/model that actually ran.

There is no tool-level retry, repair prompt, alternate-model fallback, transcript reuse, session continuation, lifecycle hook run, or channel delivery.

## Isolation: strong boundary, not magic

Each call is fresh prompt-only inference. OpenClaw does not pass the calling chat transcript. The supplied tool surface is empty, and tool-shaped results are rejected rather than executed.

- A selected agent harness must implement isolated completion or the call fails before inference with `does not support isolated completion`.
- Bundled Claude and Gemini CLI runtimes implement the preparation contract; an unadapted CLI runtime fails before starting.
- Gemini CLI isolation rejects Google OAuth / Code Assist auth and native `@path` or leading `/command` prompts; API-key and Vertex auth work.
- Agents API sessions are restricted and receive no supplied tools, but the remote service may retain native helpers. OpenClaw cannot promise literal zero-tool inference there; rejecting later tool-shaped output cannot undo an earlier native-helper effect.

Use this for bounded reasoning over intentionally supplied data, not as a sandbox for adversarial secrets or a substitute for a proven literal-zero-tool runtime.

## Validation and failure modes

| Failure | Result | Workflow response |
|---|---|---|
| Blank prompt | Pre-inference failure | Fix caller; do not retry. |
| Provider/model unresolved | Pre-inference failure | Fix selection/config. |
| Override unauthorized/unlisted | Fails closed | Fix policy deliberately; never widen silently. |
| Unsupported thinking/runtime | Fails before/during dispatch | Choose supported effort/runtime. |
| Input cannot serialize | Pre-inference failure | Normalize to plain JSON. |
| Timeout/abort/provider error | Call fails | Retry only under workflow policy. |
| Model emits non-JSON | `LLM returned invalid JSON` | External repair/retry or escalation. |
| JSON violates schema | `LLM JSON did not match schema: …` | Reject; never partially consume. |
| Tool-shaped output | Rejected | Treat as isolation failure, not data. |

Two subtleties need explicit tests:

- The implementation validates `schema` only when it is a non-array object. Build/validate schemas before the call; do not pass a string, array, or null and assume enforcement.
- JSON Schema proves shape and constraints, not truth. A valid draft can contain unsupported claims; add semantic review or deterministic checks for consequential fields.

## Prompt and schema design

Prefer a small contract over a clever prompt:

```json
{
  "prompt": "Classify the ticket from supplied facts only. Do not take action.",
  "input": { "subject": "…", "body": "…" },
  "thinking": "low",
  "maxTokens": 300,
  "timeoutMs": 30000,
  "schema": {
    "type": "object",
    "properties": {
      "category": { "type": "string", "enum": ["billing", "sync", "other"] },
      "urgency": { "type": "string", "enum": ["low", "normal", "high"] },
      "summary": { "type": "string" }
    },
    "required": ["category", "urgency", "summary"],
    "additionalProperties": false
  }
}
```

- Put stable instructions in `prompt` and variable facts in `input`; do not interpolate untrusted text into instructions.
- Ask for the smallest output that drives the next deterministic branch.
- Use `required`, enums, bounds, and `additionalProperties: false` where appropriate.
- State what the model must **not** infer or do. Keep actual actions out of this judgment step.
- Default to low reasoning and tight tokens for classification/extraction/simple review; raise effort only when evals show value.
- Pin model/provider for reproducible production behavior and constrain `allowedCompletionModels`. Unpinned exploration is useful but should be logged as an experimental variable.
- Version prompt/schema in source. Store provider/model, latency, outcome, validation error, and workflow/run id—not private prompt bodies.

## Deterministic workflow integration

```text
collect/normalize -> llm-task -> schema gate -> deterministic branch
                  -> retry/repair budget OR human review
                  -> approval -> side-effecting tool
```

- Generate a run id before invocation. The Gateway caller may use an idempotency key, as this lab does, but replayed model work may still cost money.
- Bound and classify retries: none for caller/policy/schema bugs; perhaps one for transient transport failure; one explicit repair step for invalid output only when tested.
- Never let validation failure fall through to a permissive default branch.
- Put approval immediately before the irreversible operation, after review of the exact proposed payload.
- Preserve a compact audit envelope: run id, stage, prompt/schema version, safe input hash/fixture id, resolved model, status, and validation result.

## Current lab evidence

The project calls Gateway `tools.invoke` with `name: "llm-task"`, `agentId: "mainelobster"`, per-stage idempotency keys, `thinking: "low"`, `maxTokens: 700`, and `timeoutMs: 60000`. It chains triage, drafting, and review over a fictional ticket without external side effects.

Observed 2026-10-13:

- a strict-schema probe failed closed when the model omitted a required field;
- a schema-free JSON smoke passed through the normal agent route;
- the three-stage lab completed end to end;
- `readTaskJson` tests pass for success, invocation failure, and non-object output (`3/3`).

The first experiment intentionally explores schema-free behavior. Next: add stage schemas, fixtures for invalid JSON and extra/missing fields, and a deterministic Lobster packaging/approval stage—without claiming an embedded bridge.

## Sources

- OpenClaw tool guide: <https://docs.openclaw.ai/tools/llm-task>
- Lobster guide/embedded bridge caveat: <https://docs.openclaw.ai/tools/lobster>
- JSON Schema overview: <https://json-schema.org/overview/what-is-jsonschema>
- Installed docs: `/Users/Sean/.npm-global/lib/node_modules/openclaw/docs/tools/llm-task.md`
- Tool definition: `/Users/Sean/.npm-global/lib/node_modules/openclaw/dist/llm-task-tool-definition-B-pyO4x2.mjs`
- Implementation: `/Users/Sean/.npm-global/lib/node_modules/openclaw/dist/llm-task-tool-DUI1Rxj-.mjs`
- Plugin manifest: `/Users/Sean/.npm-global/lib/node_modules/openclaw/dist/extensions/llm-task/openclaw.plugin.json`
- Lab evidence: `src/run-ticket-lab.mjs`, `test/run-ticket-lab.test.mjs`, `STATUS.md`, `LOG.md`
