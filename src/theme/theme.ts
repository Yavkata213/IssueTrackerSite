import { alpha, createTheme } from '@mui/material/styles';
import type { PaletteOptions, Theme } from '@mui/material/styles';
import type { Priority } from '../types';

type VisiblePriority = Exclude<Priority, 'NONE'>;

declare module '@mui/material/styles' {
  interface Palette {
    /** Fixed priority colours. `NONE` has no colour on purpose. */
    priority: Record<VisiblePriority, string>;
    /** Neutral surfaces used by the app chrome. */
    surface: {
      page: string;
      column: string;
      columnCount: string;
      groupHeader: string;
      field: string;
      /** Outline of fields and outlined controls (the card outline is `divider`). */
      fieldBorder: string;
    };
    /** Avatar background colours, picked by a hash of the user id. */
    avatars: string[];
    /** Swatches offered when choosing a category colour. */
    categoryColors: string[];
  }
  interface PaletteOptions {
    priority?: Record<VisiblePriority, string>;
    surface?: Palette['surface'];
    avatars?: string[];
    categoryColors?: string[];
  }
}

export type ThemeMode = 'light' | 'dark';

const FONT_FAMILY = '"Roboto", "Helvetica", "Arial", sans-serif';

/** Colours that mean the same in both modes. */
const SHARED_PALETTE: PaletteOptions = {
  avatars: ['#1976D2', '#9C27B0', '#D81B60', '#00897B', '#EF6C00', '#5E35B1', '#00838F', '#6D4C41'],
  categoryColors: [
    '#0277BD',
    '#9C27B0',
    '#2E7D32',
    '#EF6C00',
    '#00796B',
    '#455A64',
    '#D32F2F',
    '#F9A825',
    '#6D4C41',
    '#AD1457',
    '#3949AB',
    '#546E7A',
  ],
};

// Light: the Figma design. Dark: derived from it (there is no dark design), with the same roles.
const PALETTES: Record<ThemeMode, PaletteOptions> = {
  light: {
    ...SHARED_PALETTE,
    mode: 'light',
    primary: { main: '#1976D2' },
    success: { main: '#2E7D32' },
    warning: { main: '#ED6C02' },
    error: { main: '#D32F2F' },
    info: { main: '#0288D1' },
    text: { primary: 'rgba(0, 0, 0, 0.87)', secondary: 'rgba(0, 0, 0, 0.6)', disabled: 'rgba(0, 0, 0, 0.38)' },
    divider: 'rgba(0, 0, 0, 0.12)',
    background: { default: '#F5F6F8', paper: '#FFFFFF' },
    priority: { URGENT: '#D32F2F', HIGH: '#ED6C02', MEDIUM: '#0288D1', LOW: '#757575' },
    surface: {
      page: '#F5F6F8',
      column: '#EEF1F5',
      columnCount: '#DBDEE2',
      groupHeader: '#F5F5F5',
      field: '#F5F5F5',
      fieldBorder: 'rgba(0, 0, 0, 0.23)',
    },
  },
  dark: {
    ...SHARED_PALETTE,
    mode: 'dark',
    primary: { main: '#90CAF9' },
    success: { main: '#66BB6A' },
    warning: { main: '#FFA726' },
    error: { main: '#EF5350' },
    info: { main: '#4FC3F7' },
    text: { primary: 'rgba(255, 255, 255, 0.92)', secondary: 'rgba(255, 255, 255, 0.64)', disabled: 'rgba(255, 255, 255, 0.42)' },
    divider: 'rgba(255, 255, 255, 0.12)',
    background: { default: '#0F1115', paper: '#1A1D23' },
    priority: { URGENT: '#EF5350', HIGH: '#FFA726', MEDIUM: '#4FC3F7', LOW: '#9E9E9E' },
    surface: {
      page: '#0F1115',
      column: '#161920',
      columnCount: '#2B2F38',
      groupHeader: '#21252C',
      field: '#21252C',
      fieldBorder: 'rgba(255, 255, 255, 0.23)',
    },
  },
};

/**
 * The one theme of the app, in the light or the dark variant. Components use palette tokens and
 * theme callbacks only, so nothing outside this file has a colour of its own.
 */
export function createAppTheme(mode: ThemeMode): Theme {
  return createTheme({
    palette: PALETTES[mode],
    shape: { borderRadius: 4 },
    typography: {
      fontFamily: FONT_FAMILY,
      fontWeightRegular: 400,
      fontWeightMedium: 500,
      h1: { fontSize: 32, fontWeight: 400, lineHeight: '40px', letterSpacing: 0 },
      h2: { fontSize: 16, fontWeight: 500, lineHeight: '24px', letterSpacing: 0 },
      body1: { fontSize: 14, lineHeight: '20px', letterSpacing: 0 },
      body2: { fontSize: 14, lineHeight: '20px', letterSpacing: 0 },
      caption: { fontSize: 12, lineHeight: '16px', letterSpacing: 0 },
      overline: { fontSize: 12, lineHeight: '16px', fontWeight: 400, letterSpacing: 0, textTransform: 'uppercase' },
      button: { fontSize: 14, fontWeight: 400, textTransform: 'none', letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: (theme) => ({
          'html, body, #root': { height: '100%' },
          body: { backgroundColor: theme.palette.background.default },
        }),
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 4 },
          outlined: ({ theme }) => ({
            color: theme.palette.text.primary,
            borderColor: theme.palette.surface.fieldBorder,
            backgroundColor: theme.palette.background.paper,
            '&:hover': { borderColor: theme.palette.text.primary, backgroundColor: theme.palette.background.paper },
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 4,
            backgroundColor: theme.palette.background.paper,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.surface.fieldBorder },
          }),
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 400 },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 4, alignItems: 'center' },
          standard: ({ ownerState, theme }) =>
            ownerState.severity === 'info'
              ? theme.palette.mode === 'dark'
                ? {
                    backgroundColor: alpha(theme.palette.info.main, 0.16),
                    color: theme.palette.info.light,
                    '& .MuiAlert-icon': { color: theme.palette.info.main },
                  }
                : {
                    backgroundColor: '#E5F6FD',
                    color: '#014361',
                    '& .MuiAlert-icon': { color: '#0288D1' },
                  }
              : {},
        },
      },
      MuiPaper: {
        styleOverrides: {
          rounded: { borderRadius: 8 },
          // In dark mode MUI tints raised surfaces with a white overlay; the design is flat.
          root: { backgroundImage: 'none' },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: ({ theme }) => ({
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.palette.mode === 'dark' ? '0px 4px 16px rgba(0, 0, 0, 0.5)' : '0px 4px 12px rgba(0, 0, 0, 0.12)',
          }),
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 4,
            '&.Mui-selected': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.14) },
            },
          }),
        },
      },
      MuiDivider: {
        styleOverrides: { root: ({ theme }) => ({ borderColor: theme.palette.divider }) },
      },
    },
  });
}
