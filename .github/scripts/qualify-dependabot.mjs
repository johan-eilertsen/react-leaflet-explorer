import { appendFileSync } from "node:fs";
import { isNativeBot, qualify } from "./dependabot-policy.mjs";

const repository = process.env.GITHUB_REPOSITORY;
const number = Number(process.env.PR_NUMBER);
if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "") || !Number.isSafeInteger(number) || number < 1) {
  throw new Error("Invalid repository or PR number");
}
async function bytes(url, headers = {}, maximum = 2 * 1024 * 1024) {
  const response = await fetch(url, { headers, redirect: "error", signal: AbortSignal.timeout(30000) });
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
const json = async (url, headers) => JSON.parse(await bytes(url, headers));
const api = (path) => json("https://api.github.com/repos/" + repository + path, {
  authorization: "Bearer " + process.env.GH_TOKEN,
  accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
});
const pr = await api("/pulls/" + number);
let qualified = false;
let reason = "Manual PR: never automatically merged";
if (isNativeBot(pr, repository)) {
  try {
    if (pr.base.sha !== process.env.TRUSTED_BASE) throw new Error("Trusted policy base changed; requalify");
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
