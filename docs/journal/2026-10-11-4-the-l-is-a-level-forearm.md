# 2026-10-11 (4) — the L is a level forearm

Ryan watched [(3)](2026-10-11-3-a-dial-moves-what-hangs-off-it.md)'s three corrections on
`#review=california-twirl/under-arch/player-ember`: *"good on all three things to review — all
look good."* So accepted by eye, and committed with this entry:

- the dials are drawn, not solved — what hangs off a stretched part moves with it;
- a stretch belongs to the arm in the hold;
- a broken turn-under passes no closer than the pair's reshape (`passRoom`). 🧪 Still no ADR.

## What the L is for — said, not yet drawn

Ryan, of the forearm and upper arm in the L:

> *"the whole point is for the forearm to sit parallel to the floor… maybe for the elbow to be
> above the head so the dancer can turn under it — let me draw it for you tomorrow."*

🔑 **This is the first statement of what `full-l` is *for*, and it is not what is built.**
ADR-0058 stands the upper arm up as the hands climb and lets the forearm go wherever reaching the
join puts it. His L is the other way round: the **forearm level** is the requirement, and the
elbow's height (above her own crown, so she turns under her own forearm) is what makes it
possible. The hand's position follows from those two, rather than the arm following from the
hand.

🔴 **Do not build from this paragraph.** He is drawing it. The "maybe" on the elbow is his.

Questions the picture should answer:

- Whose arm — the one turning under only, or both dancers'?
- Is the elbow above the crown, or level with it and out to the side?
- Where is the partner's hand when her forearm is level — on top of hers, palm to palm, and at
  what height does *his* arm have to be to get there?
- Does the level forearm hold for the whole span or only at the named `under-arch` step?

## State

Suite **932 passing / 38 failing / 3 skipped** (the same 38), `tsc -b` clean, eslint 0 errors.
Everything is committed and pushed home (`gr push --only the-lot`).

## Next

1. **Ryan's drawing of the L.** Then the L is built to it — likely the first *authored* pose
   rather than another rung on `sizeArch`, which is what the 10-10 approach is for.
2. The contact sheet (PROGRESS worklist 17), checker throttled to pose changes first.
3. Parked: Dosado and Pass Thru without the fold.
