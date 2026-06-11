#!/usr/bin/env node
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function run(args) {
  const result = spawnSync(npmCommand, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}

console.log("Installing backend dependencies...");
run(["install"]);
console.log("Installing React frontend dependencies...");
run(["--prefix", "client", "install"]);
console.log("\nSetup complete. Run `npm run dev:local` and open http://localhost:5173/.");
