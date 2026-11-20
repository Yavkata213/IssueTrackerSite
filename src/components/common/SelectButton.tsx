import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useId, useState } from 'react';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectButtonProps<T extends string> {
  /** Shown in front of the value, e.g. "View". */
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}

/** Outlined button that opens a menu: "View: Board", "Group by: Status". */
export function SelectButton<T extends string>({ label, value, options, onChange }: SelectButtonProps<T>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const current = options.find((option) => option.value === value);

  return (
    <>
      <Button
        variant="outlined"
        aria-haspopup="menu"
        aria-controls={anchor ? menuId : undefined}
        aria-expanded={anchor ? 'true' : undefined}
        onClick={(event) => setAnchor(event.currentTarget)}
        endIcon={<KeyboardArrowDownIcon />}
        sx={{ height: 40, px: 1.5, color: 'text.secondary', whiteSpace: 'nowrap', '& .MuiButton-endIcon': { ml: 0.5 } }}
      >
        {label}:&nbsp;
        <Box component="span" sx={{ color: 'text.primary', fontWeight: 500 }}>
          {current?.label}
        </Box>
      </Button>
      <Menu id={menuId} anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {options.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === value}
            onClick={() => {
              onChange(option.value);
              setAnchor(null);
            }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
