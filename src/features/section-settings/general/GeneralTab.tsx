import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ApiError, getErrorMessage, updateSectionGeneral } from '../../../api';
import { useWorkspace } from '../../../app/workspaceContext';
import { SaveBar } from '../../../components/common';
import type { Section } from '../../../types';
import { LIMITS } from '../../../utils/limits';
import { fieldHeight } from '../../../components/settings';
import { IconPicker } from './IconPicker';
import { SidebarPreview } from './SidebarPreview';

interface GeneralDraft {
  name: string;
  key: string;
  icon: string;
  description: string;
}

type FieldErrors = Partial<Record<'name' | 'key', string>>;

const KEY_PATTERN = /^[A-Z]{2,5}$/;

function toDraft(section: Section): GeneralDraft {
  return { name: section.name, key: section.key, icon: section.icon, description: section.description ?? '' };
}

function isSame(a: GeneralDraft, b: GeneralDraft): boolean {
  return a.name === b.name && a.key === b.key && a.icon === b.icon && a.description === b.description;
}

/** Client-side checks; the API validates again and has the last word (e.g. key uniqueness). */
function validate(draft: GeneralDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (draft.name.trim() === '') errors.name = 'Section name is required.';
  if (!KEY_PATTERN.test(draft.key)) errors.key = 'Use 2 to 5 capital letters.';
  return errors;
}

function CardHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Box>
      <Typography variant="h2" sx={{ fontSize: 20, lineHeight: '24px' }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Box>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        px: 3,
        pt: '22px',
        pb: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      {children}
    </Box>
  );
}

interface GeneralTabProps {
  workspaceId: string;
  section: Section;
  canEdit: boolean;
  onSaved: (section: Section) => void;
  onNotice: (message: string) => void;
}

/** Name, key, description and icon of the section. */
export function GeneralTab({ workspaceId, section, canEdit, onSaved, onNotice }: GeneralTabProps) {
  const { sections } = useWorkspace();
  const [edit, setEdit] = useState<GeneralDraft | null>(null);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const saved = toDraft(section);
  const draft = edit ?? saved;
  const dirty = edit !== null && !isSame(edit, saved);
  const clientErrors = validate(draft);
  const errors = { ...clientErrors, ...serverErrors };
  const hasErrors = Object.keys(clientErrors).length > 0;

  const change = (patch: Partial<GeneralDraft>) => {
    setEdit({ ...draft, ...patch });
    setServerErrors({});
  };

  const discard = () => {
    setEdit(null);
    setServerErrors({});
  };

  const save = () => {
    if (hasErrors || saving) return;
    setSaving(true);
    updateSectionGeneral(workspaceId, section.id, draft)
      .then((updated) => {
        setEdit(null);
        onSaved(updated);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && (error.field === 'name' || error.field === 'key')) {
          setServerErrors({ [error.field]: error.message });
        } else {
          onNotice(getErrorMessage(error));
        }
      })
      .finally(() => setSaving(false));
  };

  const other = sections.find((s) => s.id !== section.id);
  const previewName = draft.name.trim() === '' ? section.name : draft.name.trim();

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: '940fr 612fr', gap: 3, pt: 3, pb: 12 }}>
        <Card>
          <CardHeading title="Identification" subtitle="How this section is named and referenced across the workspace." />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '36px', mt: '12px', ...fieldHeight(56) }}>
            <TextField
              label="Section name"
              value={draft.name}
              disabled={!canEdit}
              error={Boolean(errors.name)}
              helperText={errors.name}
              onChange={(event) => change({ name: event.target.value })}
              slotProps={{ htmlInput: { maxLength: LIMITS.sectionName } }}
              fullWidth
            />
            <Box>
              <TextField
                label="Section key"
                value={draft.key}
                disabled={!canEdit}
                error={Boolean(errors.key)}
                helperText={errors.key ?? '2–5 capital letters, unique in the workspace'}
                onChange={(event) => change({ key: event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5) })}
                slotProps={{ htmlInput: { maxLength: 5 }, formHelperText: { sx: { whiteSpace: 'nowrap' } } }}
                sx={{ width: 220 }}
              />
              <Alert severity="info" sx={{ mt: '17px', py: 1 }}>
                Issue ids in this section look like {draft.key || 'IT'}-152. Changing the key renames them; old links keep
                working and redirect.
              </Alert>
            </Box>
            <TextField
              label="Description"
              value={draft.description}
              disabled={!canEdit}
              onChange={(event) => change({ description: event.target.value })}
              multiline
              minRows={4}
              fullWidth
              helperText={`${draft.description.length} / ${LIMITS.sectionDescription}`}
              slotProps={{
                htmlInput: { maxLength: LIMITS.sectionDescription },
                formHelperText: { sx: { textAlign: 'right' } },
              }}
            />
          </Box>
        </Card>

        <Card>
          <CardHeading title="Icon" subtitle="Shown next to the section name in the sidebar." />
          <IconPicker value={draft.icon} onChange={(icon) => change({ icon })} disabled={!canEdit} />
          <Box>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
              Sidebar preview
            </Typography>
            <SidebarPreview
              name={previewName}
              icon={draft.icon}
              other={other ? { name: other.name, icon: other.icon } : undefined}
            />
          </Box>
          <Typography variant="caption" color="text.secondary">
            Icons come from a fixed set so every section looks consistent. Only section admins can change it.
          </Typography>
        </Card>
      </Box>

      {canEdit && dirty && (
        <SaveBar
          message="Changes apply to the sidebar, breadcrumbs and issue ids of this section."
          onDiscard={discard}
          onSave={save}
          saving={saving}
          saveDisabled={hasErrors}
        />
      )}
    </>
  );
}
