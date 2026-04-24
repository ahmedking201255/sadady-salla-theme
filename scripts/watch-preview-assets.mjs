import { spawn } from "node:child_process";
import { existsSync, watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const themeRoot = path.resolve(__dirname, "..");
const assetsRoot = path.join(themeRoot, "assets");
const prepareScript = path.join(__dirname, "prepare-preview-assets.mjs");

let timer = null;
let running = false;
let rerunRequested = false;

function runPrepare() {
  if (running) {
    rerunRequested = true;
    return;
  }

  running = true;
  const child = spawn(process.execPath, [prepareScript], {
    cwd: themeRoot,
    stdio: "inherit",
  });

  child.on("exit", (code) => {
    running = false;
    if (code !== 0) {
      console.error(`Preview asset preparation failed with exit code ${code}.`);
    }
    if (rerunRequested) {
      rerunRequested = false;
      runPrepare();
    }
  });
}

function schedulePrepare() {
  clearTimeout(timer);
  timer = setTimeout(runPrepare, 120);
}

runPrepare();

if (existsSync(assetsRoot)) {
  watch(assetsRoot, { recursive: true }, schedulePrepare);
}

console.log(`Watching Sadady preview assets in ${assetsRoot}`);
