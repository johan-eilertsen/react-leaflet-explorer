import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { REPOSITORY, REPOSITORY_ID, isRepository, isNativeBot, qualify, qualifyHead } from "./dependabot-policy.mjs";

const name = "@types/leaflet", a = "1.9.21", b = "1.9.22";
const bytes = Buffer.from("fixture tarball, not a registry attestation");
const integrity = "sha512-" + createHash("sha512").update(bytes).digest("base64");
const url = (v) => "https://registry.npmjs.org/@types/leaflet/-/leaflet-" + v + ".tgz";
function fixture() {
  const manifest = { name:"library", version:"0.6.1", scripts:{check:"vitest"},
    dependencies:{runtime:"1.0.0"}, peerDependencies:{react:"^18 || ^19"}, devDependencies:{[name]:a} };
  const lock = {name:"library", version:"0.6.1", lockfileVersion:3, packages:{
    "":structuredClone(manifest), ["node_modules/"+name]:{version:a,dev:true,resolved:url(a),integrity}
  }};
  const before = {manifest,lock}, after = structuredClone(before);
  after.manifest.devDependencies[name] = b;
  after.lock.packages[""].devDependencies[name] = b;
  Object.assign(after.lock.packages["node_modules/"+name],{version:b,resolved:url(b)});
  const metadata = {name,time:{[b]:"2026-08-01T00:00:00Z"},versions:{}};
  for (const v of [a,b]) metadata.versions[v] = {name,version:v,types:"index.d.ts",dist:{tarball:url(v),integrity}};
  return {repository:"johan-eilertsen/react-leaflet-explorer", pr:{user:{login:"dependabot[bot]",type:"Bot",id:49699333},state:"open",draft:false,changed_files:2,commits:1,
    head:{ref:"dependabot/npm_and_yarn/types-leaflet",sha:"a".repeat(40),repo:{full_name:"johan-eilertsen/react-leaflet-explorer",id:1322969511}},
    base:{ref:"main",sha:"b".repeat(40),repo:{full_name:"johan-eilertsen/react-leaflet-explorer",id:1322969511}}},
    files:[{filename:"package.json",status:"modified"},{filename:"package-lock.json",status:"modified"}],
    before,after,now:Date.parse("2026-11-03T20:00:00Z"),metadata,
    registry:{package:async()=>metadata,tarball:async()=>bytes,advisories:async()=>({results:[{},{}]})}};
}
test("only an exact type-only patch with both actual tarball hashes qualifies", async()=>{
  const f=fixture();const seen=[];f.registry.tarball=async(u)=>{seen.push(u);return bytes;};
  assert.equal((await qualify(f)).to,b);assert.deepEqual(seen,[url(a),url(b)]);
});
const cases = {
  "human or spoofed author":f=>{f.pr.user.login="someone";},
  "fork PR":f=>{f.pr.head.repo.full_name="attacker/repo";},
  "wrong base":f=>{f.pr.base.ref="release";},
  "draft":f=>{f.pr.draft=true;},
  "invalid SHA":f=>{f.pr.head.sha="main";},
  "renamed file":f=>{f.files[0].status="renamed";},
  "workflow change":f=>{f.files.push({filename:".github/workflows/ci.yml",status:"modified"});},
  "hidden additional file":f=>{f.pr.changed_files=3;},
  "changed script":f=>{f.after.manifest.scripts.check="attacker";},
  "runtime update":f=>{f.after.manifest.dependencies.runtime="1.0.1";},
  "peer change":f=>{f.after.manifest.peerDependencies.react="^19";},
  "release/version change":f=>{f.after.manifest.version="0.6.2";},
  "unknown dev package":f=>{f.after.manifest.devDependencies.other="1.0.0";},
  "major":f=>{f.after.manifest.devDependencies[name]="2.0.0";},
  "minor outside qualified profile":f=>{f.after.manifest.devDependencies[name]="1.10.0";},
  "range":f=>{f.after.manifest.devDependencies[name]="^1.9.22";},
  "prerelease":f=>{f.after.manifest.devDependencies[name]="1.9.22-rc.1";},
  "downgrade":f=>{f.after.manifest.devDependencies[name]="1.9.20";},
  "unchanged version":f=>{f.after.manifest.devDependencies[name]=a;},
  "wrong lock version":f=>{f.after.lock.lockfileVersion=2;},
  "transitive change":f=>{f.after.lock.packages["node_modules/other"]={version:"1.0.0"};},
  "metadata mutation":f=>{f.after.lock.packages["node_modules/"+name].hasInstallScript=true;},
  "lock/version mismatch":f=>{f.after.lock.packages["node_modules/"+name].version=a;},
  "git tarball source":f=>{f.after.lock.packages["node_modules/"+name].resolved="git+https://example.com/a";},
  "unknown registry version":f=>{delete f.metadata.versions[b];},
  "newly published patch":f=>{f.metadata.time[b]="2026-11-03T00:00:00Z";},
  "future date":f=>{f.metadata.time[b]="2027-01-01T00:00:00Z";},
  "missing date":f=>{delete f.metadata.time[b];},
  "deprecated package":f=>{f.metadata.versions[b].deprecated="unsafe";},
  "package script":f=>{f.metadata.versions[b].scripts={postinstall:"attacker"};},
  "runtime entry":f=>{f.metadata.versions[b].main="index.js";},
  "binary":f=>{f.metadata.versions[b].bin={run:"run.js"};},
  "new dependency":f=>{f.metadata.versions[b].dependencies={unexpected:"*"};},
  "changed peer":f=>{f.metadata.versions[b].peerDependencies={react:"^20"};},
  "registry tarball mismatch":f=>{f.metadata.versions[b].dist.tarball="https://attacker.invalid/file";},
  "registry integrity mismatch":f=>{f.metadata.versions[b].dist.integrity="sha512-wrong";},
  "actual tarball corruption":f=>{f.registry.tarball=async()=>Buffer.from("corrupt");},
  "old tarball corruption":f=>{f.registry.tarball=async(u)=>u===url(a)?Buffer.from("corrupt"):bytes;},
  "oversized tarball":f=>{f.registry.tarball=async()=>Buffer.alloc(2*1024*1024+1);},
  "new full version advisory":f=>{f.registry.advisories=async()=>({results:[{},{vulns:[{id:"GHSA-test",modified:"2026-01-01T00:00:00Z"}]}]});},
  "advisory lookup failure":f=>{f.registry.advisories=async()=>{throw Error("OSV 503");};},
  "unknown advisory response":f=>{f.registry.advisories=async()=>({results:[{},{error:"unknown"}]});},
  "missing advisory result":f=>{f.registry.advisories=async()=>({results:[{}]});},
  "numeric base identity":f=>{f.pr.base.repo.id=123;},
  "numeric head identity":f=>{f.pr.head.repo.id=999;},
  "spoofed bot ID":f=>{f.pr.user.id=1;},
  "multiple commits":f=>{f.pr.commits=2;},
  "optional runtime dependencies":f=>{f.metadata.versions[b].optionalDependencies={x:"*"};},
  "module entry":f=>{f.metadata.versions[b].module="index.js";},
  "browser entry":f=>{f.metadata.versions[b].browser={};},
  "registry failure":f=>{f.registry.package=async()=>{throw Error("HTTP 429");};},
};
for(const [label,mutate] of Object.entries(cases))test("rejects "+label,async()=>{const f=fixture();mutate(f);await assert.rejects(qualify(f));});

