import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function readTaskJson(response) {
  if (!response || response.ok !== true) {
    throw new Error(response?.error?.message ?? "llm-task invocation failed");
  }
  const value = response.output?.details?.json;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("llm-task returned no JSON object");
  }
  return value;
}

export async function invokeTask({ prompt, input, idempotencyKey }) {
  const params = {
    name: "llm-task",
    agentId: "mainelobster",
    idempotencyKey,
    args: {
      prompt,
      input,
      thinking: "low",
      maxTokens: 700,
      timeoutMs: 60000
    }
  };
  const { stdout } = await execFileAsync(
    process.env.OPENCLAW_BIN || "openclaw",
    [
      "gateway",
      "call",
      "tools.invoke",
      "--json",
      "--timeout",
      "75000",
      "--params",
      JSON.stringify(params)
    ],
    { cwd: projectRoot, maxBuffer: 4 * 1024 * 1024 }
  );
  return readTaskJson(JSON.parse(stdout));
}

export async function runTicketLab(ticket) {
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const triage = await invokeTask({
    idempotencyKey: `${runId}-triage`,
    prompt:
      "Return JSON only. Classify this fictional support ticket with useful keys such as category, urgency, summary, and recommendedAction. Do not contact anyone or take action.",
    input: ticket
  });
  const draft = await invokeTask({
    idempotencyKey: `${runId}-draft`,
    prompt:
      "Return JSON only. Draft a concise, friendly support reply for this fictional ticket. Include a subject and response. Do not claim that any action was actually taken.",
    input: { ticket, triage }
  });
  const review = await invokeTask({
    idempotencyKey: `${runId}-review`,
    prompt:
      "Return JSON only. Review this fictional support reply for clarity, unsupported claims, and risky instructions. Include a verdict and any concerns or revision you recommend.",
    input: { ticket, triage, draft }
  });
  return { runId, ticket, triage, draft, review };
}

async function main() {
  const fixturePath = path.join(projectRoot, "fixtures", "fictional-ticket.json");
  const ticket = JSON.parse(await readFile(fixturePath, "utf8"));
  const result = await runTicketLab(ticket);
  const artifactDir = path.join(projectRoot, "artifacts");
  await mkdir(artifactDir, { recursive: true });
  const artifactPath = path.join(artifactDir, "latest.json");
  await writeFile(artifactPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ ok: true, artifactPath, result }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
