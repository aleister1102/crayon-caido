import { existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const rootDir = process.cwd();
const distDir = join(rootDir, "dist");
const outFile = join(distDir, "plugin_package.zip");

if (!existsSync(distDir)) {
  console.error("Crayon: dist/ not found. Run `npm run build` first.");
  process.exit(1);
}

if (existsSync(outFile)) {
  rmSync(outFile);
}

// Ensure the zip command is available.
try {
  execSync("zip -v", { stdio: "ignore" });
} catch (error) {
  console.error("Crayon: zip command not available on this system.");
  process.exit(1);
}

const filesToZip = [
  "manifest.json",
  "README.md",
  "dist/frontend/index.js",
  "dist/backend/index.js",
];

for (const file of filesToZip) {
  if (!existsSync(join(rootDir, file))) {
    console.error(`Crayon: missing required file: ${file}`);
    process.exit(1);
  }
}

const zipArgs = [
  "-r",
  outFile,
  ...filesToZip,
];

execSync(`zip ${zipArgs.map((arg) => `"${arg}"`).join(" ")}`, {
  stdio: "inherit",
});

console.log(`Crayon: created ${outFile}`);
