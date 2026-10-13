# Log

Append-only experiment log.

## 2026-10-13 — Project created

- Initiated by JPop from Telegram message `30388`.
- Enabled bundled `llm-task` in OpenClaw and added it to both plugin and tool
  allowlists.
- Live plugin reload applied at Gateway generation 5 with
  `restartRequired: false`.
- Unconstrained JSON smoke succeeded through `openai/gpt-6-sol` using the
  agent's normal route; this was observed proof, not a configured model pin.
- Created a public-safe synthetic support-ticket experiment as the first lab.
- Ran the three-stage experiment end to end. Triage classified the fictional
  issue as low-urgency shared-note synchronization; the draft avoided claiming
  a confirmed cause; the review returned `Approve` with no concerns.
- Unit tests passed `3/3`.
- Published the canonical project to
  `https://github.com/clawSean/lobster-workflow-lab`.

## 2026-10-13 — Research and architecture correction

- Ran six research lanes across official/current architecture, Lobster,
  `llm-task`, TaskFlow history, composition, and ecosystem inspiration.
- Added `research/00-INDEX.md` as the canonical entry point and linked it from
  the project README.
- Corrected the original three-tool mental model: OpenClaw `2026.9.7` removed
  Tasks/TaskFlow with no compatibility facade. The current buildable stack is
  Lobster + direct `llm-task`, surrounded by the appropriate native lifecycle
  owner rather than a replacement monolith.
- Used Claude Foreman to specify the diagram, then produced and visually checked
  standalone HTML, SVG, and PNG artifacts.
- Preserved the embedded bridge boundary: nested `llm-task` from embedded
  Lobster remains unsupported/unproven; direct Gateway invocation is proven.
- No packages, configuration, Gateway processes, or external systems changed.

## 2026-10-13 — Gateway restart recovery rollout documented

- Added a reference design for detecting probably interrupted human chats after
  Gateway startup and sending one deduplicated notice to the exact conversation.
- Defined a deterministic-first rollout: frozen fixtures, dry run, JPop-only
  delivery, explicit allowlists, then an optional model bakeoff.
- Corrected the model boundary: Jev is a strong typed Boolean/Choice candidate
  for ambiguous interruption judgments, but it belongs to OpenClaw's separate
  decision-model contract rather than serving as an `llm-task` completion model.
- Recorded the current availability boundary: `llm-task` is loaded, while the
  external TypeSafe provider is not installed and remains a future dependency.
- No hook, provider install, config change, Gateway restart, or outbound message
  was performed.
