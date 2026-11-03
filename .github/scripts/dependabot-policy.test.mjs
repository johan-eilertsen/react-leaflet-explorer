import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { qualify, qualifyHead } from "./dependabot-policy.mjs";

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

const workflow=readFileSync(new URL('../workflows/dependabot-auto-merge.yml',import.meta.url),'utf8');
const code=workflow.split('          script: |')[1].split('\n').map(l=>l.slice(12)).join('\n');
const runWrite=new (Object.getPrototypeOf(async function(){}).constructor)('github','context','core','process','setTimeout',code);
const repository={full_name:'johan-eilertsen/react-leaflet-explorer',id:1322969511};
function headEvidence(pr) {
  const commit={sha:pr.head.sha,parents:[{sha:pr.base.sha}],author:{login:'dependabot[bot]',type:'Bot',id:49699333},committer:{login:'web-flow',id:19864447},commit:{verification:{verified:true,reason:'valid',signature:'-----BEGIN PGP SIGNATURE-----\nfixture',payload:'parent '+pr.base.sha+'\n'}}};
  const graph={...repository,nameWithOwner:repository.full_name,databaseId:repository.id,object:{oid:pr.head.sha,author:{user:{login:'dependabot[bot]',databaseId:49699333}},parents:{totalCount:1,nodes:[{oid:pr.base.sha}]},signature:{...commit.commit.verification,__typename:'GpgSignature',isValid:true,state:'VALID',wasSignedByGitHub:true,signer:{login:'web-flow',databaseId:19864447}}}};
  return {commit,graph};
}
function writeFixture() {
  const pr={...fixture().pr,number:1,node_id:'PR_test',auto_merge:null,merged:false,mergeable:true,mergeable_state:'clean'};
  const {commit,graph}=headEvidence(pr);
  const checks=['test','Dependabot policy tests'].map(context=>({context,app_id:15368}));
  const f={pr,commit,graph,calls:[],rules:[],base:pr.base.sha,
    protection:{required_status_checks:{strict:true,contexts:checks.map(c=>c.context),checks},enforce_admins:{enabled:true},allow_force_pushes:{enabled:false},allow_deletions:{enabled:false},required_pull_request_reviews:null,restrictions:null},
    checks:checks.map(c=>({name:c.context,app:{id:15368},head_sha:pr.head.sha,status:'completed',conclusion:'success'})),
    env:{PILOT_ENABLED:'true',GITHUB_REPOSITORY:repository.full_name,GITHUB_REPOSITORY_ID:'1322969511',PR_NUMBER:'1',QUALIFIED:'true',EXPECTED_HEAD:pr.head.sha,EXPECTED_BASE:pr.base.sha},
    context:{repo:{owner:'johan-eilertsen',repo:'react-leaflet-explorer'},ref:'refs/heads/main',payload:{repository:structuredClone(repository)}}};
  const readPR=()=>{f.calls.push(['read-pr']);f.reads=(f.reads||0)+1;if(f.afterRead)f.afterRead(f);return {data:pr};};
  const github={rest:{pulls:{get:async()=>readPR()},repos:{get:async()=>({data:{...repository,...f.settings,default_branch:'main'}}),getBranchProtection:async()=>{f.calls.push(['protection']);if(f.protectionError)throw Error('404');return {data:f.protection};},getBranch:async()=>({data:{protected:true,commit:{sha:f.base}}}),getCommit:async({ref})=>({data:ref===pr.head.sha?f.commit:{sha:ref,parents:[{sha:f.mergeBase||f.env.EXPECTED_BASE},{sha:pr.head.sha}]}}),createCommitStatus:async(v)=>f.calls.push(['status',v])},checks:{listForRef:async()=>({data:{total_count:f.checks.length,check_runs:f.checks}})}},graphql:async(query,args)=>{f.calls.push([query.includes('mutation')?'graphql-mutation':'graphql-read',args]);return {repository:f.graph};},request:async(route,args)=>{
    f.calls.push([route,args]);
    if(route.includes('rules/branches'))return {data:f.rules};
    if(route.startsWith('PUT ')){f.mutations=(f.mutations||0)+1;if(f.reject)throw Object.assign(Error('denied'),{status:403});if(f.lost){if(f.lost==='merged'){pr.merged=true;pr.state='closed';pr.merge_commit_sha='d'.repeat(40);}throw Error('lost response');}return {data:{status:'pending',details:{uuid:'12345678-1234-1234-1234-123456789abc',merge_action:'direct_merge',merge_method:'merge',expected_head_sha:pr.head.sha,bypass_rules:false}}};}
    if(route.includes('/merge-async/')){if(f.resultLost)throw Error('lost result response');if(f.outcome==='pending')return {data:{status:'pending'}};if(f.outcome==='failed')return {data:{status:'failed'}};if(f.outcome==='enqueued')return {data:{status:'enqueued'}};pr.merged=true;pr.state='closed';pr.merge_commit_sha='d'.repeat(40);return {data:{status:'merged',details:{sha:pr.merge_commit_sha}}};}
    throw Error('Unexpected route '+route);
  }};
  f.run=()=>runWrite(github,f.context,{notice:m=>f.calls.push(['notice',m]),warning:m=>f.calls.push(['warning',m])},{env:f.env},fn=>fn());
  return f;
}
const effects=f=>f.calls.filter(c=>c[0]==='status'||/^(PUT|POST|PATCH|DELETE) /.test(c[0])||c[0]==='graphql-mutation');
test('write default is disabled without any write effect',async()=>{const f=writeFixture();delete f.env.PILOT_ENABLED;await f.run();assert.deepEqual(effects(f),[]);});
test('exact head lands only after all native gates and result readback',async()=>{const f=writeFixture();await f.run();assert.equal(f.mutations,1);const call=effects(f)[0];assert.equal(call[1].sha,'a'.repeat(40));assert.equal(call[1].merge_action,'direct_merge');assert.equal(call[1].bypass_rules,false);assert.equal(f.pr.merged,true);assert.ok(f.reads>=3);assert.equal(f.calls.filter(c=>c[0]==='protection').length,2);});
for(const [label,mutate] of Object.entries({
  'shared SHA human fork already armed':f=>{f.pr.user.login='human';f.pr.head.repo={full_name:'human/fork',id:999};f.pr.auto_merge={};},
  'already armed bot':f=>{f.pr.auto_merge={};},
  'base repo ID123':f=>{f.pr.base.repo.id=123;},'head repo ID999':f=>{f.pr.head.repo.id=999;},
  'event repo ID':f=>{f.context.payload.repository.id=1;},'env repo ID':f=>{f.env.GITHUB_REPOSITORY_ID='1';},
  'GraphQL repo ID':f=>{f.graph.databaseId=1;},'GraphQL repository name':f=>{f.graph.nameWithOwner='attacker/repo';},
  'spoofed bot':f=>{f.pr.user.id=1;},'head changed':f=>{f.pr.head.sha='c'.repeat(40);},
  'A B H ancestry':f=>{f.commit.parents[0].sha='c'.repeat(40);f.graph.object.parents.nodes[0].oid='c'.repeat(40);},
  'merge commit':f=>{f.commit.parents.push({sha:'c'.repeat(40)});},'multiple commits':f=>{f.pr.commits=2;},
  'unknown author':f=>{f.commit.author=null;},'forged verified signature':f=>{f.graph.object.signature.wasSignedByGitHub=false;},
  'unknown signer':f=>{f.graph.object.signature.signer.databaseId=1;},'no signed payload':f=>{f.commit.commit.verification.payload=null;},
  'missing protection':f=>{f.protectionError=true;},'unknown protection':f=>{f.protection.unknown_rule=true;},
  'missing admin enforcement':f=>{f.protection.enforce_admins.enabled=false;},'force push allowed':f=>{f.protection.allow_force_pushes.enabled=true;},
  'deletion allowed':f=>{f.protection.allow_deletions.enabled=true;},'not strict':f=>{f.protection.required_status_checks.strict=false;},
  'unknown ruleset':f=>{f.rules=[{type:'required_status_checks'}];},'review bypass actors':f=>{f.protection.required_pull_request_reviews={bypass_pull_request_allowances:{users:[{}]}};},
  'missing check':f=>{f.checks.pop();},'pending check':f=>{f.checks[0].status='in_progress';},
  'failed check':f=>{f.checks[0].conclusion='failure';},'wrong check app':f=>{f.checks[0].app.id=1;},
  'wrong check SHA':f=>{f.checks[0].head_sha='c'.repeat(40);},'unknown required context':f=>{f.protection.required_status_checks.checks.push({context:'Other',app_id:15368});},
  'base moves before mutation':f=>{f.afterRead=x=>{if(x.reads===2)x.base='c'.repeat(40);};},
  'protection weakens at reread':f=>{f.afterRead=x=>{if(x.reads===2)x.protection.allow_force_pushes.enabled=true;};},
  'inspection rejected':f=>{f.env.QUALIFIED='false';},
  'missing inspected head':f=>{delete f.env.EXPECTED_HEAD;},
  'missing inspected base':f=>{delete f.env.EXPECTED_BASE;},
  'draft PR':f=>{f.pr.draft=true;},
  'wrong target ref':f=>{f.pr.base.ref='release';},
  'API base mismatch':f=>{f.pr.base.sha='c'.repeat(40);},
  'fork with valid bot ID':f=>{f.pr.head.repo.full_name='attacker/repo';},
}))test('no write effect: '+label,async()=>{const f=writeFixture();mutate(f);try{await f.run();}catch{}assert.deepEqual(effects(f),[]);});
for(const mode of ['lost','merged'])test('lost mutation response rereads same PR without retry: '+mode,async()=>{const f=writeFixture();f.lost=mode;try{await f.run();}catch{}assert.equal(f.mutations,1);assert.ok(f.reads>=3);});
test('native rejection is read back without retry',async()=>{const f=writeFixture();f.reject=true;await assert.rejects(f.run());assert.equal(f.mutations,1);assert.ok(f.reads>=3);});
for(const outcome of ['pending','failed','enqueued'])test('admission is not merge proof: '+outcome,async()=>{const f=writeFixture();f.outcome=outcome;await assert.rejects(f.run());assert.equal(f.mutations,1);assert.equal(f.pr.merged,false);});
test('privileged workflow has no checkout/import/cache/status/arming, and explicit activation boundary',()=>{
  const job=workflow.slice(workflow.indexOf('  land:'));
  assert.ok(workflow.includes('  land:'));assert.doesNotMatch(job,/uses: actions\/(checkout|setup-node)|npm |run:|download-artifact|restore-cache|require\(|import\(/);
  assert.doesNotMatch(workflow,/statuses: write|createCommitStatus|enablePullRequestAutoMerge/);
  assert.match(job,/vars\.DEPENDABOT_TYPE_PATCH_PILOT == 'true'/);assert.match(job,/retries: 0/);
});


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
for(const value of ['false','TRUE','1',''])test('write flag requires literal true: '+value,async()=>{const f=writeFixture();f.env.PILOT_ENABLED=value;await f.run();assert.deepEqual(effects(f),[]);});
test('wrong merge parents cannot prove landing',async()=>{const f=writeFixture();f.mergeBase='c'.repeat(40);await assert.rejects(f.run(),/parents/);assert.equal(f.mutations,1);});
test('lost response and merged outcome must still match original head',async()=>{const f=writeFixture();f.lost='merged';f.afterRead=x=>{if(x.reads===3)x.pr.head.sha='e'.repeat(40);};await assert.rejects(f.run(),/identity/);assert.equal(f.mutations,1);});
for(const row of [true,17,[]])test('malformed OSV cannot reach actual write job '+JSON.stringify(row),async()=>{const policy=fixture(),f=writeFixture();policy.registry.advisories=async()=>({results:[{},row]});f.env.QUALIFIED=String(await qualify(policy).then(()=>true,()=>false));await f.run();assert.deepEqual(effects(f),[]);});

for(const [label,mutate] of Object.entries({
  'API repository ID':f=>{f.settings={id:1};},'API repository full name':f=>{f.settings={full_name:'attacker/repo'};},
  'environment repository':f=>{f.env.GITHUB_REPOSITORY='attacker/repo';},
  'event PR base ID':f=>{f.context.payload.pull_request={...structuredClone(f.pr),base:{...f.pr.base,repo:{...repository,id:123}}};},
  'event PR head ID':f=>{f.context.payload.pull_request={...structuredClone(f.pr),head:{...f.pr.head,repo:{...repository,id:999}}};},
  'duplicate required check':f=>{f.checks.push({...f.checks[0]});},
  'required check app mismatch':f=>{f.protection.required_status_checks.checks[0].app_id=1;},
  'missing no-force evidence':f=>{delete f.protection.allow_force_pushes;},
  'missing no-delete evidence':f=>{delete f.protection.allow_deletions;},
}))test('additional write boundary: '+label,async()=>{const f=writeFixture();mutate(f);await assert.rejects(f.run());assert.deepEqual(effects(f),[]);});
test('lost native result response reads same PR without retry',async()=>{const f=writeFixture();f.resultLost=true;await assert.rejects(f.run(),/unavailable/);assert.equal(f.mutations,1);assert.ok(f.reads>=3);});

test('merge proof tolerates post-merge base tip but verifies exact original parents',async()=>{const f=writeFixture();f.afterRead=x=>{if(x.reads===3)x.pr.base.sha='d'.repeat(40);};await f.run();assert.equal(f.pr.merged,true);});
for(const modified of ['2026-02-31T00:00:00Z','2026-01-01','2026-01-01T00:00:00','invalid'])test('reject malformed advisory timestamp '+modified,async()=>{const f=fixture();f.registry.advisories=async()=>({results:[{vulns:[{id:'GHSA-aaaa-bbbb-cccc',modified}]},{}]});await assert.rejects(qualify(f));});

for(const [label,mutate] of Object.entries({
  'nested force-push bypass':f=>{f.protection.allow_force_pushes.actors=[{}];},
  'nested admin bypass':f=>{f.protection.enforce_admins.bypass=true;},
  'unknown check-protection option':f=>{f.protection.required_status_checks.bypass=true;},
  'signature bytes disagree':f=>{f.graph.object.signature.signature='other';},
  'signed payload disagrees':f=>{f.graph.object.signature.payload='other';},
  'previously armed with invalid protection':f=>{f.pr.auto_merge={};f.protection.enforce_admins.enabled=false;},
}))test('strict unknown/binding boundary: '+label,async()=>{const f=writeFixture();mutate(f);await assert.rejects(f.run());assert.deepEqual(effects(f),[]);});
