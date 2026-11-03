import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { qualify } from "./dependabot-policy.mjs";

const name = "@types/leaflet", a = "1.9.21", b = "1.9.22";
const bytes = Buffer.from("fixture tarball, not a registry attestation");
const integrity = "sha512-" + createHash("sha512").update(bytes).digest("base64");
const url = (v) => "https://registry.npmjs.org/@types/leaflet/-/leaflet-" + v + ".tgz";
function fixture() {
  const manifest = { name:"library", version:"0.6.0", scripts:{check:"vitest"},
    dependencies:{runtime:"1.0.0"}, peerDependencies:{react:"^18 || ^19"}, devDependencies:{[name]:a} };
  const lock = {name:"library", version:"0.6.0", lockfileVersion:3, packages:{
    "":structuredClone(manifest), ["node_modules/"+name]:{version:a,dev:true,resolved:url(a),integrity}
  }};
  const before = {manifest,lock}, after = structuredClone(before);
  after.manifest.devDependencies[name] = b;
  after.lock.packages[""].devDependencies[name] = b;
  Object.assign(after.lock.packages["node_modules/"+name],{version:b,resolved:url(b)});
  const metadata = {name,time:{[b]:"2026-08-01T00:00:00Z"},versions:{}};
  for (const v of [a,b]) metadata.versions[v] = {name,version:v,types:"index.d.ts",dist:{tarball:url(v),integrity}};
  return {repository:"owner/repo", pr:{user:{login:"dependabot[bot]",type:"Bot"},state:"open",draft:false,changed_files:2,
    head:{ref:"dependabot/npm_and_yarn/types-leaflet",sha:"a".repeat(40),repo:{full_name:"owner/repo"}},
    base:{ref:"main",sha:"b".repeat(40),repo:{full_name:"owner/repo"}}},
    files:[{filename:"package.json",status:"modified"},{filename:"package-lock.json",status:"modified"}],
    before,after,now:Date.parse("2026-11-03T20:00:00Z"),metadata,
    registry:{package:async()=>metadata,tarball:async()=>bytes}};
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
  "release/version change":f=>{f.after.manifest.version="0.6.1";},
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
  "registry failure":f=>{f.registry.package=async()=>{throw Error("HTTP 429");};},
};
for(const [label,mutate] of Object.entries(cases))test("rejects "+label,async()=>{const f=fixture();mutate(f);await assert.rejects(qualify(f));});
test("privileged workflow never checks out or executes PR code",()=>{
  const workflow=readFileSync(new URL("../workflows/dependabot-auto-merge.yml",import.meta.url),"utf8");
  const arm=workflow.slice(workflow.indexOf("  arm:"));
  assert.doesNotMatch(arm,/uses: actions\/(checkout|setup-node)|npm |run:|download-artifact|restore-cache/);
  assert.match(arm,/expectedHeadOid/);assert.match(arm,/checks\?\.strict/);assert.match(arm,/app_id === 15368/);
  assert.match(arm,/createCommitStatus/);assert.match(workflow,/persist-credentials: false/);
});

const workflow=readFileSync(new URL("../workflows/dependabot-auto-merge.yml",import.meta.url),"utf8");
const code=workflow.split("          script: |")[1].split(String.fromCharCode(10)).map(l=>l.slice(12)).join(String.fromCharCode(10));
const runArm=new (Object.getPrototypeOf(async function(){}).constructor)("github","context","core","process",code);
function armFixture() {
  const pr=fixture().pr;
  Object.assign(pr,{node_id:"PR_test",auto_merge:null});
  const required=["test","Dependabot policy tests","Dependabot qualification"].map(context=>({context,app_id:15368}));
  const f={pr,settings:{allow_auto_merge:true},protection:{enforce_admins:{enabled:true},required_status_checks:{strict:true,checks:required}},
    base:pr.base.sha,calls:[],env:{PR_NUMBER:"1",QUALIFIED:"true",EXPECTED_HEAD:pr.head.sha,EXPECTED_BASE:pr.base.sha}};
  const github={rest:{pulls:{get:async()=>({data:pr})},repos:{
    createCommitStatus:async(v)=>f.calls.push(["status",v]),get:async()=>({data:f.settings}),
    getBranchProtection:async()=>({data:f.protection}),getBranch:async()=>({data:{commit:{sha:f.base}}})}},
    graphql:async(q,args)=>f.calls.push([q.includes("enablePullRequestAutoMerge")?"enable":"disable",args])};
  f.run=()=>runArm(github,{repo:{owner:"owner",repo:"repo"},ref:"refs/heads/main",serverUrl:"https://github.com",runId:1},{notice:()=>{}},{env:f.env});
  return f;
}
test("arm uses native auto-merge with exact expectedHeadOid and all strict gates",async()=>{
  const f=armFixture();await f.run();assert.deepEqual(f.calls.find(c=>c[0]==="enable")[1],{id:"PR_test",sha:"a".repeat(40)});
  assert.equal(f.calls[0][1].sha,"a".repeat(40));assert.equal(f.calls[0][1].state,"success");
});
for(const [label,mutate] of Object.entries({
  "head race":f=>{f.pr.head.sha="c".repeat(40);},
  "base SHA mismatch":f=>{f.pr.base.sha="c".repeat(40);},
  "unknown package/policy rejection":f=>{f.env.QUALIFIED="false";},
  "failed read-only inspection":f=>{delete f.env.EXPECTED_HEAD;},
  "draft":f=>{f.pr.draft=true;},
  "manual author":f=>{f.pr.user.login="human";},
  "fork":f=>{f.pr.head.repo.full_name="fork/repo";},
  "native auto-merge disabled":f=>{f.settings.allow_auto_merge=false;},
}))test("does not arm: "+label,async()=>{const f=armFixture();mutate(f);await f.run();assert.equal(f.calls.some(c=>c[0]==="enable"),false);});
for(const [label,mutate] of Object.entries({
  "base advanced after qualification":f=>{f.base="c".repeat(40);},
  "missing native checks":f=>{f.protection.required_status_checks=null;},
  "not strict":f=>{f.protection.required_status_checks.strict=false;},
  "wrong check app":f=>{f.protection.required_status_checks.checks[0].app_id=1;},
  "one missing check":f=>{f.protection.required_status_checks.checks.pop();},
  "admin bypass":f=>{f.protection.enforce_admins.enabled=false;},
}))test("fails closed before auto-merge: "+label,async()=>{const f=armFixture();mutate(f);await assert.rejects(f.run());assert.equal(f.calls.some(c=>c[0]==="enable"),false);});
test("rejecting a previously armed bot head blocks its status and disables auto-merge",async()=>{
  const f=armFixture();f.env.QUALIFIED="false";f.pr.auto_merge={};await f.run();
  assert.equal(f.calls[0][1].state,"failure");assert.ok(f.calls.some(c=>c[0]==="disable"));
});
