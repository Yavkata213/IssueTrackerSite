import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import type { TextFieldProps } from '@mui/material/TextField';
import { useState } from 'react';
import { LIMITS } from '../../utils/limits';

type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'slotProps'> & {
  /** `new-password` for a password that is chosen, `current-password` for one that is typed to sign in. */
  autoComplete: 'new-password' | 'current-password';
};

/** Password input with a button that shows or hides what was typed. */
export function PasswordField({ autoComplete, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      fullWidth
      slotProps={{
        htmlInput: { autoComplete, maxLength: LIMITS.passwordMax + 28 },
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                edge="end"
                size="small"
                aria-label={visible ? 'Hide password' : 'Show password'}
                onClick={() => setVisible((value) => !value)}
                onMouseDown={(event) => event.preventDefault()}
              >
                {visible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
