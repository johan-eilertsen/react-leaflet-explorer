import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "vite";

const root = resolve(".");
const staging = mkdtempSync(join(tmpdir(), "leaflet-browser-package-"));
process.on("exit", () => rmSync(staging, { recursive: true, force: true }));

// Test the exact files npm would distribute, using installed peer dependencies.
// No published version or neighboring application participates in resolution.
const [{ filename }] = JSON.parse(execFileSync("npm", [
  "pack", "--ignore-scripts", "--json", "--pack-destination", staging,
], { cwd: root, encoding: "utf8" }));
execFileSync("tar", ["-xzf", join(staging, filename), "-C", staging]);
const modules = join(staging, "node_modules");
mkdirSync(modules);
renameSync(join(staging, "package"), join(modules, "react-leaflet-explorer"));
for (const dependency of readdirSync(join(root, "node_modules"))) {
  if (dependency.startsWith(".") || dependency === "react-leaflet-explorer") continue;
  symlinkSync(join(root, "node_modules", dependency), join(modules, dependency), "dir");
}
const fixture = join(staging, "browser");
mkdirSync(fixture);
for (const file of ["index.html", "main.tsx"]) {
  copyFileSync(join(root, "tests/browser", file), join(fixture, file));
}

const server = await createServer({
  configFile: false,
  root: fixture,
  cacheDir: join(staging, "vite-cache"),
  resolve: {
    dedupe: ["react", "react-dom", "leaflet"],
  },
  server: { host: "127.0.0.1", port: 3112, strictPort: true, fs: { allow: [root, staging] } },
});
await server.listen();
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => { await server.close(); process.exit(0); });
}
