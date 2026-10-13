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
- Six research lanes now cover the current architecture, Lobster, `llm-task`,
  TaskFlow history/removal, composition patterns, and examples/inspiration.
- The canonical research entry point is `research/00-INDEX.md`; editable and
  rendered architecture diagrams live beside it.
- Current-version correction: TaskFlow was removed in OpenClaw `2026.9.7` and
  is not a third live tool. Its former responsibilities belong to native
  subagents, ACP, Automations/Cron, Lobster, hooks/webhooks, or project state.
- A reference-only rollout proposal now covers Gateway-restart interruption
  notices across channels. It starts with dry-run/JPop-only deterministic rules
  and evaluates Jev later through the separate decision-model contract.
- No restart hook, TypeSafe provider, notification sender, configuration, or
  outbound recovery notice has been activated by that proposal.

## Known compatibility boundary

OpenClaw's embedded Lobster tool does not currently inject an authenticated
LLM adapter into workflow `pipeline:` steps. The project therefore proves
`llm-task` through Gateway `tools.invoke` first. Native embedded
Lobster-to-`llm-task` composition remains a separate experiment rather than a
claim.

## Next

Harden the synthetic ticket flow with schemas and a deterministic package, then
add one Lobster approval/resume stage that writes only an ignored local artifact.
Do not touch Mailreef or Clawloop yet.
