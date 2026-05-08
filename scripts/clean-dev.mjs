// Kill stale `next dev` workers before (re)starting the dev server.
// Why: pnpm runs scripts through a cmd.exe shim on Windows; Ctrl+C kills the
// shim but leaves `next dev` and its start-server.js worker alive, holding
// handles on .next/trace, .next/cache/*, and .next/_events_*.json. The next
// `pnpm dev` then hits EPERM trying to unlink/rename those files.
//
// Pass --force to also remove .next/ (manual recovery, used by `pnpm clean:next`).
// The ws-server is intentionally left alone — it has a different command line.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const projectRootLower = projectRoot.toLowerCase();
const force = process.argv.includes("--force");

if (process.platform !== "win32") {
  if (force) {
    fs.rmSync(path.join(projectRoot, ".next"), {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  }
  process.exit(0);
}

const ps = spawnSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress",
  ],
  { encoding: "utf8" },
);

if (ps.status !== 0) {
  console.error("[clean-dev] process query failed; skipping cleanup");
  process.exit(0);
}

let procs = [];
const raw = ps.stdout.trim();
if (raw) {
  try {
    const parsed = JSON.parse(raw);
    procs = Array.isArray(parsed) ? parsed : [parsed];
  } catch (err) {
    console.error("[clean-dev] could not parse process list:", err.message);
    process.exit(0);
  }
}

const killed = [];
for (const p of procs) {
  const cmd = String(p.CommandLine || "").toLowerCase();
  if (!cmd.includes(projectRootLower)) continue;
  const isNextDev =
    cmd.includes("\\next\\dist\\bin\\next") ||
    cmd.includes("start-server.js");
  if (!isNextDev) continue;
  try {
    process.kill(p.ProcessId, "SIGKILL");
    killed.push(p.ProcessId);
  } catch (err) {
    if (err.code !== "ESRCH") {
      console.error(
        `[clean-dev] could not kill PID ${p.ProcessId}: ${err.message}`,
      );
    }
  }
}

if (killed.length) {
  console.log(`[clean-dev] killed stale next dev workers: ${killed.join(", ")}`);
}

if (force) {
  const dotNext = path.join(projectRoot, ".next");
  try {
    fs.rmSync(dotNext, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
    console.log("[clean-dev] removed .next/");
  } catch (err) {
    console.error(`[clean-dev] could not remove .next/: ${err.message}`);
    process.exit(1);
  }
}
