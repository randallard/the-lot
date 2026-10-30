/**
 * 🧪 The calls a caller says, for the voice test (2026-10-29, `#voice-test`).
 *
 * Proof 3 of the north star (`work/square-dance-planning/briefs/north-star-caller-practice.md`):
 * can a spoken call be recognised fast enough to dance it on the beat? The vocabulary is
 * CALLERLAB's Basic and Mainstream lists (`square-one/reference/callerlab/`, the definitions'
 * contents), whether or not square-one dances the call yet. Recognition doesn't need the engine,
 * and the test should face the whole vocabulary a caller will use.
 *
 * `say` is what the page prompts. `heard` is every way a recogniser writes it: "through" and
 * "thru", "do sa do", a fraction spelled out. `dancing` marks the calls square-one dances today.
 */

export interface VoiceCall {
  readonly id: string;
  /** What the page asks you to say. */
  readonly say: string;
  /** Extra spellings a recogniser may produce, beyond the normalisation in `match-call.ts`. */
  readonly heard: readonly string[];
  readonly program: "basic" | "mainstream";
  /** square-one dances it today (couples, facing couples, Star Thru). */
  readonly dancing?: true;
}

const c = (id: string, say: string, program: VoiceCall["program"], heard: readonly string[] = [], dancing?: true): VoiceCall =>
  dancing === undefined ? { id, say, heard, program } : { id, say, heard, program, dancing };

