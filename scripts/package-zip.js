#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "release");
const zipName = "workyodha-mern-task-board.zip";
const zipPath = path.join(outDir, zipName);
const zipCommand = process.platform === "win32" ? "powershell.exe" : "zip";

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(zipPath)) fs.rmSync(zipPath);

let result;
if (process.platform === "win32") {
  result = spawnSync(
    zipCommand,
    [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path README.md,DOWNLOAD_AND_RUN.md,package.json,package-lock.json,server.js,__tests__,client,public,scripts,.env.example,.gitignore -DestinationPath ${JSON.stringify(zipPath)} -Force`,
    ],
    { cwd: root, stdio: "inherit" }
  );
} else {
  result = spawnSync(
    zipCommand,
    [
      "-r",
      zipPath,
      "README.md",
      "DOWNLOAD_AND_RUN.md",
      "package.json",
      "package-lock.json",
      "server.js",
      "__tests__",
      "client",
      "public",
      "scripts",
      ".env.example",
      ".gitignore",
      "-x",
      "*/node_modules/*",
      "*/dist/*",
      "*/.git/*",
      "release/*",
    ],
    { cwd: root, stdio: "inherit" }
  );
}

if (result.error && result.error.code === "ENOENT") {
  console.error("Could not create the zip: install `zip` or run this script on Windows with PowerShell.");
  process.exit(1);
}

if (result.status !== 0) process.exit(result.status || 1);
console.log(`\nCreated ${path.relative(root, zipPath)}`);
console.log("Share that file, unzip it, then run `npm run setup:local` and `npm run dev:local`.");
