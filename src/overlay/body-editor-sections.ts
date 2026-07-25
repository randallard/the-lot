/**
 * The collapsible section names shared by BodyEditor and BodyEditorModal.
 *
 * These live in their own module rather than alongside the component: a file
 * that exports both components and non-component values defeats React Fast
 * Refresh, which is what `react-refresh/only-export-components` guards against.
 */

export type Section = "head" | "body" | "forearm" | "hand" | "layout" | "eyes";

export const ALL_SECTIONS: Section[] = ["head", "body", "forearm", "hand", "layout", "eyes"];
