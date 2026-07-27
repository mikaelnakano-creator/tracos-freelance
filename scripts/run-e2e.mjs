import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3125";
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const playwrightCli = path.join(root, "node_modules", "playwright", "cli.js");

function runNode(args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Command failed with code ${code ?? signal}`));
    });
  });
}

function startServer() {
  return spawn(
    process.execPath,
    [nextCli, "start", "--hostname", "127.0.0.1", "--port", "3125"],
    {
      cwd: root,
      env: {
        ...process.env,
        NEXT_PUBLIC_APP_URL: baseURL,
        NEXT_PUBLIC_TRACOS_ENABLE_DEMO: "true",
        TRACOS_ENABLE_DEMO: "true",
      },
      stdio: "inherit",
    },
  );
}

async function waitForServer(server, timeoutMs = 120_000) {
  const startedAt = Date.now();
  let earlyExit = false;
  server.once("exit", () => {
    earlyExit = true;
  });

  while (Date.now() - startedAt < timeoutMs) {
    if (earlyExit) {
      throw new Error("Next server exited before becoming ready.");
    }

    try {
      const response = await fetch(baseURL, { cache: "no-store" });
      if (response.ok || response.status === 307 || response.status === 308) {
        return;
      }
    } catch {
      // Keep polling until the production server opens the port.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${baseURL}`);
}

function stopServer(server) {
  return new Promise((resolve) => {
    if (!server.pid || server.exitCode !== null) {
      resolve();
      return;
    }

    if (process.platform === "win32") {
      const killer = spawn(
        "taskkill",
        ["/pid", String(server.pid), "/t", "/f"],
        {
          stdio: "ignore",
        },
      );
      killer.on("exit", resolve);
      setTimeout(resolve, 5000).unref();
      return;
    }

    server.kill("SIGTERM");
    server.once("exit", resolve);
    setTimeout(resolve, 5000).unref();
  });
}

let server;
let exitCode = 0;

try {
  await runNode([nextCli, "build"], {
    NEXT_PUBLIC_TRACOS_ENABLE_DEMO: "true",
    TRACOS_ENABLE_DEMO: "true",
  });
  server = startServer();
  await waitForServer(server);
  await runNode([playwrightCli, "test"], { PLAYWRIGHT_BASE_URL: baseURL });
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  if (server) {
    await Promise.race([
      stopServer(server),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  }
}

process.exit(exitCode);
