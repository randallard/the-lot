# 2026-10-31 (14): launch-game.test.ts

Ryan: *"start on launch-game.test.ts."* There were 27 findings: each test decoded the launch URL's
`#lot=` payload with `JSON.parse`, which returns `any`, and read fields off it
(`no-unsafe-assignment` ×8, `no-unsafe-member-access` ×19).

Without a cast, each payload is now `unknown`:
- `expect(payload.x).toBe(v)` became `expect(payload).toHaveProperty("x", v)`.
- `expect(payload.x).toBeUndefined()` became `expect(payload).not.toHaveProperty("x")`. After a
  JSON round trip an undefined field is absent, so it's the same claim.

Checked that the new assertions aren't vacuous: a wrong `npcId` and a present `agentType` each
fail their test, and restored, all 11 pass. The rest: 1,240 tests pass; `pnpm lint` has 0 errors
and 8 warnings. **The strict count: 621 → 594.**

## Next

`pose-rules.ts` (26), `api/npc-chat.ts` (24), `twirl-model.ts` (23).
