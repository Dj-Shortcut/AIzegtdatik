import { mkdirSync, readFileSync, rmSync, writeFileSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = new URL("../", import.meta.url);
const DIST_DIR = new URL("../dist/release/", import.meta.url);
const PUBLIC_DIST_DIR = new URL("../dist/release/public/", import.meta.url);
const ARTIFACT_PATH = new URL("../dist/release/instant-game-upload.zip", import.meta.url);

function run(cmd, args, options = {}) {
  execFileSync(cmd, args, { stdio: "inherit", ...options });
}

function stripBlockComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "");
}

function minifyJs(inputPath, outputPath) {
  const source = readFileSync(inputPath, "utf8");
  const withoutBlocks = stripBlockComments(source);
  const compact = withoutBlocks
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  writeFileSync(outputPath, compact, "utf8");
}

function minifyCss(inputPath, outputPath) {
  const source = readFileSync(inputPath, "utf8");
  const compact = stripBlockComments(source)
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
  writeFileSync(outputPath, compact, "utf8");
}

function main() {
  rmSync(new URL("../dist", import.meta.url), { recursive: true, force: true });
  mkdirSync(DIST_DIR, { recursive: true });
  mkdirSync(PUBLIC_DIST_DIR, { recursive: true });

  run("node", ["scripts/validate-fbapp-config.mjs"], { cwd: ROOT });

  copyFileSync(new URL("../public/index.html", import.meta.url), new URL("index.html", PUBLIC_DIST_DIR));
  minifyJs(new URL("../public/app.js", import.meta.url), new URL("app.js", PUBLIC_DIST_DIR));
  minifyCss(new URL("../public/styles.css", import.meta.url), new URL("styles.css", PUBLIC_DIST_DIR));
  copyFileSync(new URL("../fbapp-config.json", import.meta.url), new URL("fbapp-config.json", DIST_DIR));

  run("zip", ["-r", "instant-game-upload.zip", "public", "fbapp-config.json"], { cwd: DIST_DIR });

  console.log(`✔ Release artifact created: ${ARTIFACT_PATH.pathname}`);
}

main();
