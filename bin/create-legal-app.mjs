#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const projectName = args[0];

if (!projectName) {
  console.error("Please specify a project name:");
  console.error("  bunx create-legal-app my-app");
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), projectName);

if (fs.existsSync(targetDir)) {
  console.error(`Error: Directory "${projectName}" already exists.`);
  process.exit(1);
}

console.log(`\nCreating a new legal app in ${targetDir}...\n`);

// Copy template files (everything except bin, node_modules, .git, etc.)
const templateDir = path.resolve(__dirname, "..");
const excludeDirs = ["node_modules", ".git", "bin", ".next", "bun.lockb", "bun.lock"];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (excludeDirs.includes(entry.name)) continue;

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(templateDir, targetDir);

// Update package.json with new project name and remove CLI-specific fields
const pkgPath = path.join(targetDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
pkg.name = projectName;
pkg.version = "0.1.0";
delete pkg.bin;
delete pkg.files;
pkg.private = true;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// Detect package manager
const userAgent = process.env.npm_config_user_agent || "";
let packageManager = "npm";
if (userAgent.includes("bun")) {
  packageManager = "bun";
} else if (userAgent.includes("yarn")) {
  packageManager = "yarn";
} else if (userAgent.includes("pnpm")) {
  packageManager = "pnpm";
}

// Install dependencies
console.log("Installing dependencies...\n");
try {
  execSync(`${packageManager} install`, { cwd: targetDir, stdio: "inherit" });
} catch {
  console.log("\nCouldn't auto-install dependencies. Run install manually.");
}

// Done!
console.log(`
Success! Created ${projectName} at ${targetDir}

Inside that directory, you can run:

  ${packageManager}${packageManager === "npm" ? " run" : ""} dev
    Starts the development server.

  ${packageManager}${packageManager === "npm" ? " run" : ""} build
    Builds the app for production.

Get started by running:

  cd ${projectName}
  ${packageManager}${packageManager === "npm" ? " run" : ""} dev

Happy hacking!
`);
