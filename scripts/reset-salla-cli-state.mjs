import { existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const themeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const statePath = resolve(themeRoot, "node_modules", ".salla-cli");

if (!existsSync(statePath)) {
  console.log("No local Salla CLI state file was found.");
  process.exit(0);
}

rmSync(statePath, { force: true });
console.log("Removed local Salla CLI state file: node_modules/.salla-cli");
