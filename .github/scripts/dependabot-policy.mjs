import assert from "node:assert/strict";
import { createHash } from "node:crypto";

export const REPOSITORY = "johan-eilertsen/react-leaflet-explorer";
export const REPOSITORY_ID = 1322969511;
export const REQUIRED_CHECKS = ["test", "Dependabot policy tests"];
export const isRepository = (v) => v?.full_name === REPOSITORY && v?.id === REPOSITORY_ID;
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
function validateOSV(response) {
  assert.ok(object(response) && Object.keys(response).length === 1 && Array.isArray(response.results)
    && response.results.length === 2, "Unknown OSV response");
  for (const row of response.results) {
    assert.ok(object(row) && Object.keys(row).every(k => k === "vulns"), "Invalid OSV result");
    if (row.vulns === undefined) continue;
    assert.ok(Array.isArray(row.vulns), "Invalid OSV vulnerabilities");
    for (const v of row.vulns) {
      // querybatch returns only minimal vulnerability IDs and modification times.
      assert.ok(object(v) && Object.keys(v).every(k => ["id", "modified"].includes(k))
        && typeof v.id === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]+$/.test(v.id)
        && typeof v.modified === "string" && /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:[.][0-9]{1,9})?Z$/.test(v.modified)
        && Number.isFinite(Date.parse(v.modified))
        && new Date(v.modified).toISOString().slice(0,10) === v.modified.slice(0,10), "Invalid OSV advisory");
    }
  }
}
const PACKAGE = "@types/leaflet";
const SHA = /^[0-9a-f]{40}$/;
const version = (value) => {
  assert.match(value, /^1\.9\.\d+$/, "Only exact @types/leaflet 1.9 patches qualify");
  return Number(value.split(".")[2]);
};

export function isNativeBot(pr, repository) {
  return repository === REPOSITORY && pr.user?.id === 49699333 && pr.user?.login === "dependabot[bot]" && pr.user?.type === "Bot"
    && isRepository(pr.head?.repo) && isRepository(pr.base?.repo);
}

export async function qualify({ pr, repository, files, before, after, registry, now = Date.now() }) {
  assert.ok(isNativeBot(pr, repository), "Not an internal native Dependabot PR");
  assert.equal(pr.state, "open");
  assert.equal(pr.draft, false);
  assert.equal(pr.base.ref, "main");
  assert.match(pr.head.ref, /^dependabot\/npm_and_yarn\//);
  assert.match(pr.head.sha, SHA);
  assert.match(pr.base.sha, SHA);
  assert.equal(pr.commits, 1);
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
    assert.ok(!release.deprecated && !release.bin && !release.main && !release.exports
      && !Object.hasOwn(release, "optionalDependencies") && !Object.hasOwn(release, "module")
      && !Object.hasOwn(release, "browser"));
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
  const security = await registry.advisories(PACKAGE, [old, next]);
  validateOSV(security);
  assert.equal((security.results[1].vulns ?? []).length, 0, "New full version has known OSV advisories");
  return { package: PACKAGE, from: old, to: next, head: pr.head.sha, base: pr.base.sha,
    previousAdvisories: (security.results[0].vulns ?? []).map(v => v.id) };
}

// REST supplies the signed payload; GraphQL binds its verified signature to GitHub.
export function qualifyHead(pr, commit, repository) {
  assert.ok(isNativeBot(pr, REPOSITORY));
  assert.equal(pr.commits, 1);
  assert.equal(commit.sha, pr.head.sha);
  assert.deepEqual(commit.parents.map(p => p.sha), [pr.base.sha]);
  assert.equal(commit.author?.login, "dependabot[bot]");
  assert.equal(commit.author?.type, "Bot");
  assert.equal(commit.author?.id, 49699333);
  assert.equal(commit.committer?.login, "web-flow");
  assert.equal(commit.committer?.id, 19864447);
  const v = commit.commit?.verification;
  assert.equal(v?.verified, true);
  assert.equal(v?.reason, "valid");
  assert.ok(v.signature?.startsWith("-----BEGIN PGP SIGNATURE-----") && v.payload?.includes("parent " + pr.base.sha + "\n"));
  assert.equal(repository?.databaseId, REPOSITORY_ID);
  assert.equal(repository?.nameWithOwner, REPOSITORY);
  const h = repository.object, signature = h?.signature;
  assert.equal(h?.oid, pr.head.sha);
  assert.equal(h?.author?.user?.login, "dependabot[bot]");
  assert.equal(h?.author?.user?.databaseId, 49699333);
  assert.equal(h?.parents?.totalCount, 1);
  assert.deepEqual(h.parents.nodes.map(p => p.oid), [pr.base.sha]);
  assert.equal(signature?.__typename, "GpgSignature");
  assert.equal(signature?.payload, v.payload);
  assert.equal(signature?.signature, v.signature);
  assert.equal(signature?.isValid, true);
  assert.equal(signature?.state, "VALID");
  assert.equal(signature?.wasSignedByGitHub, true);
  assert.equal(signature?.signer?.login, "web-flow");
  assert.equal(signature?.signer?.databaseId, 19864447);
}