for(const value of [true,17,[],null,{error:"bad"},{unknown:true},{vulns:[true]},{vulns:[{}]},{vulns:[{id:"x",modified:17}]}]) {
  for(const row of [0,1]) test("OSV rejects malformed row "+row+" "+JSON.stringify(value),async()=>{
    const f=fixture();const results=[{},{}];results[row]=value;f.registry.advisories=async()=>({results});await assert.rejects(qualify(f));
  });
}
for(const value of [[],true,17,null,{results:[{},{}],error:"bad"},{results:[{},{}],extra:1}])test("OSV rejects malformed envelope "+JSON.stringify(value),async()=>{const f=fixture();f.registry.advisories=async()=>value;await assert.rejects(qualify(f));});

const repository={full_name:'johan-eilertsen/react-leaflet-explorer',id:1322969511};
function headEvidence(pr) {
  const commit={sha:pr.head.sha,parents:[{sha:pr.base.sha}],author:{login:'dependabot[bot]',type:'Bot',id:49699333},committer:{login:'web-flow',id:19864447},commit:{verification:{verified:true,reason:'valid',signature:'-----BEGIN PGP SIGNATURE-----\nfixture',payload:'parent '+pr.base.sha+'\n'}}};
  const graph={...repository,nameWithOwner:repository.full_name,databaseId:repository.id,object:{oid:pr.head.sha,author:{user:{login:'dependabot[bot]',databaseId:49699333}},parents:{totalCount:1,nodes:[{oid:pr.base.sha}]},signature:{...commit.commit.verification,__typename:'GpgSignature',isValid:true,state:'VALID',wasSignedByGitHub:true,signer:{login:'web-flow',databaseId:19864447}}}};
  return {commit,graph};
}
test('OSV queries both exact versions and accepts a valid historical advisory only',async()=>{
  const f=fixture();let query;
  f.registry.advisories=async(...args)=>{query=args;return {results:[{vulns:[{id:'GHSA-aaaa-bbbb-cccc',modified:'2026-01-01T00:00:00Z'}]},{}]};};
  assert.deepEqual((await qualify(f)).previousAdvisories,['GHSA-aaaa-bbbb-cccc']);
  assert.deepEqual(query,['@types/leaflet',['1.9.21','1.9.22']]);
});
test('policy accepts documented bot/GitHub signature shape, not committer.user',()=>{
  const pr=fixture().pr,{commit,graph}=headEvidence(pr);qualifyHead(pr,commit,graph);
});
for(const [label,mutate] of Object.entries({
  'A B H':e=>{e.commit.parents[0].sha='c'.repeat(40);},
  'multiple parents':e=>{e.commit.parents.push({sha:'c'.repeat(40)});},
  'wrong actual SHA':e=>{e.commit.sha='c'.repeat(40);},
  'REST author ID':e=>{e.commit.author.id=1;},'REST author type':e=>{e.commit.author.type='User';},
  'REST committer':e=>{e.commit.committer.id=1;},'unverified signature':e=>{e.commit.commit.verification.verified=false;},
  'invalid verification reason':e=>{e.commit.commit.verification.reason='unknown_key';},
  'missing payload':e=>{e.commit.commit.verification.payload=null;},
  'GraphQL repository':e=>{e.graph.databaseId=1;},'GraphQL commit':e=>{e.graph.object.oid='c'.repeat(40);},
  'GraphQL author':e=>{e.graph.object.author.user.databaseId=1;},
  'GraphQL parents':e=>{e.graph.object.parents.totalCount=2;},
  'arbitrary verified signature':e=>{e.graph.object.signature.wasSignedByGitHub=false;},
  'arbitrary signer':e=>{e.graph.object.signature.signer.databaseId=1;},
  'non-PGP signature':e=>{e.graph.object.signature.__typename='SshSignature';},
  'invalid signature state':e=>{e.graph.object.signature.state='INVALID';},
}))test('policy rejects head provenance: '+label,()=>{const pr=fixture().pr,e=headEvidence(pr);mutate(e);assert.throws(()=>qualifyHead(pr,e.commit,e.graph));});
for(const modified of ['2026-02-31T00:00:00Z','2026-01-01','2026-01-01T00:00:00','invalid'])test('reject malformed advisory timestamp '+modified,async()=>{const f=fixture();f.registry.advisories=async()=>({results:[{vulns:[{id:'GHSA-aaaa-bbbb-cccc',modified}]},{}]});await assert.rejects(qualify(f));});

