import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const STATUS = "Dependabot qualification";
export const REQUIRED_CHECKS = ["test", "Dependabot policy tests", STATUS];
const PACKAGE = "@types/leaflet";
const SHA = /^[0-9a-f]{40}$/;
const version = (value) => {
  assert.match(value, /^1\.9\.\d+$/, "Only exact @types/leaflet 1.9 patches qualify");
  return Number(value.split(".")[2]);
};

export function isNativeBot(pr, repository) {
  return pr.user?.login === "dependabot[bot]" && pr.user?.type === "Bot"
    && pr.head?.repo?.full_name === repository && pr.base?.repo?.full_name === repository;
}

export async function qualify({ pr, repository, files, before, after, registry, now = Date.now() }) {
  assert.ok(isNativeBot(pr, repository), "Not an internal native Dependabot PR");
  assert.equal(pr.state, "open");
  assert.equal(pr.draft, false);
  assert.equal(pr.base.ref, "main");
  assert.match(pr.head.ref, /^dependabot\/npm_and_yarn\//);
  assert.match(pr.head.sha, SHA);
  assert.match(pr.base.sha, SHA);
  assert.equal(pr.changed_files, 2);
  assert.deepEqual(files.map((f) => [f.filename, f.status]).sort(),
    [["package-lock.json", "modified"], ["package.json", "modified"]]);
  const a = before.manifest, b = after.manifest;
  const old = a.devDependencies?.[PACKAGE], next = b.devDependencies?.[PACKAGE];
  assert.ok(typeof old === "string" && typeof next === "string");
  assert.ok(version(next) > version(old), "No downgrade, minor, major or unchanged update");
  const expectedManifest = structuredClone(a);
  expectedManifest.devDependencies[PACKAGE] = next;
  assert.deepEqual(b, expectedManifest, "Only the allowlisted devDependency may change");
  assert.equal(before.lock.lockfileVersion, 3);
  assert.equal(after.lock.lockfileVersion, 3);
  const expectedLock = structuredClone(before.lock);
  assert.equal(expectedLock.packages[""].devDependencies[PACKAGE], old);
  expectedLock.packages[""].devDependencies[PACKAGE] = next;
  const path = "node_modules/" + PACKAGE;
  const oldEntry = before.lock.packages[path], newEntry = after.lock.packages[path];
  assert.ok(oldEntry && newEntry, "No added or removed lock entries");
  assert.equal(oldEntry.version, old);
  assert.equal(newEntry.version, next);
  assert.equal(oldEntry.dev, true);
  assert.equal(newEntry.dev, true);
  expectedLock.packages[path] = { ...oldEntry, version: next,
    resolved: newEntry.resolved, integrity: newEntry.integrity };
  assert.deepEqual(after.lock, expectedLock, "No transitive or other lock metadata changes");
  const metadata = await registry.package(PACKAGE);
  assert.equal(metadata.name, PACKAGE);
  const published = Date.parse(metadata.time?.[next]);
  assert.ok(Number.isFinite(published) && now - published >= 3 * 86400000,
    "New full version must be published for at least three days");
  for (const entry of [oldEntry, newEntry]) {
    const release = metadata.versions?.[entry.version];
    assert.ok(release, "Unknown registry full version");
    assert.equal(release.name, PACKAGE);
    assert.equal(release.version, entry.version);
    assert.ok(!release.deprecated && !release.bin && !release.main && !release.exports);
    assert.equal(Object.keys(release.scripts ?? {}).length, 0, "Package scripts are not qualified");
    assert.ok(typeof release.types === "string" && release.types.endsWith(".d.ts"));
    assert.deepEqual(release.dependencies ?? {}, entry.dependencies ?? {});
    const url = "https://registry.npmjs.org/@types/leaflet/-/leaflet-" + entry.version + ".tgz";
    assert.equal(entry.resolved, url, "Only canonical npm tarballs qualify");
    assert.equal(release.dist?.tarball, url);
    assert.match(entry.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/);
    assert.equal(release.dist.integrity, entry.integrity);
    const bytes = await registry.tarball(url);
    assert.ok(bytes.length > 0 && bytes.length <= 2 * 1024 * 1024);
    assert.equal("sha512-" + createHash("sha512").update(bytes).digest("base64"), entry.integrity,
      "Actual tarball must match registry and lock SHA512");
  }
  assert.deepEqual(metadata.versions[old].dependencies ?? {}, metadata.versions[next].dependencies ?? {},
    "Dependency ranges must remain unchanged");
  assert.deepEqual(metadata.versions[old].peerDependencies ?? {}, metadata.versions[next].peerDependencies ?? {});
  return { package: PACKAGE, from: old, to: next, head: pr.head.sha, base: pr.base.sha };
}
