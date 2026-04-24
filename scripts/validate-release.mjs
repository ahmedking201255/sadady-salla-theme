import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const themeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relPath) {
  return JSON.parse(readFileSync(resolve(themeRoot, relPath), "utf8").replace(/^\uFEFF/, ""));
}

function run(command, { allowFailure = false } = {}) {
  try {
    return execSync(command, {
      cwd: themeRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (allowFailure) {
      return String(error?.stdout || "").trim();
    }
    throw error;
  }
}

const pkg = readJson("package.json");
const twilight = readJson("twilight.json");
const failures = [];
const warnings = [];
const gitDir = resolve(themeRoot, ".git");

if (!existsSync(gitDir)) {
  failures.push("Theme git metadata (.git) is missing. Release preview/publish must run from the original git-linked workspace.");
}

if (!/^\d+\.\d+\.\d+$/.test(String(pkg.version || ""))) {
  failures.push(`package.json version is not semver: ${pkg.version || "<empty>"}`);
}

if (pkg.version !== twilight.version) {
  failures.push(`Version mismatch between package.json (${pkg.version}) and twilight.json (${twilight.version}).`);
}

const originUrl = run("git config --get remote.origin.url", { allowFailure: true });
if (!originUrl) {
  failures.push("Git origin remote is missing. Release checks must run from the linked Salla theme repository.");
} else if (twilight.repository && !originUrl.includes("sadady-salla-theme")) {
  failures.push(`Git origin (${originUrl}) does not look aligned with twilight repository (${twilight.repository}).`);
}

const localTag = run(`git tag -l ${pkg.version}`, { allowFailure: true });
if (localTag === pkg.version) {
  failures.push(`Local git tag ${pkg.version} already exists. Bump the version before releasing.`);
}

const remoteTag = run(`git ls-remote --tags origin refs/tags/${pkg.version}`, { allowFailure: true });
if (remoteTag) {
  failures.push(`Remote git tag ${pkg.version} already exists on origin. Bump the version before releasing.`);
}

const sallaStatePath = resolve(themeRoot, "node_modules", ".salla-cli");
if (existsSync(sallaStatePath)) {
  warnings.push("Local Salla CLI state file exists at node_modules/.salla-cli. Reset it before preview/publish if draft behavior looks stale.");
}

const dirtyState = run("git status --short", { allowFailure: true });
if (dirtyState) {
  warnings.push("Git working tree contains local changes. Tagging/publishing should happen from a reviewed clean state.");
}

if (warnings.length) {
  console.warn("Release validation warnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
}

if (failures.length) {
  console.error("Release validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Release validation passed for version ${pkg.version}.`);
