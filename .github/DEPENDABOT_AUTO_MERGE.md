# Narrow native Dependabot pilot

Only an existing, exactly pinned devDependencies.@types/leaflet patch within
1.9.x can qualify. Exactly two modified files: package.json and package-lock.json.
No scripts, runtime/peer dependencies, version, CI, rights, release, data, auth,
transitive entries or unrelated lock metadata may change. Both old and new full
versions must exist in the public npm registry; the new version must be at least
three days old. Canonical registry URLs and SHA512 are compared with the lock,
and both actual tarballs are downloaded and hashed. Scripts, executables,
runtime entries, deprecation and changed dependency/peer ranges disqualify the
package. Both full versions are queried against OSV, and the new one must have
no known advisories. Failed or unknown advisory responses fail closed. A separate
native Dependabot group prevents type patches being bundled with unrelated updates.
Errors and unknown input fail closed.

The read-only inspection checks out the exact trusted base policy, never the PR
head. It reads immutable GitHub source snapshots and public registry artifacts;
it installs nothing and executes no PR code. A separate write job has no
checkout, package installation, cache or artifact consumption. It reads fresh
GitHub metadata, posts a required Dependabot qualification commit status on the
PR head SHA, and requests native auto-merge with expectedHeadOid only for a
qualified native bot PR. Rejected bot heads get a failing status and any existing
auto-merge request is disabled. Human PRs get a manual status, never an automatic
merge request. CI runs normal library, build and packed Chrome tests with a
read-only token; the policy's positive/negative tests run separately.

Activation requires repository auto-merge plus native main branch protection:
strict=true, administrator enforcement, and required checks test,
Dependabot policy tests, Dependabot qualification, all bound to GitHub Actions
app15368. The arm job checks these effective settings again. Fresh base identity
is checked before mutation; native strict checks prevent an old base from landing
after a race. No bypass, polling service or custom merger is used.
workflow_dispatch can requalify a real existing PR; it cannot nominate an
arbitrary SHA, package, policy or repository.

The source bootstrap is independently reviewed and tested before activation.
The existing publish workflow remains unchanged: development updates keep package
version0.6.0, whose existing registry version causes npm publication to be skipped.
This pilot does not publish packages or promote any consumer. If main's policy
changes, requalify from its new trusted base. Broader type profiles, minor/major
and runtime upgrades require a separate reviewed change; no security-major
exception exists. Central coverage work is not copied into this public repository.

Recovery: turn repository auto-merge off, disable outstanding bot auto-merge
requests, and preserve required checks while inspecting the failure. Restore
settings only against captured pre-activation state; never bypass a gate.
