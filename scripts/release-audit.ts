/** Production-only release evidence. Run after npm run build; never enables test hooks. */
import { chromium } from "@playwright/test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { habitats, discoveries } from "../content/catalog";
const dir = "artifacts/release";
mkdirSync(dir, { recursive: true });
const sha = (data: Buffer | string) =>
  createHash("sha256").update(data).digest("hex");
const write = (name: string, data: unknown) =>
  writeFileSync(`${dir}/${name}.json`, JSON.stringify(data, null, 2) + "\n");
const secretValues = Object.entries(process.env)
  .filter(
    ([key, value]) =>
      /KEY|TOKEN|SECRET|PASSWORD/.test(key) && value && value.length >= 12,
  )
  .map(([, value]) => value!);
if (existsSync(".env"))
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const match = line.match(
      /^\s*(?:export\s+)?([A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD)[A-Z0-9_]*)\s*=\s*(.+)\s*$/,
    );
    if (match) {
      const value = match[2].trim().replace(/^['"]|['"]$/g, "");
      if (value.length >= 12) secretValues.push(value);
    }
  }
const redact = (text: string) =>
  secretValues
    .reduce((s, value) => s.replaceAll(value, "[REDACTED]"), text)
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, "[REDACTED KEY]");
function install() {
  const temp = mkdtempSync(path.join(os.tmpdir(), "mermaidia-clean-install-"));
  const start = Date.now();
  const report: any = {
    date: new Date().toISOString(),
    node: process.version,
    npm: spawnSync("npm", ["--version"], { encoding: "utf8" }).stdout.trim(),
    isolatedDirectory: temp,
    lockfileSha256: sha(readFileSync("package-lock.json")),
    copiedFiles: ["package.json", "package-lock.json"],
    npmCache:
      "Existing npm download cache allowed; isolated node_modules starts absent.",
    command: "npm ci --no-audit --no-fund",
    exitCode: null,
  };
  try {
    for (const name of report.copiedFiles) cpSync(name, path.join(temp, name));
    report.nodeModulesAbsentBefore = !existsSync(
      path.join(temp, "node_modules"),
    );
    const result = spawnSync("npm", ["ci", "--no-audit", "--no-fund"], {
      cwd: temp,
      encoding: "utf8",
      timeout: 300000,
      maxBuffer: 8 * 1024 * 1024,
    });
    report.exitCode = result.status;
    report.durationMs = Date.now() - start;
    report.error = result.error?.message;
    writeFileSync(
      `${dir}/npm-ci.log`,
      redact((result.stdout ?? "") + (result.stderr ?? "")),
    );
    const probes = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        "import {createRequire} from 'node:module';const r=createRequire(process.cwd()+'/package.json');console.log(JSON.stringify(['react','three','openai','vite','typescript','@playwright/test'].map(name=>({name,resolved:!!r.resolve(name)}))))",
      ],
      { cwd: temp, encoding: "utf8" },
    );
    report.dependencyResolution = {
      exitCode: probes.status,
      results:
        probes.status === 0 ? JSON.parse(probes.stdout) : redact(probes.stderr),
    };
    report.executableChecks = ["esbuild", "vite", "tsc"].map((name) => {
      const check = spawnSync(
        path.join(temp, "node_modules", ".bin", name),
        ["--version"],
        { cwd: temp, encoding: "utf8" },
      );
      return {
        name,
        exitCode: check.status,
        version: redact(check.stdout.trim()),
        stderr: redact(check.stderr.trim()),
      };
    });
    report.lockfileUnchanged =
      sha(readFileSync(path.join(temp, "package-lock.json"))) ===
      report.lockfileSha256;
    report.pass =
      result.status === 0 &&
      probes.status === 0 &&
      report.executableChecks.every((check: any) => check.exitCode === 0) &&
      report.nodeModulesAbsentBefore &&
      report.lockfileUnchanged;
  } finally {
    rmSync(temp, { recursive: true, force: true });
    report.tempDirectoryRemoved = true;
    write("clean-install", report);
  }
  return report.pass;
}
if (process.argv.includes("--install-only")) {
  process.exitCode = install() ? 0 : 1;
} else {
  if (!process.argv.includes("--skip-install") && !install())
    throw Error("Clean install rehearsal failed");
  if (!existsSync("dist/client/index.html"))
    throw Error("Run npm run build before production audit");
  function files(root: string): string[] {
    return readdirSync(root).flatMap((name) => {
      const p = path.join(root, name);
      return statSync(p).isDirectory() ? files(p) : [p];
    });
  }
  const clientFiles = files("dist/client");
  const codeFiles = clientFiles.filter((p) =>
    /\.(?:js|html|css|json|map)$/.test(p),
  );
  const findings = codeFiles.map((file) => {
    const text = readFileSync(file, "utf8");
    return {
      file,
      credentialLikeStrings: (text.match(/sk-[a-zA-Z0-9_-]{20,}/g) || [])
        .length,
      knownEnvironmentSecretPresent: secretValues.some((value) =>
        text.includes(value),
      ),
      testHookAssignments: (
        text.match(/(?:\.__mermaidia|\[\s*["']__mermaidia["']\s*\])\s*=/g) || []
      ).length,
      testHookNameOccurrences: (text.match(/__mermaidia/g) || []).length,
    };
  });
  const staticAudit = {
    date: new Date().toISOString(),
    clientCodeFiles: codeFiles.length,
    buildFiles: codeFiles.map((file) => ({
      file,
      sha256: sha(readFileSync(file)),
      bytes: statSync(file).size,
    })),
    findings: findings.filter(
      (f) =>
        f.credentialLikeStrings ||
        f.knownEnvironmentSecretPresent ||
        f.testHookNameOccurrences,
    ),
    dotenvFiles: clientFiles.filter((p) => /(?:^|\/)\.env(?:\.|$)/.test(p)),
    sourceMaps: clientFiles.filter((p) => p.endsWith(".map")),
    secretScanScope:
      "Known environment secret values (never logged), sk- credential-shaped strings, dotenv filenames and explicit test-hook assignments in shipped client files. This is not a proof against all possible secret formats.",
    pass:
      findings.every(
        (f) =>
          !f.credentialLikeStrings &&
          !f.knownEnvironmentSecretPresent &&
          !f.testHookAssignments,
      ) && !clientFiles.some((p) => /(?:^|\/)\.env(?:\.|$)/.test(p)),
  };
  write("production-static", staticAudit);
  const port = Number(process.env.RELEASE_AUDIT_PORT || 5182),
    base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["dist/server/index.js"], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      // Benchmark local loading without opening a paid synthetic ASR session.
      // Keep the configured key available for verified preferred narration.
      ALLOW_ADULT_VOICE_DEV: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverLog = "";
  server.stdout.on("data", (v) => {
    serverLog += v;
  });
  server.stderr.on("data", (v) => {
    serverLog += v;
  });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  const report: any = {
    date: new Date().toISOString(),
    production: true,
    build: staticAudit.buildFiles,
    hardware: os.cpus()[0]?.model,
    platform: `${os.platform()} ${os.release()}`,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    network: {
      protocol: "Chrome DevTools Protocol Network.emulateNetworkConditions",
      downloadMbps: 20,
      uploadMbps: 20,
      latencyMs: 80,
      cacheDisabled: true,
      serviceWorkersBlocked: true,
    },
    destinations: [],
    errors: [],
    failedRequests: [],
    finished: false,
  };
  try {
    const serverStart = Date.now();
    while (Date.now() - serverStart < 15000) {
      try {
        if ((await fetch(`${base}/api/health`)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    browser = await chromium.launch({
      channel: "chrome",
      headless: false,
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
      ],
    });
    report.browser = browser.version();
    report.microphone =
      "Synthetic Chromium device; permission granted locally for the default probe. Audit child server forces ALLOW_ADULT_VOICE_DEV=false, preventing cloud recognition sessions. Configured key remains available for preferred narration; live speech is verified separately.";
    const context = await browser.newContext({
      viewport: report.viewport,
      deviceScaleFactor: 1,
      serviceWorkers: "block",
      permissions: ["microphone"],
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => report.errors.push(error.message));
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 80,
      downloadThroughput: 20_000_000 / 8,
      uploadThroughput: 20_000_000 / 8,
      connectionType: "cellular4g",
    });
    type Transfer = {
      requestId: string;
      url: string;
      startedAt: number;
      finishedAt?: number;
      encodedBytes?: number;
      status?: number;
      mimeType?: string;
      contentEncoding?: string;
      fromCache?: boolean;
    };
    const transfers = new Map<string, Transfer>();
    cdp.on("Network.requestWillBeSent", (e) => {
      transfers.set(e.requestId, {
        requestId: e.requestId,
        url: e.request.url,
        startedAt: Date.now(),
      });
    });
    cdp.on("Network.responseReceived", (e) => {
      const r = transfers.get(e.requestId);
      if (r) {
        r.status = e.response.status;
        r.mimeType = e.response.mimeType;
        r.contentEncoding = String(
          e.response.headers["Content-Encoding"] ||
            e.response.headers["content-encoding"] ||
            "identity",
        );
        r.fromCache =
          !!e.response.fromDiskCache ||
          !!e.response.fromPrefetchCache ||
          !!e.response.fromServiceWorker;
      }
    });
    cdp.on("Network.loadingFinished", (e) => {
      const r = transfers.get(e.requestId);
      if (r) {
        r.encodedBytes = e.encodedDataLength;
        r.finishedAt = Date.now();
      }
    });
    cdp.on("Network.loadingFailed", (e) => {
      report.failedRequests.push({
        url: transfers.get(e.requestId)?.url,
        error: e.errorText,
        canceled: e.canceled,
      });
    });
    const initialStart = Date.now();
    await page.goto(base, { waitUntil: "networkidle" });
    report.mapReadyMs = Date.now() - initialStart;
    report.mapDestinationNames = await page
      .locator(".destination h2")
      .allTextContents();
    report.expectedMapDestinationNames = habitats.map((h) => h.name);
    report.mapDestinationsPass =
      report.mapDestinationNames.length === 5 &&
      report.mapDestinationNames.every(
        (name: string, index: number) =>
          name === report.expectedMapDestinationNames[index],
      );
    if (!report.mapDestinationsPass)
      throw Error(
        "Production menu must list all five exact destination names in catalog order",
      );
    report.mapModelsRequested = [...transfers.values()]
      .filter((r) => r.url.includes("/assets/models/"))
      .map((r) => r.url);
    report.mapBytes = [...transfers.values()].reduce(
      (n, r) => n + (r.encodedBytes ?? 0),
      0,
    );
    let previousEnd = 0;
    for (const [index, h] of habitats.entries()) {
      if (index > 0) {
        await page
          .getByRole("button", { name: "Ocean map", exact: true })
          .click();
        await page.locator(".destination").first().waitFor();
      }
      const start = Date.now();
      await page.locator(".destination").filter({ hasText: h.name }).click();
      await page.getByRole("button", { name: "Start swimming" }).click();
      const clickTime = Date.now();
      await page.locator(".world canvas").waitFor({ state: "visible" });
      const loadingVisible = await page.locator(".loading").isVisible();
      await page
        .locator(".loading")
        .waitFor({ state: "hidden", timeout: 60000 });
      const playableTime = Date.now();
      await page.waitForLoadState("networkidle");
      const current = [...transfers.values()].filter(
        (r) => r.startedAt >= previousEnd,
      );
      const models = current
        .filter((r) => r.url.includes("/assets/models/"))
        .map((r) => path.basename(new URL(r.url).pathname, ".glb"));
      const allowed = new Set([
        "elise",
        "reef-kit",
        ...h.allowedDiscoveryIds.map(
          (id) => discoveries.find((d) => d.id === id)!.assetId,
        ),
      ]);
      const unexpectedModels = models.filter((id) => !allowed.has(id));
      const hookType = await page.evaluate(
        () => typeof (window as any).__mermaidia,
      );
      const bytes = current.reduce((n, r) => n + (r.encodedBytes ?? 0), 0);
      const result = {
        id: h.id,
        name: h.name,
        loadingVisible,
        fromDestinationClickMs: playableTime - start,
        fromStartSwimmingClickMs: playableTime - clickTime,
        fromInitialNavigationMs:
          index === 0 ? playableTime - initialStart : undefined,
        networkSettledMs: Date.now() - start,
        encodedTransferBytes: bytes,
        decimalMB: bytes / 1_000_000,
        byteBudget: index === 0 ? 15_000_000 : 25_000_000,
        byteBudgetPass: bytes <= (index === 0 ? 15_000_000 : 25_000_000),
        firstLoadTargetPass:
          index === 0 ? playableTime - initialStart <= 10000 : undefined,
        hookType,
        modelNames: models,
        unexpectedModels,
        requests: current,
      };
      report.destinations.push(result);
      previousEnd = Date.now();
      write("network", report);
      await page.screenshot({ path: `${dir}/production-${h.id}.png` });
    }
    report.runtimeHooksAbsent = report.destinations.every(
      (d: any) => d.hookType === "undefined",
    );
    report.lazyModelsPass =
      report.mapModelsRequested.length === 0 &&
      report.destinations.every((d: any) => d.unexpectedModels.length === 0);
    report.externalRequests = [...transfers.values()].filter(
      (r) => !r.url.startsWith(base),
    );
    report.serverPaths = [];
    for (const endpoint of ["/.env", "/server/voice.ts", "/package.json"]) {
      const res = await fetch(base + endpoint);
      const text = await res.text();
      report.serverPaths.push({
        endpoint,
        status: res.status,
        contentType: res.headers.get("content-type"),
        isAppShell: text.includes('<div id="root">'),
        knownSecretPresent: secretValues.some((secret) =>
          text.includes(secret),
        ),
        serverSourceExposed:
          text.includes("registerVoiceRoutes") ||
          text.includes("OPENAI_API_KEY="),
      });
    }
    report.pass =
      staticAudit.pass &&
      report.mapDestinationsPass &&
      report.runtimeHooksAbsent &&
      report.lazyModelsPass &&
      report.destinations.every((d: any) => d.byteBudgetPass) &&
      report.destinations[0].firstLoadTargetPass &&
      !report.errors.length &&
      !report.failedRequests.some((r: any) => !r.canceled) &&
      report.serverPaths.every(
        (r: any) => !r.knownSecretPresent && !r.serverSourceExposed,
      );
    report.finished = true;
  } catch (error) {
    report.failure = redact(
      error instanceof Error ? (error.stack ?? error.message) : String(error),
    );
    report.pass = false;
  } finally {
    await browser?.close();
    server.kill("SIGTERM");
    writeFileSync(`${dir}/server.log`, redact(serverLog));
    write("network", report);
  }
  console.log(
    JSON.stringify(
      {
        staticPass: staticAudit.pass,
        networkPass: report.pass,
        destinations: report.destinations.map((d: any) => ({
          id: d.id,
          MB: d.decimalMB,
          loadMs: d.fromDestinationClickMs,
          hookType: d.hookType,
        })),
        failure: report.failure,
      },
      null,
      2,
    ),
  );
  if (!report.pass) process.exitCode = 1;
}
