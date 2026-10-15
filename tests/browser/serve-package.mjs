import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
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
symlinkSync(join(root, "node_modules"), join(staging, "package", "node_modules"), "dir");

const server = await createServer({
  configFile: false,
  root: join(root, "tests/browser"),
  cacheDir: join(staging, "vite-cache"),
  resolve: {
    dedupe: ["react", "react-dom", "leaflet"],
    alias: [
      { find: /^react-leaflet-explorer$/, replacement: join(staging, "package/dist/index.js") },
      { find: "react-leaflet-explorer/styles.css", replacement: join(staging, "package/dist/styles.css") },
    ],
  },
  server: { host: "127.0.0.1", port: 3112, strictPort: true, fs: { allow: [root, staging] } },
});
await server.listen();
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => { await server.close(); process.exit(0); });
}
