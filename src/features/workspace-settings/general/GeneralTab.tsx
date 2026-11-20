import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useId, useRef, useState } from 'react';
import { ApiError, getErrorMessage, updateWorkspaceGeneral } from '../../../api';
import type { LogoChange } from '../../../api';
import { SaveBar, WorkspaceLogo } from '../../../components/common';
import { EditorCard, EditorHeader, fieldHeight, FieldLabel, RoleAvatar } from '../../../components/settings';
import type { RoleDetail, Workspace } from '../../../types';
import { LIMITS } from '../../../utils/limits';
import { textWidth } from '../../../utils/textWidth';
import {
  isValidWorkspaceSlug,
  normalizeWorkspaceSlugInput,
  WORKSPACE_URL_SUFFIX,
} from '../../../utils/workspaceSlug';

interface GeneralDraft {
  name: string;
  slug: string;
  defaultRoleId: string;
  logo: LogoChange;
  /** Local preview (object URL) of a logo the user picked and has not saved yet. */
  logoPreview: string | null;
}

type FieldErrors = Partial<Record<'name' | 'slug' | 'defaultRoleId' | 'logo', string>>;

const LOGO_ACCEPT = 'image/png,image/jpeg';

function toDraft(workspace: Workspace, roles: RoleDetail[]): GeneralDraft {
  return {
    name: workspace.name,
    slug: workspace.slug,
    defaultRoleId: workspace.defaultRoleId ?? roles[0]?.id ?? '',
    logo: { kind: 'keep' },
    logoPreview: null,
  };
}

function isSame(a: GeneralDraft, b: GeneralDraft): boolean {
  return a.name === b.name && a.slug === b.slug && a.defaultRoleId === b.defaultRoleId && a.logo.kind === b.logo.kind;
}

/** Client-side checks; the API validates again and has the last word (for example slug uniqueness). */
function validate(draft: GeneralDraft): FieldErrors {
  const errors: FieldErrors = {};
  if (draft.name.trim() === '') errors.name = 'Workspace name is required.';
  if (!isValidWorkspaceSlug(draft.slug)) {
    errors.slug = `Use ${LIMITS.workspaceSlugMin}–${LIMITS.workspaceSlugMax} lowercase letters, digits and hyphens.`;
  }
  return errors;
}

/** Checks what the API cannot see before the upload: a square image of at least 128 x 128 px. */
async function checkLogoFile(file: File): Promise<string | null> {
  if (file.type !== 'image/png' && file.type !== 'image/jpeg') return 'The logo must be a PNG or JPG image.';
  if (file.size > LIMITS.logoBytes) return 'The logo must be at most 2 MB.';
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close();
    if (width !== height) return 'The logo must be square.';
    if (width < LIMITS.logoMinPixels) return `The logo must be at least ${LIMITS.logoMinPixels} × ${LIMITS.logoMinPixels} px.`;
    return null;
  } catch {
    return 'This file could not be read as an image.';
  }
}

interface GeneralTabProps {
  workspace: Workspace;
  roles: RoleDetail[];
  canEdit: boolean;
  onSaved: (workspace: Workspace) => void;
  onNotice: (message: string) => void;
}

