# 2026-08-21 — the hold nobody asked about

_Documents [ADR-0033](../adr/0033-the-forearm-hold-is-a-reach-a-pair-can-fail.md), landed in
`5b21918`, plus the pin bump to square-one v0.3.0. Fourth chunk of the day; the third
([ADR-0032](../adr/0032-the-accommodation-belongs-to-the-hold-not-to-the-arch.md)) is what made
it a small change instead of a large one._

Ryan, after the generalisation chunks:

> I want to make sure we remember the two different styles of accommodation for the reach in
> california twirl

Remembering them turned out to mean using them somewhere else. ADR-0032 lifted `reshape` and
`break` out from under `arch.ts` and named the gap in the same breath: the **forearm** hold —
the arm-turn grip, Allemande Left — had no accommodation, and nothing asked whether the two
dancers could reach it.

## Nothing had ever asked

`gripHeight` averages the pair's two resting elbows. `gripPose` places both forearms at that
height. Between them there is no question, and `gripHeight`'s own doc has carried the answer it
would have got since the fist bump: *past a big enough height difference the taller dancer does
nearly all the accommodating, because an adult can drop their arm to a child's height and the
child cannot raise theirs to the adult's.*

A joined forearm lies horizontal at one shared height, so each dancer's elbow has to be **at**
it, and an elbow hangs off the shoulder on an upper arm of fixed length. Measured: Ember's elbow
rests at 1.095, the mean she shares with Myco is 0.857, and her upper arm will not reach down
0.238. **Two of the three shipped pairings cannot make the hold they were being posed in.**

That is the second time this month a defect has been sitting inside a doc comment. ADR-0028's
was the same sentence, arriving somewhere it could not be deferred.

## The reshape is better here than it is for an arch

Growing the dancer whose elbow is **lower** by `d` and shrinking the other by `d` moves their
elbows `±d/2`. Both close on the mean, and the mean **does not move** — so the hold is made
reachable without being relocated. The arch's version cannot say that: there, the beau's
constraint has a `d` in it and the belle's has none, and the whole figure shifts.

Same lever, same constant, a cleaner result, and none of that would have been visible while the
lever lived in a module named for arches.

## The first version was inverted and looked fine

I signed the reshape by whose **shortfall** was larger rather than by whose **elbow was lower**.
On the shipped cast Myco can reach the mean and Ember cannot, so the shortfall test grew *Ember*
— the taller — and pushed her elbow further from the line it had to meet. It finished **0.511**
apart where a break finished 0.238.

Everything about it passed. It planned, it clamped, it produced deltas, it typechecked, and it
made the hold worse than doing nothing. What caught it was printing the two accommodations side
by side, which no test in the repo did — the arch suite checks each one against its own geometry
and never against the other.

So the guard is now explicit: **a reshape never finishes further apart than a break.** An
accommodation has to beat the alternative it was chosen over. That is not a property of the
arch's code either; it is a property of there being two of them, and it should have existed from
the day there were.

## The last measurement across the seam

square-one v0.3.0 added `gripRadius` with nothing supplying it. It is read out of the pose rather
than invented — `gripPose` puts the hand at `contactRadius` from the pivot and walks the forearm
back, so the shoulder lands `forearmSpan − contactRadius` behind and the body a further `restX`,
because the dancers face tangentially and it is the inside shoulder that is over the pivot.

It comes out **smaller** than the engine's own `ORBIT_RADIUS` on every shipped pairing —
0.205–0.274 against 0.300. That is square-one's ADR-0021 exception doing exactly what it was
carved out for: a clearance is room a figure must find and a grip is a place to put a hand, so
this cast dances a *tighter* Allemande than the body-agnostic figure and flooring it would have
drawn one they cannot reach. The one measurement of the four that is allowed to shrink a figure
is the one that needed to.

`applyCallToPair` takes a shape now too. Allemande Left is danced by a **facing pair**, so
passing bodies only down the couple path would have missed the single call this number exists
for — which is the kind of near-miss that looks like a working seam.

## And the pin bump found a comment that had been wrong for days

`pnpm-workspace.yaml`'s `allowBuilds` entry claimed it was keyed by package name *"rather than
the tarball URL pnpm suggests — that URL embeds the commit hash and would need editing on every
square-one tag"*. The line beneath it was the URL, with v0.2.0's hash in it.

Both halves stayed true and unexamined because the local symlink meant pnpm never fetched the
tarball. Bumping the pin fetched it, the install stopped, `square-one: true` was tried and
rejected, and the comment now says what the file does: **this line changes on every tag.**

The upside is that the whole suite then ran against the **published** v0.3.0 rather than against
a symlink, which is the tag validated end to end. The symlink is back afterwards, because
co-development wants it.
