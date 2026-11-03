import { appendFileSync, readFileSync } from "node:fs";
import { REPOSITORY, REPOSITORY_ID, isRepository, isNativeBot, qualify, qualifyHead } from "./dependabot-policy.mjs";

const repository = process.env.GITHUB_REPOSITORY;
const number = Number(process.env.PR_NUMBER);
if (repository !== REPOSITORY || process.env.GITHUB_REPOSITORY_ID !== String(REPOSITORY_ID) || !Number.isSafeInteger(number) || number < 1) {
  throw new Error("Invalid repository or PR number");
}
async function bytes(url, headers = {}, maximum = 2 * 1024 * 1024, options = {}) {
  const response = await fetch(url, { ...options, headers, redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error("HTTP " + response.status);
  if (Number(response.headers.get("content-length")) > maximum) throw new Error("Response too large");
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > maximum) throw new Error("Response too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
const json = async (url, headers, options) => JSON.parse(await bytes(url, headers, undefined, options));
const api = (path) => json("https://api.github.com/repos/" + repository + path, {
  authorization: "Bearer " + process.env.GH_TOKEN,
  accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
});
const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
if (!isRepository(event.repository) || !isRepository(await api(""))) throw Error("Repository identity mismatch");
const pr = await api("/pulls/" + number);
if (pr.number !== number || (event.pull_request && (event.pull_request.number !== number ||
    !isRepository(event.pull_request.base?.repo) || !isRepository(event.pull_request.head?.repo)))) {
  throw Error("Event/PR repository identity mismatch");
}
let qualified = false;
let reason = "Manual PR: never automatically merged";
if (isNativeBot(pr, repository)) {
  try {
    if (pr.base.sha !== process.env.TRUSTED_BASE) throw new Error("Trusted policy base changed; requalify");
    const { commit } = await api("/branches/main");
    if (commit.sha !== pr.base.sha) throw Error("Actual main changed");
    const graph = await json("https://api.github.com/graphql", {
      authorization: "Bearer " + process.env.GH_TOKEN, "content-type": "application/json",
    }, { method: "POST", body: JSON.stringify({query:
      'query($sha:GitObjectID!){repository(owner:"johan-eilertsen",name:"react-leaflet-explorer"){nameWithOwner databaseId object(oid:$sha){... on Commit{oid author{user{login databaseId}} signature{__typename payload signature isValid state wasSignedByGitHub signer{login databaseId}} parents(first:2){totalCount nodes{oid}}}}}}', variables:{sha:pr.head.sha}}) });
    if (graph.errors) throw Error("Unknown signature evidence");
    qualifyHead(pr, await api("/commits/" + pr.head.sha), graph.data?.repository);
    const files = await api("/pulls/" + number + "/files?per_page=100");
    async function snapshot(ref) {
      const read = async (file) => {
        const value = await api("/contents/" + file + "?ref=" + ref);
        if (value.encoding !== "base64" || value.size > 2 * 1024 * 1024) throw new Error("Invalid source file");
        return JSON.parse(Buffer.from(value.content, "base64").toString("utf8"));
      };
      return { manifest: await read("package.json"), lock: await read("package-lock.json") };
    }
    const evidence = await qualify({ pr, repository, files,
      before: await snapshot(pr.base.sha), after: await snapshot(pr.head.sha), registry: {
        package: (name) => json("https://registry.npmjs.org/" + encodeURIComponent(name)),
        tarball: (url) => bytes(url),
        advisories: (name, versions) => json("https://api.osv.dev/v1/querybatch",
          { "content-type": "application/json" }, { method: "POST", body: JSON.stringify({
            queries: versions.map(version => ({ package: { name, ecosystem: "npm" }, version })) }) }),
      } });
    qualified = true;
    reason = evidence.package + " " + evidence.from + " → " + evidence.to;
  } catch (error) {
    reason = "Not qualified: " + error.message.split(String.fromCharCode(10))[0];
  }
}
const outputs = { qualified: String(qualified), head: pr.head.sha, base: pr.base.sha };
if (process.env.GITHUB_OUTPUT) {
  for (const [key, value] of Object.entries(outputs)) appendFileSync(process.env.GITHUB_OUTPUT, key + "=" + value + String.fromCharCode(10));
}
console.log(JSON.stringify({ ...outputs, reason }));
