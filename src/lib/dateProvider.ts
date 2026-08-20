/**
 * Single source of truth for "now". Every place in the app that needs the
 * current date/time imports getNow() from here instead of calling `new
 * Date()` directly — keeps "today" derivation centralized in one spot
 * instead of scattered across components, and gives a single seam to swap
 * or mock if the app ever needs to simulate a different "now".
 */
export const getNow = (): Date => new Date();
