# Status

## Phase

Exploration.

## Current state

- OpenClaw `llm-task` is enabled, plugin-allowed, tool-allowed, and live-loaded.
- No model allowlist or default model override is configured.
- A direct unconstrained JSON smoke succeeded through the agent's normal model
  route.
- The first project experiment is a three-stage fictional support-ticket flow.
- The live flow passed on 2026-10-13: triage, draft, and review each returned a
  JSON object, and the final review approved the draft with no concerns.
- Unit tests pass `3/3`; the latest generated artifact stays under ignored
  `artifacts/`.
- Public source is published at
  `https://github.com/clawSean/lobster-workflow-lab`.

## Known compatibility boundary

OpenClaw's embedded Lobster tool does not currently inject an authenticated
LLM adapter into workflow `pipeline:` steps. The project therefore proves
`llm-task` through Gateway `tools.invoke` first. Native embedded
Lobster-to-`llm-task` composition remains a separate experiment rather than a
claim.

## Next

Add one deterministic Lobster packaging/approval stage without touching
Mailreef or Clawloop.
