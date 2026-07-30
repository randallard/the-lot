/**
 * Opens the interaction wheel without a drag — ADR-0015's non-dragging path, and the
 * reason it is a requirement rather than a convenience.
 *
 * The wheel's main gesture is hold-and-flick, which WCAG **2.5.7 Dragging Movements**
 * (AA) says must have a single-pointer alternative, and **2.5.1 Pointer Gestures** (A)
 * says the same for path-based gestures. A long press is also the part of the design
 * most hostile to tremor and motor impairment, so this is the accommodation, not a
 * shortcut.
 *
 * **Why it is a button rather than a tap on the NPC.** ADR-0015 words the alternative
 * as "tap to open and tap a wedge", but tapping an NPC already opens chat, and taking
 * that over would trade one lost interaction for another. So the opener lives in the
 * button row beside the pocket and emote buttons, and the wheel it opens is `sticky`:
 * it stays up with no pointer held, and a wedge is chosen by tapping it.
 *
 * **Unlike its neighbours, it renders on every device.** `PocketButton` and the emote
 * button hide themselves behind `"ontouchstart" in window`, which is reasonable for a
 * convenience control and wrong for this one — a mouse user who cannot hold a button
 * down, or anyone driving the page from a keyboard, needs it exactly as much as a
 * thumb does. It is a real `<button>`, so it answers Enter and Space for free.
 */

interface WheelButtonProps {
  onOpen: () => void;
  /** Nothing to show yet — still rendered, so the affordance does not come and go. */
  disabled?: boolean;
}

export function WheelButton({ onOpen, disabled }: WheelButtonProps) {
  return (
    <button
      onClick={onOpen}
      disabled={disabled}
      aria-label="Open the interaction wheel"
      title="Interactions"
      style={{
        position: "fixed",
        bottom: 40,
        // Third in the row: pocket at 40, emotes at 104.
        right: 168,
        width: 56,
        height: 56,
        borderRadius: "50%",
        background: "rgba(255, 255, 255, 0.15)",
        border: "2px solid rgba(255, 255, 255, 0.3)",
        color: "rgba(255, 255, 255, 0.5)",
        fontSize: 22,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "manipulation",
      }}
    >
      ◎
    </button>
  );
}
