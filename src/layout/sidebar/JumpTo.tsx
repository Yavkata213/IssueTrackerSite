import SearchIcon from '@mui/icons-material/Search';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paths } from '../../app/paths';
import { useWorkspace } from '../../app/workspaceContext';
import { SectionIcon } from '../../components/common';
import type { SidebarSection } from '../../types';

const INPUT_ID = "jump-to-input";

/** "Jump to…" field: filters the sections by name and opens the chosen one. Focus with Ctrl K. */
export function JumpTo() {
  const { sections } = useWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById(INPUT_ID)?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Autocomplete<SidebarSection>
      id={INPUT_ID}
      fullWidth
      autoHighlight
      clearOnBlur
      blurOnSelect
      forcePopupIcon={false}
      options={sections}
      value={null}
      getOptionLabel={(option) => option.name}
      noOptionsText="No sections found"
      onChange={(_event, section) => {
        if (section) navigate(paths.section(section.key));
      }}
      renderOption={(props, section) => {
        const { key, ...rest } = props;
        return (
          <Box component="li" key={key} {...rest} sx={{ gap: 1.5 }}>
            <SectionIcon name={section.icon} sx={{ color: 'action.active' }} />
            {section.name}
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Jump to…"
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
              endAdornment: (
                <Box
                  component="kbd"
                  sx={{
                    px: 0.75,
                    py: '1px',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 0.5,
                    bgcolor: 'background.paper',
                    color: 'text.secondary',
                    font: 'inherit',
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Ctrl K
                </Box>
              ),
            },
          }}
          sx={(theme) => ({
            '& .MuiOutlinedInput-root': {
              height: 36,
              py: 0,
              pl: '12px',
              pr: '8px !important',
              bgcolor: theme.palette.surface.field,
              '& fieldset': { border: 'none' },
              '& input': { p: 0, fontSize: 14 },
            },
          })}
        />
      )}
    />
  );
}
