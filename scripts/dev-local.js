#!/usr/bin/env node
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const client = path.join(root, "client");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function assertInstalled(folder, label) {
  if (!fs.existsSync(path.join(folder, "node_modules"))) {
    console.error(`\n${label} dependencies are missing.`);
    console.error("Run: npm run setup:local\n");
    process.exit(1);
  }
}

assertInstalled(root, "Backend");
assertInstalled(client, "React frontend");

const processes = [
  spawn(process.execPath, ["server.js"], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, PORT: process.env.PORT || "3000" },
  }),
  spawn(npmCommand, ["--prefix", "client", "run", "dev", "--", "--port", process.env.CLIENT_PORT || "5173"], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  }),
];

function shutdown(signal) {
  processes.forEach((child) => {
    if (!child.killed) child.kill(signal);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

processes.forEach((child) => {
  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      shutdown(signal || "SIGTERM");
      process.exit(code);
    }
  });
});
