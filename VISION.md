# Vision

## Purpose

Find repeatable OpenClaw workflows where deterministic Lobster orchestration
and isolated JSON `llm-task` judgment reduce agent round trips without creating
a second automation platform.

## First principle

Build new synthetic workflows first. Do not destabilize systems that already
work merely to demonstrate a new runtime.

## Current architecture principle

TaskFlow was removed in OpenClaw `2026.9.7`; do not recreate it inside this
project. Each native runtime owns its own lifecycle. Use direct `llm-task` calls
for bounded judgment, deterministic helpers for validation and packaging,
Lobster for stable local steps plus approval/resume, and the appropriate native
owner (subagents, ACP, Automations, or hooks) for the surrounding job.

## Candidate applications

1. **Synthetic support-ticket lab** — classify, draft, and review a fictional
   ticket. This is the first live experiment.
2. **Research ingest** — extract, classify, score relevance, request approval,
   then save a source-backed note.
3. **Mailreef** — optional bounded message classification or response drafting
   after Mailreef's existing safety boundary; never replace its screening.
4. **Clawloop PR triage** — classify changed PR state and produce a structured
   next-action packet; never replace deterministic GitHub/CI checks.
5. **Release-note intake** — map changelog entries into affected capabilities,
   verification needs, and owner decisions.
6. **WatchCatfish findings** — convert structured health facts into a compact
   diagnosis packet while preserving deterministic health checks as authority.
7. **Project status distillation** — turn an append-only project log into a
   proposed STATUS update for human review.

## Success criteria

- A workflow is repeated enough to justify a durable contract.
- JSON handoffs are understandable and easy to inspect.
- Failure is explicit; malformed output never silently becomes an action.
- Side effects stay behind a clear approval boundary.
- The workflow is easier to maintain than equivalent ad hoc agent turns.

## Non-goals

- Replacing OpenClaw agents with a general workflow engine.
- Converting one-off tasks into ceremony.
- Adding model restrictions before an experiment demonstrates a need.
- Moving secrets or provider credentials into workflow files.
