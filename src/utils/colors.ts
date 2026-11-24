import { lighten } from '@mui/material/styles';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/**
 * Colours come from the backend (status and category colours), so they are untrusted.
 * Only `#RRGGBB` is accepted; anything else falls back, so a bad value can never reach
 * the styles or make `alpha()` throw.
 */
export function safeColor(value: string | null | undefined, fallback: string): string {
  return value !== null && value !== undefined && HEX_COLOR.test(value) ? value : fallback;
}

/**
 * Colour for text that sits on a tint of the same colour (category chips). Dark category colours
 * would be hard to read on a dark page, so they are lightened there.
 */
export function readableOnMode(color: string, mode: 'light' | 'dark'): string {
  return mode === 'dark' ? lighten(color, 0.45) : color;
}
