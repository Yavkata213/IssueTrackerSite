import { alpha, createTheme } from '@mui/material/styles';
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

const PRIMARY = '#1976D2';
const TEXT_PRIMARY = 'rgba(0, 0, 0, 0.87)';
const TEXT_SECONDARY = 'rgba(0, 0, 0, 0.6)';
const OUTLINE_FIELD = 'rgba(0, 0, 0, 0.23)';
const OUTLINE_CARD = 'rgba(0, 0, 0, 0.12)';

export const theme = createTheme({
  palette: {
    primary: { main: PRIMARY },
    success: { main: '#2E7D32' },
    warning: { main: '#ED6C02' },
    error: { main: '#D32F2F' },
    info: { main: '#0288D1' },
    text: { primary: TEXT_PRIMARY, secondary: TEXT_SECONDARY, disabled: 'rgba(0, 0, 0, 0.38)' },
    divider: OUTLINE_CARD,
    background: { default: '#F5F6F8', paper: '#FFFFFF' },
    priority: {
      URGENT: '#D32F2F',
      HIGH: '#ED6C02',
      MEDIUM: '#0288D1',
      LOW: '#757575',
    },
    surface: {
      page: '#F5F6F8',
      column: '#EEF1F5',
      columnCount: '#DBDEE2',
      groupHeader: '#F5F5F5',
      field: '#F5F5F5',
    },
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
  },
  shape: { borderRadius: 4 },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
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
      styleOverrides: {
        'html, body, #root': { height: '100%' },
        body: { backgroundColor: '#F5F6F8' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 4 },
        outlined: {
          color: TEXT_PRIMARY,
          borderColor: OUTLINE_FIELD,
          backgroundColor: '#FFFFFF',
          '&:hover': { borderColor: TEXT_PRIMARY, backgroundColor: '#FFFFFF' },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          backgroundColor: '#FFFFFF',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: OUTLINE_FIELD },
        },
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
        standard: ({ ownerState }) =>
          ownerState.severity === 'info'
            ? {
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
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: { border: `1px solid ${OUTLINE_CARD}`, boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.12)' },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          '&.Mui-selected': {
            backgroundColor: alpha(PRIMARY, 0.1),
            color: PRIMARY,
            '&:hover': { backgroundColor: alpha(PRIMARY, 0.14) },
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: OUTLINE_CARD } },
    },
  },
});
