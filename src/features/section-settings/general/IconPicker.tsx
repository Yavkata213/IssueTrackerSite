import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { alpha } from '@mui/material/styles';
import { SectionIcon } from '../../../components/common';
import { SECTION_ICON_NAMES } from '../../../utils/sectionIcons';

interface IconPickerProps {
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
}

function iconLabel(name: string): string {
  return name.replace(/_/g, ' ');
}

/** The fixed set of section icons as a grid of 56 px tiles. The chosen tile has a primary outline. */
export function IconPicker({ value, onChange, disabled = false }: IconPickerProps) {
  return (
    <Box role="group" aria-label="Section icon" sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 56px)', gap: 1 }}>
      {SECTION_ICON_NAMES.map((name) => {
        const selected = name === value;
        return (
          <ButtonBase
            key={name}
            disabled={disabled}
            aria-label={iconLabel(name)}
            aria-pressed={selected}
            onClick={() => onChange(name)}
            sx={{
              width: 56,
              height: 56,
              borderRadius: 1,
              border: selected ? 2 : 1,
              borderStyle: 'solid',
              borderColor: selected ? 'primary.main' : 'divider',
              bgcolor: selected ? (t) => alpha(t.palette.primary.main, 0.08) : 'background.paper',
              color: selected ? 'primary.main' : 'action.active',
              '&:hover': { bgcolor: selected ? undefined : 'action.hover' },
            }}
          >
            <SectionIcon name={name} />
          </ButtonBase>
        );
      })}
    </Box>
  );
}
