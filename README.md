# Lobster Workflow Lab

[![OpenClaw](https://img.shields.io/badge/OpenClaw-2026.9.7-crimson)](https://docs.openclaw.ai)
[![Status](https://img.shields.io/badge/status-experimental-orange)](STATUS.md)

Small, synthetic experiments for learning where OpenClaw's `lobster` and
`llm-task` tools improve repeatable workflows.

The first experiment chains three isolated JSON-only `llm-task` calls over a
fictional support ticket:

1. classify the ticket;
2. draft a response;
3. review the draft.

It deliberately does **not** pin a model or require a JSON Schema. The live
OpenClaw agent route chooses the model, and each stage only asks for JSON.

## Run

```bash
npm test
npm run ticket-lab
```

Generated runs are written beneath `artifacts/` and excluded from Git.

## Boundaries

- Synthetic/public-safe inputs only while this is an experiment.
- No outbound messages, account writes, or production mutations.
- Mailreef and Clawloop are candidate applications, not test subjects yet.
- Embedded Lobster-to-`llm-task` composition remains a separate compatibility
  experiment; the first workflow proves `llm-task` directly through the
  Gateway's normal tool-policy path.

See [VISION.md](VISION.md) for candidate applications and [STATUS.md](STATUS.md)
for current proof.

## Research pack

The durable research corpus now lives at [research/00-INDEX.md](research/00-INDEX.md).
It includes six detailed reports plus editable HTML/SVG and rendered PNG
architecture diagrams.

One important correction: **TaskFlow is historical, not a current third tool.**
OpenClaw `2026.9.7` removed the shared Tasks/TaskFlow runtime and APIs. The
current stack is Lobster + direct `llm-task`, with native subagents, ACP,
Automations, hooks, or project-owned state handling the surrounding lifecycle.