export const VOICE_CALLS: readonly VoiceCall[] = [
  // Basic
  c("circle-left", "circle left", "basic"),
  c("circle-right", "circle right", "basic"),
  c("forward-and-back", "forward and back", "basic", ["up to the middle and back"]),
  c("dosado", "dosado", "basic", ["do sa do", "do si do", "dosey doe", "dosie doe", "do-si-do", "dosi do", "doe see doe", "dosey do"], true),
  c("swing", "swing", "basic", ["swing your partner"]),
  c("promenade", "promenade", "basic", ["promenade home"]),
  c("allemande-left", "allemande left", "basic", ["alaman left", "allemand left", "aleman left", "allemande lift", "alamo left"], true),
  c("arm-turn", "turn by the right", "basic", ["turn by the left", "arm turn"]),
  c("right-and-left-grand", "right and left grand", "basic", ["grand right and left"]),
  c("right-hand-star", "right hand star", "basic", ["star right", "make a right hand star"]),
  c("left-hand-star", "left hand star", "basic", ["star left", "make a left hand star"]),
  c("pass-thru", "pass thru", "basic", ["past through", "pass true"], true),
  c("half-sashay", "half sashay", "basic", ["half sachet", "half sashet"]),
  c("u-turn-back", "u turn back", "basic", ["you turn back"]),
  c("separate", "separate", "basic"),
  c("split-two", "split two", "basic", ["split 2", "split to"]),
  c("courtesy-turn", "courtesy turn", "basic"),
  c("ladies-chain", "ladies chain", "basic", ["two ladies chain", "four ladies chain", "ladies change"]),
  c("do-paso", "do paso", "basic", ["dopaso", "do pass o"]),
  c("lead-right", "lead right", "basic", ["lead to the right"]),
  c("lead-left", "lead left", "basic", ["lead to the left"]),
  c("veer-left", "veer left", "basic", ["vere left"]),
  c("veer-right", "veer right", "basic", ["vere right"]),
  c("bend-the-line", "bend the line", "basic"),
  c("circulate", "circulate", "basic", ["all eight circulate", "couples circulate", "boys circulate", "girls circulate"]),
  c("right-and-left-thru", "right and left thru", "basic", ["right and left true"], true),
  c("grand-square", "grand square", "basic"),
  c("star-thru", "star thru", "basic", ["star true", "start through", "start thru"], true),
  c("double-pass-thru", "double pass thru", "basic"),
  c("first-couple-go-left", "first couple go left", "basic", ["first couple left"]),
  c("california-twirl", "california twirl", "basic", ["california twirled"], true),
  c("walk-around-the-corner", "walk around the corner", "basic", ["walk around your corner"]),
  c("see-saw", "see saw", "basic", ["seesaw"]),
  c("square-thru", "square thru four", "basic", ["square thru", "square thru 4", "square thru three", "square thru two"]),
  c("circle-to-a-line", "circle to a line", "basic"),
  c("dive-thru", "dive thru", "basic", ["dive true"]),
  c("wheel-around", "wheel around", "basic"),
  c("box-the-gnat", "box the gnat", "basic", ["box the nat", "box a gnat", "box the knot"]),
  c("partner-trade", "partner trade", "basic", ["partner traded"], true),
  c("couples-trade", "couples trade", "basic"),
  c("ocean-wave", "balance", "basic", ["step to a wave", "step to an ocean wave"]),
  c("alamo-style", "alamo style", "basic"),
  c("swing-thru", "swing thru", "basic", ["swing true"]),
  c("left-swing-thru", "left swing thru", "basic"),
  c("run", "boys run", "basic", ["girls run", "centers run", "ends run"]),
  c("pass-the-ocean", "pass the ocean", "basic"),
  c("extend", "extend", "basic"),
  c("wheel-and-deal", "wheel and deal", "basic", ["wheel and deel"]),
  c("zoom", "zoom", "basic", ["centers zoom"]),
  c("flutterwheel", "flutterwheel", "basic", ["flutter wheel"]),
  c("reverse-flutterwheel", "reverse flutterwheel", "basic", ["reverse flutter wheel"]),
  c("sweep-a-quarter", "sweep a quarter", "basic", ["sweep 1/4", "sweep a 1/4"]),
  c("trade-by", "trade by", "basic", ["trade bye", "trade buy"]),
  c("touch-a-quarter", "touch a quarter", "basic", ["touch 1/4", "touch a 1/4"]),
  c("ferris-wheel", "ferris wheel", "basic", ["ferriswheel"]),
  // Basic family members said in their own words (2026-10-30, after "chain down the line" was missed)
  c("wrong-way-promenade", "wrong way promenade", "basic"),
  c("star-promenade", "star promenade", "basic"),
  c("weave-the-ring", "weave the ring", "basic"),
  c("wrong-way-grand", "wrong way grand", "basic"),
  c("rollaway", "rollaway", "basic", ["roll away", "rollaway half sashay"]),
  c("ladies-in-men-sashay", "ladies in men sashay", "basic"),
  c("backtrack", "backtrack", "basic", ["back track"]),
  c("chain-down-the-line", "chain down the line", "basic"),
  c("left-square-thru", "left square thru four", "basic", ["left square thru"]),
  c("reverse-wheel-around", "reverse wheel around", "basic"),
  c("trade", "boys trade", "basic", ["girls trade", "centers trade", "ends trade", "everybody trade"]),
  c("cross-run", "centers cross run", "basic", ["cross run", "boys cross run", "girls cross run"]),
  // Mainstream
  c("cloverleaf", "cloverleaf", "mainstream", ["clover leaf"]),
  c("turn-thru", "turn thru", "mainstream", ["turn true"]),
  c("left-turn-thru", "left turn thru", "mainstream"),
  c("eight-chain-thru", "eight chain thru", "mainstream", ["8 chain thru", "eight chain four", "8 chain 4"]),
  c("pass-to-the-center", "pass to the center", "mainstream"),
  c("single-hinge", "single hinge", "mainstream"),
  c("couples-hinge", "couples hinge", "mainstream"),
  c("centers-in", "centers in", "mainstream"),
  c("cast-off-three-quarters", "cast off three quarters", "mainstream", ["cast off 3/4", "cast off three quarter"]),
  c("spin-the-top", "spin the top", "mainstream"),
  c("walk-and-dodge", "walk and dodge", "mainstream"),
  c("slide-thru", "slide thru", "mainstream", ["slide true"]),
  c("fold", "boys fold", "mainstream", ["girls fold", "ends fold"]),
  c("cross-fold", "cross fold", "mainstream"),
  c("dixie-style", "dixie style to a wave", "mainstream", ["dixie style"]),
  c("spin-chain-thru", "spin chain thru", "mainstream"),
  c("tag-the-line", "tag the line", "mainstream"),
  c("half-tag", "half tag", "mainstream", ["1/2 tag"]),
  c("scoot-back", "scoot back", "mainstream", ["scootback"]),
  c("recycle", "recycle", "mainstream"),
  // Mainstream family members said in their own words (2026-10-30)
  c("allemande-thar", "allemande thar", "mainstream", ["allemande tar"]),
  c("wrong-way-thar", "wrong way thar", "mainstream"),
  c("slip-the-clutch", "slip the clutch", "mainstream"),
  c("shoot-the-star", "shoot the star", "mainstream"),
  c("shoot-the-star-full-around", "shoot the star full around", "mainstream"),
  c("quarter-tag", "quarter tag", "mainstream", ["1/4 tag"]),
  c("three-quarter-tag", "three quarter tag", "mainstream", ["3/4 tag"]),
];