/** Logo, name, URL and the default role for new members. */
export function GeneralTab({ workspace, roles, canEdit, onSaved, onNotice }: GeneralTabProps) {
  const nameId = useId();
  const slugId = useId();
  const roleLabelId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState<GeneralDraft | null>(null);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [logoError, setLogoError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const saved = toDraft(workspace, roles);
  const draft = edit ?? saved;
  const dirty = edit !== null && !isSame(edit, saved);
  const clientErrors = validate(draft);
  const errors = { ...clientErrors, ...serverErrors };
  const hasErrors = Object.keys(clientErrors).length > 0;

  const shownLogo = draft.logo.kind === 'remove' ? null : (draft.logoPreview ?? workspace.logoUrl);
  // The suffix sits right after the typed text, so the field reads like one address.
  const slugWidth = Math.ceil(textWidth(draft.slug, '400 14px Roboto')) + 2;
  const defaultRole = roles.find((r) => r.id === draft.defaultRoleId);

  const releasePreview = () => {
    if (edit?.logoPreview) URL.revokeObjectURL(edit.logoPreview);
  };

  const change = (patch: Partial<GeneralDraft>) => {
    setEdit({ ...draft, ...patch });
    setServerErrors({});
  };

  const discard = () => {
    releasePreview();
    setEdit(null);
    setServerErrors({});
    setLogoError(undefined);
  };

  const pickLogo = (file: File | undefined) => {
    if (!file) return;
    checkLogoFile(file).then((problem) => {
      setLogoError(problem ?? undefined);
      if (problem) return;
      releasePreview();
      change({ logo: { kind: 'replace', file }, logoPreview: URL.createObjectURL(file) });
    });
  };

  const save = () => {
    if (hasErrors || saving) return;
    setSaving(true);
    updateWorkspaceGeneral(workspace.id, {
      name: draft.name,
      slug: draft.slug,
      defaultRoleId: draft.defaultRoleId,
      logo: draft.logo,
    })
      .then((updated) => {
        releasePreview();
        setEdit(null);
        setLogoError(undefined);
        onSaved(updated);
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && (error.field === 'name' || error.field === 'slug' || error.field === 'defaultRoleId')) {
          setServerErrors({ [error.field]: error.message });
        } else if (error instanceof ApiError && error.field === 'logo') {
          setLogoError(error.message);
        } else {
          onNotice(getErrorMessage(error));
        }
      })
      .finally(() => setSaving(false));
  };

  return (
    <>
      <Box sx={{ pt: '23px', pb: 12 }}>
        <EditorCard>
          <EditorHeader
            leading={<RoleAvatar size={44} selected />}
            title="Workspace details"
            subtitle={`Name, URL and defaults for ${workspace.name}`}
          />
          <Box sx={{ px: 3, pt: '20px', pb: '16px', display: 'flex', flexDirection: 'column', gap: '19px', borderBottom: 1, borderColor: 'divider', ...fieldHeight(40) }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <WorkspaceLogo workspace={{ name: draft.name.trim() || workspace.name, logoUrl: shownLogo }} size={72} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: '7px' }}>
                  Workspace logo
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <input
                    ref={fileInput}
                    type="file"
                    accept={LOGO_ACCEPT}
                    hidden
                    aria-label="Workspace logo file"
                    onChange={(event) => {
                      pickLogo(event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                  <Button
                    variant="outlined"
                    color="primary"
                    disabled={!canEdit}
                    onClick={() => fileInput.current?.click()}
                    sx={{ height: 34, color: 'primary.main', borderColor: 'primary.main', fontWeight: 500 }}
                  >
                    Upload logo
                  </Button>
                  <Button
                    disabled={!canEdit || shownLogo === null}
                    onClick={() => {
                      releasePreview();
                      setLogoError(undefined);
                      change({ logo: { kind: 'remove' }, logoPreview: null });
                    }}
                    sx={{ height: 34, fontWeight: 500 }}
                  >
                    Remove
                  </Button>
                </Box>
                <Typography variant="caption" color={logoError ? 'error' : 'text.secondary'} component="div" sx={{ mt: '7px' }} role={logoError ? 'alert' : undefined}>
                  {logoError ?? 'PNG or JPG, square, at least 128 × 128 px, up to 2 MB.'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 2 }}>
              <Box>
                <FieldLabel htmlFor={nameId}>Workspace name</FieldLabel>
                <TextField
                  id={nameId}
                  size="small"
                  fullWidth
                  value={draft.name}
                  disabled={!canEdit}
                  error={Boolean(errors.name)}
                  helperText={errors.name}
                  onChange={(event) => change({ name: event.target.value })}
                  slotProps={{ htmlInput: { maxLength: LIMITS.workspaceName } }}
                />
              </Box>
              <Box>
                <FieldLabel htmlFor={slugId}>Workspace URL</FieldLabel>
                <TextField
                  id={slugId}
                  size="small"
                  fullWidth
                  value={draft.slug}
                  disabled={!canEdit}
                  error={Boolean(errors.slug)}
                  helperText={errors.slug}
                  onChange={(event) => change({ slug: normalizeWorkspaceSlugInput(event.target.value) })}
                  slotProps={{
                    htmlInput: { maxLength: LIMITS.workspaceSlugMax, spellCheck: false, autoCapitalize: 'none' },
                    input: {
                      endAdornment: (
                        <InputAdornment position="end" sx={{ ml: 0 }}>
                          <Typography variant="body2" color="text.secondary">
                            {WORKSPACE_URL_SUFFIX}
                          </Typography>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{ '& .MuiOutlinedInput-input': { pr: 0, flex: 'none', width: slugWidth } }}
                />
              </Box>
            </Box>
          </Box>
          <Box sx={{ px: 3, pt: 0, pb: '20px', ...fieldHeight(40) }}>
            <Typography id={roleLabelId} variant="caption" color="text.secondary" component="div" sx={{ mb: '6px' }}>
              Default role for new members
            </Typography>
            <Select
              size="small"
              value={defaultRole ? draft.defaultRoleId : ''}
              disabled={!canEdit}
              error={Boolean(errors.defaultRoleId)}
              onChange={(event) => change({ defaultRoleId: event.target.value })}
              inputProps={{ 'aria-labelledby': roleLabelId }}
              sx={{ width: 420 }}
            >
              {roles.map((role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.name}
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" color={errors.defaultRoleId ? 'error' : 'text.secondary'} component="div" sx={{ mt: '5px', maxWidth: 420 }}>
              {errors.defaultRoleId ?? 'Assigned when someone joins or is invited without a role chosen. Existing members are not affected.'}
            </Typography>
          </Box>
        </EditorCard>
      </Box>

      {canEdit && dirty && (
        <SaveBar
          message="Changes are saved to the workspace audit log."
          onDiscard={discard}
          onSave={save}
          saving={saving}
          saveDisabled={hasErrors}
        />
      )}
    </>
  );
}
