let context: CanvasRenderingContext2D | null | undefined;

/** Width in pixels of `text` in the given CSS font, e.g. `400 14px Roboto`. Falls back to a rough guess. */
export function textWidth(text: string, font: string): number {
  if (context === undefined) context = document.createElement('canvas').getContext('2d');
  if (!context) return text.length * 8;
  context.font = font;
  return context.measureText(text).width;
}
