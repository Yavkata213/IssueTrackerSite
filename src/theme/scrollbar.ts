/** Width of the thin scrollbars used on the board and in the table. */
export const SCROLLBAR_SIZE = 8;

/** Thin grey scrollbar, as in the design. Include it in the `sx` of a scrollable element. */
export const thinScrollbar = {
  '@supports not selector(::-webkit-scrollbar)': {
    scrollbarWidth: 'thin',
    scrollbarColor: '#9E9E9F transparent',
  },
  '&::-webkit-scrollbar': { width: SCROLLBAR_SIZE, height: SCROLLBAR_SIZE },
  '&::-webkit-scrollbar-track': { backgroundColor: 'transparent', borderRadius: SCROLLBAR_SIZE / 2 },
  '&::-webkit-scrollbar-thumb': { backgroundColor: '#9E9E9F', borderRadius: SCROLLBAR_SIZE / 2 },
} as const;
