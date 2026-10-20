# 2026-10-19 (1) — the disk becomes rings

Ryan, on `#review2`'s floor: the hex disk was smooth but *"doesn't look like a circle"*. He asked
for 5 couples round the focus, then 9, then 10 outermost (1 + 5 + 9 + 10 = 25, every pairing), and
at first for no straight line of focus, inner couple and outer couple.

## What changed

- `couple-disk.ts`: concentric rings (`RINGS = [5, 9, 10]`, with more rings past those for bigger
  floors). Positions are free points in spacing units, not hex lattice points. `toWorld` replaces
  `hexToWorld`.
- Each ring is **evenly spaced**. Ring 1 has a couple straight behind the focus, so the camera's
  side (+z) is open. Each outer ring is turned as far off the inner couples' sight lines as even
  spacing allows (ring 2 gets 4° off ring 1, the most that 9 against 5 can manage).
- A refocus keeps the new focus where it stands and gives everyone else the nearest free spot,
  closest pairs first. Lattice points no longer line up between disks, so `CoupleSlot` **glides**
  short moves (under 0.75 spacing) and fades only long ones. Without that, every refocus would
  blink all 24 couples.

## The detour

Even spacing and "no lines" can't both hold. 5, 9 and 10 evenly spaced always leave some pair
within 2–4° of lining up, however each ring is turned. The first attempt therefore put each outer
ring into the gaps between the inner sight lines, spaced unevenly. Ryan: *"don't worry about
lines — even spacing around their circle is more important"*. So it's even spacing, turned only
as far as it can go. Ryan's verdict on the result: **"ring disk is perfect."**

Tests: `couple-disk.test.ts` checks the ring counts, even spacing, the turn, the open front, and
that a refocus keeps the focus where it stands. Suite 1085 / the same 38.

## Reference photos

Ryan and Brianna's California twirl, both ways round, is now filed in
`work/square-dance-planning/review2/reference/california-twirl/` with a frame index. Under the arch
the joined hands are over the belle's own crown, which confirms 09-26.
