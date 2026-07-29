# 2026-07-28 (4) — One resolver, and a gate that wasn't running

*Documents commit `98f44a9`. Continues from
[enforcing the limited channels](2026-07-28-3-enforcing-the-limited-channels.md).*

The last thing ADR-0010 named as owed. And while proving the new safeguard worked, the
proof turned up something worse than the thing it was proving.

## The resolver

`expression-channels.ts` is now the one place the contract is *decided*. The mechanisms
stay where they were and stay separately testable — `arm-pose.ts` folds and grips arms,
`silhouette-limit.ts` clips shape — because they are how, not what. Policy in one file,
mechanism in two, and the driver reduced to writing rigs from a result.

The reason this was worth doing is narrower than tidiness, and it is the ADR's own fail-safe
rule: **an unclassified channel is owned.** While the arbitration was spread through the
frame loop, that rule held only because nobody had wired a new field up. An omission — which
is to say an accident, and the same accident that let the silhouette channels sit unapplied
for a day while an accepted ADR said otherwise.

Two changes make it structural:

1. **`CHANNELS` is `Record<keyof ResolvedPose, Channel>`.** Add a field to `ResolvedPose`
   and this file stops compiling until someone classifies it.
2. **`ResolvedExpression` has no field for an owned channel.** The driver writes rigs from
   the resolver's output, never from the emote's pose, so `bodyDeltaRotY` isn't dropped by
   remembering to skip it — there is nowhere for it to arrive.

The second one is the one I'd keep. A rule enforced by a missing field cannot be forgotten;
a rule enforced by not writing a line can only be remembered.

## Testing the safeguard, and finding the gate

Adding a `Record<keyof T, …>` is easy; believing it fires is another thing, so I added a
fake channel to `ResolvedPose` and ran the typecheck expecting an error.

**No error.** Which was alarming for about a minute and then much worse, because
`NEUTRAL_POSE` was now missing a required field too and *that* did not error either. Nothing
was being typechecked at all.

`tsconfig.json` is solution-style: `"files": []` and references to `tsconfig.app.json` and
`tsconfig.node.json`. `tsc --noEmit` against it has no files to check, so it does nothing and
exits 0 — indistinguishable from success. The real gate is `tsc -b`, which is what
`npm run build` runs. Running `vite build` alone doesn't cover it either: esbuild strips
types without reading them.

I had been reporting "typecheck clean" from the vacuous command all session, and the journal
entries above say it too. **Nothing was actually broken** — `tsc -b --force` passes on the
whole tree, so the committed code is sound, and eslint's type-aware rules had been doing real
work the whole time. But the gate had not been running, and a gate you believe in that isn't
running is worse than one you know you're missing.

Under the real command the check fires exactly as designed:

```
src/dance/expression-channels.ts(72,14): error TS2741: Property 'tailWagDelta' is missing
  in type '{ bodyDeltaRotY: "owned"; … }' but required in type
  'Readonly<Record<keyof ResolvedPose, Channel>>'.
```

This repo has now paid for the same lesson three times: **the CI half's ADR-0009 note about
a supply-chain control you have not verified, the `.npmrc` age gate square-one thought it
had, and now a typecheck command that checks nothing.** All three looked green. It is written
into PROGRESS.md as a warned command rather than left as folklore.

## Tests

10 new, 295 total. The two that matter both assert the fail-safe rather than the feature:
every key of a `ResolvedPose` is classified (belt to the compiler's braces, in case the type
is ever loosened), and a pose with `bodyDeltaRotY: 360` resolves *identically* to one without
— field by field, because there is no field that could differ.

## What this did not change

Behaviour. Every rig gets the same numbers it got before; the arm, silhouette and free
channels resolve exactly as they did this morning. Worth stating because a refactor of the
frame loop that changed what a dancer looks like would be a bug, and the 285 pre-existing
tests passing unchanged is the evidence.

M4's ADR work is now closed: contract written, every channel classified, implemented,
verified on screen, and enforced somewhere a future field cannot slip past.
