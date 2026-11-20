import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Popover from '@mui/material/Popover';
import { alpha, useTheme } from '@mui/material/styles';
import { useState } from 'react';
import type { MouseEvent } from 'react';
import type { Category } from '../../types';
import { safeColor } from '../../utils/colors';

type Density = 'card' | 'row';

function CategoryChip({ category, density }: { category: Category; density: Density }) {
  const { palette } = useTheme();
  const color = safeColor(category.color, palette.grey[700]);
  return (
    <Chip
      size="small"
      label={category.name}
      sx={{
        height: density === 'card' ? 22 : 24,
        borderRadius: density === 'card' ? '11px' : '12px',
        fontSize: 12,
        fontWeight: 500,
        color,
        bgcolor: alpha(color, 0.12),
        '& .MuiChip-label': { px: density === 'card' ? '18px' : '10px' },
      }}
    />
  );
}

interface CategoryChipsProps {
  categories: Category[];
  /** Board cards use roomier chips than table rows. */
  density?: Density;
}

/**
 * Shows the first category. When the issue has more, a "+N" chip next to it opens
 * a popover with all categories of the issue.
 */
export function CategoryChips({ categories, density = 'card' }: CategoryChipsProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (categories.length === 0) return null;

  const [first, ...rest] = categories;
  const open = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchor(event.currentTarget);
  };

  return (
    <>
      <CategoryChip category={first} density={density} />
      {rest.length > 0 && (
        <>
          <Chip
            size="small"
            label={`+${rest.length}`}
            onClick={open}
            aria-label={`Show all ${categories.length} categories`}
            sx={{
              height: density === 'card' ? 22 : 24,
              borderRadius: density === 'card' ? '11px' : '12px',
              fontSize: 12,
              fontWeight: 500,
              bgcolor: 'action.hover',
              '& .MuiChip-label': { px: 1 },
            }}
          />
          <Popover
            open={Boolean(anchor)}
            anchorEl={anchor}
            onClose={() => setAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            slotProps={{ paper: { sx: { mt: 0.5, p: 1, maxWidth: 280 } } }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {categories.map((category) => (
                <CategoryChip key={category.id} category={category} density={density} />
              ))}
            </Box>
          </Popover>
        </>
      )}
    </>
  );
}
