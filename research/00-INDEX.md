# Lobster workflow research index

**Research date:** 2026-10-13  
**Pinned environment:** OpenClaw `2026.9.7`; `@openclaw/lobster` `2026.9.7`;
embedded `@clawdbot/lobster` runtime `2026.9.13`.

## Corrected verdict

The project began from the phrase **“Lobster + `llm-task` + TaskFlow.”** That is
now historical shorthand, not a current three-tool stack:

- **Lobster** is the deterministic workflow runtime: typed local steps,
  branching, bounds, approval gates, and persisted resume checkpoints.
- **`llm-task`** is one isolated JSON-only model judgment, optionally checked
  against a JSON Schema. It is not a workflow engine or action runner.
- **TaskFlow was removed in OpenClaw `2026.9.7`.** No compatibility facade
  remains. Native subagents, ACP, Automations/Cron, Lobster, hooks/webhooks, and
  project-owned state now own their respective lifecycles.

The currently supported lab seam is:

```text
host/controller
  -> direct llm-task judgment(s)
  -> deterministic validation + exact package
  -> ordinary Lobster approval/resume
  -> narrow idempotent effect or inert artifact
```

Do not design around embedded Lobster transparently nesting `llm-task`; the
installed embedded runner does not automatically inherit Gateway auth or an LLM
adapter. That bridge remains unsupported/unproven.

## Reports

1. [Current architecture and version status](01-current-architecture-and-version-status.md)
   — authoritative installed-state snapshot, TaskFlow removal evidence, and
   replacement matrix.
2. [Lobster guide](02-lobster-guide.md) — DSL/runtime behavior, workflow files,
   data flow, retry rules, approvals, embedded-vs-CLI boundaries, and tests.
3. [`llm-task` guide](03-llm-task-guide.md) — exact call/config contract,
   schema behavior, isolation, model routing, failure modes, and prompting.
4. [TaskFlow history and modern replacements](04-taskflow-history-and-modern-replacements.md)
   — what TaskFlow used to own, how it was removed, retained data behavior,
   stale references, and six migration patterns.
5. [Composition patterns](05-composition-patterns.md) — current owner matrix,
   project-owned run envelope, sequences, anti-patterns, observability, tests,
   and candidate lab workflows.
6. [Examples and inspiration](06-examples-and-inspiration.md) — official and
   community examples, portable lessons from adjacent workflow systems, and a
   ranked experiment backlog.

## Visuals

- [Editable standalone HTML diagram](diagram-current-architecture.html)
- [Standalone SVG diagram](diagram-current-architecture.svg)
- [Telegram-ready PNG diagram](diagram-current-architecture.png)

The diagram deliberately places TaskFlow in a faded **historical** band. Its
live example shows the direct `llm-task` path already proven by this project,
then the deterministic helper + Lobster approval stage recommended next.

## What to build next

**Recommended experiment:** harden the synthetic support-ticket flow without
touching Mailreef or Clawloop.

1. Add schemas to the three direct `llm-task` calls.
2. Add a deterministic helper that validates, normalizes, hashes, and packages
   the exact proposal payload.
3. Feed that package into an embedded Lobster workflow with an approval preview.
4. On approval, write only an ignored local artifact; on denial, write nothing.
5. Prove that resume does not rerun earlier steps and that repeated resume cannot
   duplicate the effect.

Then test research-ingest, project-status distillation, release-note intake, and
only later Clawloop/Mailreef integrations.

## Source hierarchy

Current-behavior claims use this order:

1. installed OpenClaw `2026.9.7` docs and loaded package/source;
2. official OpenClaw/Lobster docs and repositories;
3. observed project probes and tests;
4. community examples and adjacent systems for inspiration only.

The earlier durable comparison remains useful as historical context:
`/Users/Sean/.openclaw/workspace/knowledge/research/openclaw-native-typed-workflows-2026-09-24.md`.
Its TaskFlow recommendation is superseded by the current removal evidence in
reports 01 and 04.

## Research method and limitations

Six independent research lanes covered current architecture, Lobster,
`llm-task`, TaskFlow migration, composition, and ecosystem examples. Claude
Foreman supplied the diagram specification; the final visual was simplified and
checked against the installed source.

Primary docs, local package/source, live web search, and Perplexity-backed
research were used where available. Exa was not connected, so it was not used
or represented as used. No package installation, configuration change, Gateway
restart, or external mutation was performed during this phase.
