/**
 * Re-link `square-one` to a sibling checkout, when there is one.
 *
 * ## The problem this exists for
 *
 * square-one is consumed as a **pinned git dependency** (planning ADR-0006) and developed in
 * the same sitting as this repo. Those two facts fight: `pnpm install` resolves the pin, fetches
 * the tarball, and replaces whatever was at `node_modules/square-one` — so every install silently
 * un-links a co-development setup, and engine edits stop showing up here with no error and no
 * message. It happened on 2026-08-21 while bumping the pin to v0.3.0, and the symptom is the
 * worst kind: the scene keeps working, on the old engine.
 *
 * Hand-symlinking it back works until the next install. This is the same fix, made to survive one.
 *
 * ## Why a script and not a `link:` dependency
 *
 * `pnpm link ../square-one` writes `"square-one": "link:../square-one"` into `package.json`, which
 * is committed, and then **CI has no sibling to link to**. The pin has to stay a pin for anyone
 * who is not co-developing — including `pnpm install --frozen-lockfile` in `ci.yml`, which is
 * exactly the case that must not change.
 *
 * So the condition is the checkout itself: link when `../square-one` is there, do nothing when it
 * is not. CI takes the second branch and never knows this ran.
 *
 * ## What it refuses to do
 *
 * - **Link an engine with no `dist/`.** square-one's `dist` is gitignored and built by its
 *   `prepare`; a sibling that has never been built would replace a working dependency with a
 *   directory that has no entry point. Loud, and skipped.
 * - **Delete anything that is not a symlink.** pnpm always leaves a symlink into `.pnpm` here. A
 *   real directory means something unexpected owns that path, and unlinking it is not this
 *   script's business.
 *
 * Set `SQUARE_ONE_NO_LINK=1` to opt out for one install — the escape hatch for checking this repo
 * against the *published* tag, which is what caught a bad `allowBuilds` key on 2026-08-21.
 */

import { existsSync, lstatSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sibling = resolve(root, "..", "square-one");
const linkPath = join(root, "node_modules", "square-one");
const say = (msg) => process.stdout.write(`link-engine: ${msg}\n`);

if (process.env["SQUARE_ONE_NO_LINK"]) {
  say("SQUARE_ONE_NO_LINK set — leaving the pinned dependency in place.");
  process.exit(0);
}

if (!existsSync(sibling)) {
  // The ordinary case for anyone who is not co-developing, and the only case in CI.
  process.exit(0);
}

if (!existsSync(join(sibling, "dist", "index.js"))) {
  say(`⚠ ${sibling} has no dist/ — run \`pnpm build\` there. Keeping the pinned dependency.`);
  process.exit(0);
}

if (existsSync(linkPath) && !lstatSync(linkPath).isSymbolicLink()) {
  say(`⚠ ${linkPath} is not a symlink. Refusing to replace it.`);
  process.exit(0);
}

const pinned = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).dependencies[
  "square-one"
];
const local = JSON.parse(readFileSync(join(sibling, "package.json"), "utf8")).version;

rmSync(linkPath, { force: true });
symlinkSync(sibling, linkPath, "dir");

// The versions are printed every time on purpose. A sibling that has drifted from the pin is the
// thing this script makes easy to stop noticing, so the one place it cannot hide is here.
say(`linked → ${sibling}`);
say(`  pinned ${pinned}  ·  local ${local}`);
