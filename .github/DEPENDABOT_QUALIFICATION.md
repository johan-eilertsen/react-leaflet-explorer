# Read-only Dependabot qualification

## Qualification

Only an existing, exactly pinned devDependencies.@types/leaflet patch within
1.9.x can qualify. Exactly two modified files: package.json and package-lock.json.
No scripts, runtime/peer dependencies, package version, CI, rights, release, data,
auth, transitive entries or unrelated lock metadata may change. Both old and new
full versions must exist in the public npm registry; the new version must be at
least three days old. Both canonical tarballs are downloaded and SHA512-checked
against registry and lock. Scripts, executables, runtime entries (including
optionalDependencies, module and browser), deprecation or changed dependency/peer
ranges disqualify the package. OSV queries both exact full versions; the new one
must have no advisories. The envelope and both rows must be non-array objects
with the documented querybatch shape; errors, unknown keys and malformed minimal
advisories fail closed. The separate native Dependabot group remains narrow.

Every identity boundary uses johan-eilertsen/react-leaflet-explorer and numeric
repository ID1322969511: event, environment, REST repository, PR base/head and
GraphQL repository. Only Dependabot49699333 qualifies. The actual head H must be
one commit with exactly one parent, fresh actual main A. Multi-commit,
merge-commit, A→B→H and unknown provenance go to the manual owner path.

PR creator and email are not head provenance. REST commit.author must be
Dependabot[bot]/Bot/49699333, committer web-flow/19864447, with verified:true,
reason:valid and a PGP signature/payload. GraphQL must independently return the
same H/repository/parent and author.user, plus GpgSignature, isValid:true,
state:VALID, wasSignedByGitHub:true and signer web-flow/databaseId19864447.
The GraphQL payload/signature must match REST. These are authenticated GitHub
verification fields, not local verification of an arbitrary PGP block. GraphQL committer.user is deliberately not required.

Historical evidence: real PR21 head068747b0be6e388a688fd99140fee8cd89562a05,
parent5b0a46882b2cebc72f556367ac04da27b1834cc3, has this REST/GraphQL binding
(GraphQL committer.user is null). It updates Vitest, not the allowlisted type
package: this is provenance evidence, NOT a positive pilot candidate or landing.
No real positive type patch currently exists; one must never be fabricated.

## Read-only delivery

Normal Dependabot PRs and existing CI remain. The qualification workflow runs
only the trusted main/base policy, never PR-head code, and grants contents:read
and pull-requests:read only. It installs nothing. It reads immutable manifests,
locks, authenticated GitHub provenance and canonical npm/OSV metadata, then
prints qualification evidence in the job log. This is advisory evidence, not a
required bot-specific status or permission to merge. Ineligible, human and fork
PRs remain on the ordinary manual owner path.

There is no write job, commit-status write, auto-merge arming, async merge
request, activation variable, queue, scheduler or controller in this delivery.
No repository settings or npm publishing workflow are changed. The published
0.6.1 package, UI, peers and consumer release gates are independent.

## Future automatic effects are out of scope

Read-only qualification plus manual merging covers the useful automation now;
automatically landing one future dev-type patch does not justify a persistent
controller. Prior write-only code and tests are removed, not declared safe.
The discarded route did not preserve unresolved native UUID/admission state
across jobs and did not bind checks to the same PR/base/trusted workflow. No
actual double merge is claimed. A fixture or green CI is not landing proof.

Any future effect needs a separately reviewed, necessary design and a genuine
eligible bot PR. It must bind repository, PR, exact head, actual base, trusted
workflow and check provenance; enforce fresh native protection without bypass;
and reconcile prior pending/lost mutation outcomes across events/reruns before
any new request. Native settings, token access and real positive end-to-end
behavior must be qualified then. None is implemented or enabled here. No
eligible new @types/leaflet patch currently exists; never fabricate one.
