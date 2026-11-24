import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';
import { useId } from 'react';
import type { CategoryDetail } from '../../../types';
import { isHexColor, readableOnMode, safeColor } from '../../../utils/colors';
import { LIMITS } from '../../../utils/limits';
import { EditorCard, EditorHeader, fieldHeight, FieldLabel } from '../../../components/settings';
import { ColorSwatches } from './ColorSwatches';

export interface CategoryDraft {
  name: string;
  description: string;
  /** What is typed in the hex field; only valid `#RRGGBB` values can be saved. */
  color: string;
  showOnCards: boolean;
  isArchived: boolean;
}

interface CategoryEditorProps {
  category: CategoryDetail;
  draft: CategoryDraft;
  sectionName: string;
  canEdit: boolean;
  nameError?: string;
  onChange: (patch: Partial<CategoryDraft>) => void;
  onDelete: () => void;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Typography variant="h2" sx={{ fontSize: 16, lineHeight: '24px' }}>
      {children}
    </Typography>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Box sx={{ minHeight: 62, pt: '9px', display: 'flex', alignItems: 'flex-start', gap: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </Box>
      <Switch sx={{ mt: '-4px' }} checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} slotProps={{ input: { 'aria-label': label } }} />
    </Box>
  );
}

function issuesLabel(count: number): string {
  return `${count} ${count === 1 ? 'issue' : 'issues'}`;
}

/** Editor of one category: name, description, colour, behaviour and a live preview. */
export function CategoryEditor({ category, draft, sectionName, canEdit, nameError, onChange, onDelete }: CategoryEditorProps) {
  const { palette } = useTheme();
  const nameId = useId();
  const descriptionId = useId();
  const hexId = useId();

  const colorValid = isHexColor(draft.color);
  const color = safeColor(draft.color, palette.grey[700]);
  const headerColor = safeColor(category.color, palette.grey[700]);

  return (
    <EditorCard>
      <EditorHeader
        height={92}
        leading={<Box aria-hidden sx={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', bgcolor: headerColor }} />}
        title={category.name}
        subtitle={`${issuesLabel(category.issueCount)} in ${sectionName} use this category`}
        actions={
          canEdit ? (
            <Button variant="outlined" color="error" onClick={onDelete} sx={{ color: 'error.main', borderColor: 'error.main', px: '25px' }}>
              Delete category
            </Button>
          ) : undefined
        }
      />
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 3, pt: 2, pb: 3, display: 'flex', flexDirection: 'column', gap: '11px' }}>
        <SectionTitle>Details</SectionTitle>
        <Box sx={{ display: 'grid', gridTemplateColumns: '520fr 588fr', columnGap: 3, rowGap: '22px', ...fieldHeight(44) }}>
          <Box>
            <FieldLabel htmlFor={nameId}>Name</FieldLabel>
            <TextField
              id={nameId}
              size="small"
              fullWidth
              value={draft.name}
              disabled={!canEdit}
              error={Boolean(nameError)}
              helperText={nameError}
              onChange={(event) => onChange({ name: event.target.value })}
              slotProps={{ htmlInput: { maxLength: LIMITS.categoryName } }}
            />
          </Box>
          <Box>
            <FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
            <TextField
              id={descriptionId}
              size="small"
              fullWidth
              value={draft.description}
              disabled={!canEdit}
              onChange={(event) => onChange({ description: event.target.value })}
              slotProps={{ htmlInput: { maxLength: LIMITS.categoryDescription } }}
            />
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <SectionTitle>Colour</SectionTitle>
              <Typography variant="caption" color="text.secondary">
                Used for the category chip on cards, filters and the issue panel.
              </Typography>
            </Box>
            <ColorSwatches value={draft.color} onChange={(next) => onChange({ color: next })} disabled={!canEdit} />
            <Box>
              <FieldLabel htmlFor={hexId}>Hex</FieldLabel>
              <TextField
                id={hexId}
                size="small"
                value={draft.color}
                disabled={!canEdit}
                error={!colorValid}
                helperText={colorValid ? undefined : 'Use the form #RRGGBB.'}
                onChange={(event) => onChange({ color: event.target.value.trim().slice(0, 7) })}
                slotProps={{
                  htmlInput: { maxLength: 7, spellCheck: false },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box aria-hidden sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ width: 170 }}
              />
            </Box>
            <Box sx={{ mt: '9px', mb: '-5px' }}>
              <SectionTitle>Preview</SectionTitle>
            </Box>
            <Box sx={{ height: 92, px: 2.5, display: 'flex', alignItems: 'center', gap: 3, bgcolor: 'surface.field', borderRadius: 1 }}>
              <Chip
                size="small"
                label={draft.name.trim() || category.name}
                sx={{ height: 24, borderRadius: '12px', fontWeight: 500, color: readableOnMode(color, palette.mode), bgcolor: alpha(color, 0.12), '& .MuiChip-label': { px: '14px' } }}
              />
              <Chip
                size="small"
                label={draft.name.trim() || category.name}
                sx={{ height: 24, borderRadius: '12px', fontWeight: 500, color: 'common.white', bgcolor: color, '& .MuiChip-label': { px: '14px' } }}
              />
              <Typography variant="caption" color="text.secondary">
                On cards and filters
              </Typography>
            </Box>
          </Box>

          <Box>
            <Box sx={{ mb: 1 }}>
              <SectionTitle>Behaviour</SectionTitle>
            </Box>
            <ToggleRow
              label="Show on board cards"
              hint="Display this category as a chip on issue cards."
              checked={draft.showOnCards}
              disabled={!canEdit}
              onChange={(showOnCards) => onChange({ showOnCards })}
            />
            <ToggleRow
              label="Archived"
              hint="Hidden from new issues; existing issues keep it."
              checked={draft.isArchived}
              disabled={!canEdit}
              onChange={(isArchived) => onChange({ isArchived })}
            />
          </Box>
        </Box>
      </Box>
    </EditorCard>
  );
}
