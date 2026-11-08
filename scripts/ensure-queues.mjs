// Creates the Queues the Worker binds to when they do not exist yet, so a
// first `wrangler deploy` in a fresh Cloudflare account does not fail.
// D1 and R2 are provisioned by Wrangler itself (no ids in wrangler.jsonc).
import { spawnSync } from "node:child_process";

const QUEUES = ["mailflare-inbound", "mailflare-outbound", "mailflare-agent"];

for (const queue of QUEUES) {
	const result = spawnSync("npx", ["wrangler", "queues", "create", queue], { encoding: "utf8" });
	const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
	if (result.status === 0) {
		console.log(`Created queue ${queue}`);
	} else if (/already (exists|taken)|11009/i.test(output)) {
		console.log(`Queue ${queue} already exists`);
	} else {
		console.warn(`Could not create queue ${queue}; continuing.\n${output.trim()}`);
	}
}
