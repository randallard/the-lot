# ADR-0077: Renovate stays off the Vercel build quota: no previews for its branches, and it runs on Monday mornings
- Status: Accepted
- Date: 2026-11-22
- Deciders: Ryan ("Do it - also write 0077 - and schedule for Monday morning at 2am pacific time", 2026-11-22; proposed by Claude)

## Context
Vercel's Git integration builds a preview for every push to every branch, and this project is on
the Hobby plan, which caps builds. Since [ADR-1023](1023-routine-renovate-updates-merge-themselves.md)
Renovate merges routine updates by itself, and `main` requires branches to be up to date. So each
merge sends Renovate back to rebase every other open PR, and each rebase is a push that Vercel
builds. On 2026-11-22, with about 14 Renovate PRs open, the-lot used roughly 140 preview builds and
8 production builds between 07:00 and 22:00 UTC, nearly all the previews on `renovate/*` branches.

That cost two things:

- **The quota was gone for real work.** Vercel answered with its build rate limit, so a preview of a
  branch Ryan was working on would have failed the same way.
- **Automerge stalled.** Renovate won't automerge while any check fails, required or not. #18
  (cargo-deny-action v2.1.3) passed all 8 required checks, but its Vercel check failed on the
  rate limit, so it sat.

Nobody looks at a Renovate preview: automerge exists so nobody has to. The checks that gate those
PRs are CI's, and none of them is Vercel.

## Decision
Renovate's work doesn't spend Vercel builds, and it happens while nobody is working:

- **`vercel.json` turns off Git deployments for `renovate/**` branches**
  (`git.deploymentEnabled`). Those branches get no preview and no Vercel check. `main` still
  deploys to production, and every other branch still gets a preview.
- **`renovate.json` runs Renovate on Monday mornings, Pacific time**: `"timezone":
  "America/Los_Angeles"` and `"schedule": ["* 2-7 * * 1"]`, which is 2:00 to 7:59 on Mondays.
  `lockFileMaintenance` gets the same window. `config:recommended` would otherwise run it before
  4am UTC on Mondays.

The window opens at 2am as Ryan asked, and stays open until 8am, not for just the 2am hour. The
hosted Renovate app runs on its own cadence, not continuously, so a one-hour window could pass
with no run at all. And because `main` requires up-to-date branches, the open PRs merge one at a
time, each needing a rebase and a CI run first. Six hours leaves room for several of those.

## Alternatives considered
- **Turn off previews only, no schedule.** That alone fixes the quota and the stalled automerge,
  but the PRs and their CI runs would still land at any hour. Ryan chose a fixed window.
- **Group routine updates into one weekly PR.** One rebase per merge instead of fourteen, but
  ADR-1023 already turned this down: one red package holds back the rest of the group.
- **Upgrade the Vercel plan.** That spends money on builds nobody looks at.
- **An `ignoreCommand` that skips Renovate builds.** Vercel still starts each build and reports
  it as canceled. `deploymentEnabled` never starts one, which is simpler and posts nothing on the
  PR.

## Consequences
- Routine updates arrive weekly instead of within a day. With the one-day age gate (ADR-1007,
  ADR-1016), an update can wait up to about eight days.
- Automerge isn't scheduled (`automergeSchedule` stays at any time), so a PR that turns green
  outside the window can still merge. Rebases, and so new CI runs, happen only in the window. If
  more PRs are open than one window can merge, the rest wait for the next Monday.
- Renovate's security PRs (`vulnerabilityAlerts`) skip the schedule by its documented default.
  That hasn't been seen here yet.
- A Renovate PR that changes how the app builds gets no preview. The production build of `main`
  after the merge is where a Vercel-only failure would show up. If that ever happens, revisit this
  by giving that class of update a preview back.
- This is project config, not template policy. The template has no Vercel integration, and
  square-one doesn't deploy to Vercel.
- Promotion condition: if a weekly window lets an update wait long enough to matter, or another
  project here hits the same quota, take it to the template as an ADR there.
