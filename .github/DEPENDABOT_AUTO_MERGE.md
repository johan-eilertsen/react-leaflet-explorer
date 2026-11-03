# Narrow native Dependabot pilot (inactive by default)

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

## Routing and effects

The read-only inspection checks out the exact trusted main/base policy, never
PR head. It reads immutable source snapshots and registry artifacts, installs
nothing and executes no PR code. A separate inline write job has no checkout,
imports, package installation, cache or artifact consumption. Its API evidence
is re-read before mutation. Policy-data tests and tests executing the actual
inline job against API fixtures cover different seams; neither proves live
GitHub enforcement or an actual bot landing.

pull_request_target performs early inspection. A completed successful CI
workflow_run can inspect again after checks finish; missing PR association or
nonmatching evidence fails closed. workflow_dispatch can requalify an existing
real PR on main (never an arbitrary SHA/package/repository). There is no new
scheduler, service, queue or persistent controller. CI retains read-only library,
package-build, packed Chrome and policy tests.

There is NO commit-status writing, statuses:write, or auto-merge arming. Human
PRs receive no bot approval signal, even if a fork shares H. Humans retain the
ordinary manual owner path; no bot-specific status context is required globally.
An already auto_merge-armed PR is rejected without changing it. Before activating
this replacement, the owner must inspect and disarm any old requests separately;
this source patch neither activates the pilot nor changes repository settings.

## Activation boundary

The job-level filter requires repository variable DEPENDABOT_TYPE_PATCH_PILOT,
successful inspection and qualified=true. GitHub expression comparisons are
case-insensitive; the inline code independently requires the flag literally
true before any write. Missing, false, or differently cased values have no write
effect. The variable is NOT created
or set by this delivery. Repository allow_auto_merge is not needed by this route.

Activation requires separately authorized inspection/configuration of actual
native main protection. The narrow supported profile is classic protection:
strict required checks exactly test and Dependabot policy tests, both app15368;
admin enforcement enabled; force pushes and deletions explicitly disabled;
no PR-review bypass configuration or push restrictions, no additional enabled
rules and no effective ruleset. Unknown configurations are manual, not guessed.
HTTP403/404 is NOT proof of protection. The branch must report protected:true.
All required check runs must be completed success, app15368, on exact H; duplicate,
missing, pending, failed, wrong-app, wrong-SHA or incomplete results stop landing.
If GitHub reports CI only on a synthetic merge SHA, that is not accepted as H.
The actual workflow-token ability to read native protection also needs live
qualification; an owner's token or fixture is not proof of that ability.

The job re-reads repository, PR, actual main, protection, effective rules, commit
provenance and checks before its single mutation. It calls the documented native
PUT /repos/{owner}/{repo}/pulls/{pull_number}/merge-async with sha:H,
merge_method:merge, merge_action:direct_merge, bypass_rules:false and no automatic
request retries. Native strict checks and forward-only, nondeletable main enforce
the race boundary: because H has exactly parent A, another forward main commit
cannot be an ancestor of H. There is no claim of atomic protection against a
simultaneous trusted administrator changing repository rules.

## Outcomes and recovery

Admission/pending/enqueued is NOT merge proof. A known native UUID is observed
with at most ten result reads in this job. Success requires a merged result and
a fresh same-PR/head read with merged:true and matching merge commit OID; its
actual parents must be [A,H]. A lost mutation/result response triggers a fresh
same-PR/head/merge-outcome read, NEVER a blind second PUT. Failure, unknown,
still-pending or queued outcomes are reported unresolved, not green.

For an unresolved run, inspect the same PR/H and the recorded UUID result (when
available), including merge_commit_sha, before authorizing another action.
Native UUID results expire after 24 hours. Do not rerun/dispatch blindly: an
already accepted direct merge can still finish. Stop new requests by removing
or disabling the pilot variable; that does not cancel an accepted native merge.
A verified merge cannot be undone by clearing a flag; use the normal reviewed
revert path if needed. Hysvær's project owner owns containment and follow-up.

The source must receive independent delta review before activation. The current
library is published0.6.1; package.json, lock and UI/release work are preserved
from main. publish.yml is unchanged. This pilot does not publish npm packages,
promote consumers, change repository settings or introduce security-major
exceptions. Broader profiles require a separate reviewed change.

## Native contracts

- [Asynchronous merge API and result](https://docs.github.com/en/rest/pulls/pulls#merge-a-pull-request-asynchronously)
- [Published GitHub REST schema](https://github.com/github/rest-api-description/blob/main/descriptions/api.github.com/api.github.com.json)
- [GitSignature fields](https://docs.github.com/en/graphql/reference/interfaces#gitsignature)
- [GpgSignature](https://docs.github.com/en/graphql/reference/objects#gpgsignature)
- [REST commit verification](https://docs.github.com/en/rest/commits/commits#get-a-commit)
- [OSV querybatch](https://google.github.io/osv.dev/post-v1-querybatch/)
