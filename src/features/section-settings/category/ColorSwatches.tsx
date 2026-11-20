import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { useTheme } from '@mui/material/styles';

interface ColorSwatchesProps {
  /** Current colour as `#RRGGBB` (any letter case). */
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

/** The colours offered for a category, as round swatches. The current one has a ring. */
export function ColorSwatches({ value, onChange, disabled = false }: ColorSwatchesProps) {
  const { palette } = useTheme();
  return (
    <Box role="group" aria-label="Category colour" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {palette.categoryColors.map((color) => {
        const selected = color.toLowerCase() === value.toLowerCase();
        return (
          <ButtonBase
            key={color}
            disabled={disabled}
            aria-label={color}
            aria-pressed={selected}
            onClick={() => onChange(color)}
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              bgcolor: color,
              outline: selected ? `2px solid ${color}` : 'none',
              outlineOffset: 2,
            }}
          />
        );
      })}
    </Box>
  );
}
