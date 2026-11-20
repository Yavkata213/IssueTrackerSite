import InputBase from '@mui/material/InputBase';
import { useState } from 'react';
import { LIMITS } from '../../../utils/limits';
import { useAutosave } from '../useAutosave';

interface TitleInputProps {
  /** The saved title. */
  value: string;
  editable: boolean;
  fontSize: number;
  onSave: (title: string) => void;
}

/** The title as a large text field: it saves a moment after typing stops and when it loses focus. */
export function TitleInput({ value, editable, fontSize, onSave }: TitleInputProps) {
  const [draft, setDraft] = useState(value);
  const { schedule, flush } = useAutosave<string>((title) => {
    if (title !== value) onSave(title);
  });

  return (
    <InputBase
      multiline
      fullWidth
      value={draft}
      readOnly={!editable}
      onChange={(event) => {
        const next = event.target.value.replace(/\n/g, ' ');
        setDraft(next);
        // An empty title is not saved: the field goes back to the saved one when it loses focus.
        if (next.trim() !== '') schedule(next.trim());
      }}
      onBlur={() => {
        if (draft.trim() === '') setDraft(value);
        flush();
      }}
      inputProps={{ 'aria-label': 'Issue title', maxLength: LIMITS.issueTitle }}
      sx={{ alignItems: 'flex-start', fontSize, lineHeight: 1.3, fontWeight: 400, p: 0 }}
    />
  );
}