const workflow = readFileSync(new URL('../workflows/dependabot-qualification.yml', import.meta.url), 'utf8');
const runner = readFileSync(new URL('./qualify-dependabot.mjs', import.meta.url), 'utf8');
test('qualification workflow has only read permissions and no merge job or activation flag', () => {
  assert.doesNotMatch(workflow, /: write|land:|github-script|PILOT_ENABLED|DEPENDABOT_TYPE_PATCH_PILOT|outputs:/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /pull-requests: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /TRUSTED_BASE:/);
});
test('qualification runner has no GitHub mutation, shared status or exported merge authorization', () => {
  assert.doesNotMatch(runner, /appendFileSync|GITHUB_OUTPUT|merge-async|createCommitStatus|enablePullRequestAutoMerge|mutation/);
  assert.doesNotMatch(runner, /method: ["'](?:PUT|PATCH|DELETE)["']/);
  assert.ok(runner.includes('https://api.github.com/graphql'));
  assert.ok(runner.includes('query($sha:GitObjectID!'));
});
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const executeQualification = new AsyncFunction('readFileSync', 'process', 'fetch', 'console',
  'REPOSITORY', 'REPOSITORY_ID', 'isRepository', 'isNativeBot', 'qualify', 'qualifyHead',
  runner.split(String.fromCharCode(10)).filter(line => !line.startsWith('import ')).join(String.fromCharCode(10)));
function inspectionFixture() {
  const pr = { ...fixture().pr, number: 1 };
  pr.user = { login: 'human', type: 'User', id: 123 };
  const event = { repository: structuredClone(repository) };
  const env = { GITHUB_REPOSITORY: REPOSITORY, GITHUB_REPOSITORY_ID: String(REPOSITORY_ID), PR_NUMBER: '1', GITHUB_EVENT_PATH: 'fixture' };
  const calls = [], logs = [];
  const run = () => executeQualification(() => JSON.stringify(event), { env }, async (url, options) => {
    calls.push({ url, method: options?.method ?? 'GET' });
    if (url === 'https://api.github.com/repos/' + REPOSITORY) return new Response(JSON.stringify(repository));
    if (url.endsWith('/pulls/1')) return new Response(JSON.stringify(pr));
    throw Error('Unexpected request: ' + url);
  }, { log: value => logs.push(JSON.parse(value)) }, REPOSITORY, REPOSITORY_ID, isRepository, isNativeBot, qualify, qualifyHead);
  return { pr, event, env, calls, logs, run };
}
test('human PR sharing a bot SHA produces only an advisory unqualified log', async () => {
  const f = inspectionFixture(); await f.run();
  assert.equal(f.logs[0].qualified, 'false');
  assert.ok(f.calls.every(call => call.method === 'GET'));
});
test('native bot on a fork remains unqualified without an effect', async () => {
  const f = inspectionFixture(); f.pr.user = fixture().pr.user; f.pr.head.repo.id = 999;
  await f.run(); assert.equal(f.logs[0].qualified, 'false');
  assert.equal(f.calls.length, 2);
});
for (const [label, mutate] of Object.entries({
  'environment repository ID': f => { f.env.GITHUB_REPOSITORY_ID = '999'; },
  'event repository ID': f => { f.event.repository.id = 123; },
  'event PR repository ID': f => { f.event.pull_request = structuredClone(f.pr); f.event.pull_request.head.repo.id = 999; },
  'event PR number': f => { f.event.pull_request = structuredClone(f.pr); f.event.pull_request.number = 999; },
})) test('read-only runner rejects ' + label, async () => {
  const f = inspectionFixture(); mutate(f); await assert.rejects(f.run());
  assert.equal(f.logs.length, 0); assert.ok(f.calls.every(call => call.method === 'GET'));
});
