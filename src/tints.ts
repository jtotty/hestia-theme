/**
 * The wash strengths shared by both editor targets.
 *
 * Every number here was settled by measuring contrast rather than by taste,
 * and both editors paint the same three things - a changed line, the changed
 * characters inside it, and their outline - over live code. Keeping them in
 * one neutral module means a measurement is re-argued once, not per editor.
 *
 * `TINT_MARGIN` is not here: the diff margin is a VSCode-only key, so it stays
 * private to src/workbench.ts alongside the reasoning for its value.
 */

/**
 * The scrollbar, minimap and notebook-scrollbar thumbs.
 *
 * `fgSubtle`, a light neutral, rather than the dark `fgFaint` these carried
 * while they were opaque. A dark thumb over the overview ruler reads as a
 * hole punched in the marks; a light one at low opacity reads as a lens laid
 * over them, and the marks keep their hue through it.
 *
 * The base opacity is 0.1 because `fgSubtle` at 0.1 over the editor
 * background lands within one step of the opaque `fgFaint` at 0.3 it
 * replaces, so the thumb is exactly as findable as before on plain
 * background while no longer occluding anything. Hover and active ascend
 * from there.
 */
export const SLIDER = { base: 0.1, hover: 0.18, active: 0.26 } as const

/** Whole changed line or region: present, but never competing with the code. */
export const TINT_LINE = [0.04, 0.04] as const

/**
 * The exact changed characters inside such a line.
 *
 * Lightness is 0.06 rather than 0.07 because the jade hue is the greenest of
 * the roles this is applied to, and at 0.07 it landed at 4.45:1 - just under
 * AA. At 0.06 the worst case across every hue used here is 4.61:1.
 */
export const TINT_WORD = [0.06, 0.07] as const

/**
 * The outline drawn around the changed characters.
 *
 * Darker than the fill it surrounds rather than brighter. It has to differ
 * from the fill or it does not render at all, but the previous value was the
 * role at 0.55 alpha, which put a bright edge around every changed word. A
 * recessed edge defines the same boundary without adding a second bright line.
 */
export const TINT_EDGE = [0.03, 0.07] as const
