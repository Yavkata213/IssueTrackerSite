/** Fixes the height of a single-line outlined field to the design (the theme's 14 px text is shorter than MUI's default). */
export function fieldHeight(height: number) {
  return { '& .MuiOutlinedInput-root:not(.MuiInputBase-multiline)': { height } } as const;
}
