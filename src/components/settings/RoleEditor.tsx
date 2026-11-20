import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import GroupsIcon from '@mui/icons-material/Groups';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import type { ReactNode } from 'react';
import { useId } from 'react';
import type { Permission, RoleDetail } from '../../types';
import { LIMITS } from '../../utils/limits';
import { EditorCard, EditorHeader, FieldLabel } from './EditorParts';
import { fieldHeight } from './fieldSx';
import { PermissionList } from './PermissionList';
import { RoleAvatar } from './RoleAvatar';

export interface RoleDraft {
  name: string;
  description: string;
  permissionKeys: string[];
}

interface RoleEditorProps {
  role: RoleDetail;
  draft: RoleDraft;
  catalog: Permission[];
  /** Second line of the header, e.g. "IT Support · 3 members". */
  subtitle: string;
  /** Hint above the permissions (the section roles tab has one); nothing is shown when missing. */
  hint?: ReactNode;
  canEdit: boolean;
  /** Why the role cannot be deleted; the delete button is disabled and shows this as its tooltip. */
  deleteBlockedReason?: string;
  nameError?: string;
  onChange: (patch: Partial<RoleDraft>) => void;
  onResetPermissions: () => void;
  onDelete: () => void;
  /** Opens the list of people who have this role. */
  onViewMembers: () => void;
}

/** Editor of one role: name, description and the permission toggles. Used by section and workspace roles. */
export function RoleEditor({
  role,
  draft,
  catalog,
  subtitle,
  hint,
  canEdit,
  deleteBlockedReason,
  nameError,
  onChange,
  onResetPermissions,
  onDelete,
  onViewMembers,
}: RoleEditorProps) {
  const nameId = useId();
  const descriptionId = useId();

  return (
    <EditorCard>
      <EditorHeader
        leading={<RoleAvatar size={44} selected />}
        title={role.name}
        subtitle={subtitle}
        actions={
          <>
            <Button variant="outlined" color="primary" startIcon={<GroupsIcon />} onClick={onViewMembers} sx={{ color: 'primary.main', borderColor: 'primary.main', fontWeight: 500 }}>
              View members
            </Button>
            {canEdit && (
              <Tooltip title={deleteBlockedReason ?? 'Delete role'}>
                <span>
                  <IconButton aria-label="Delete role" color="error" disabled={deleteBlockedReason !== undefined} onClick={onDelete}>
                    <DeleteIcon />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </>
        }
      />
      <Box sx={{ px: 3, pt: 2, pb: '17px', display: 'grid', gridTemplateColumns: '300fr 806fr', gap: 2, flexShrink: 0, borderBottom: 1, borderColor: 'divider', ...fieldHeight(40) }}>
        <Box>
          <FieldLabel htmlFor={nameId}>Role name</FieldLabel>
          <TextField
            id={nameId}
            size="small"
            fullWidth
            value={draft.name}
            disabled={!canEdit}
            error={Boolean(nameError)}
            helperText={nameError}
            onChange={(event) => onChange({ name: event.target.value })}
            slotProps={{ htmlInput: { maxLength: LIMITS.roleName } }}
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
            slotProps={{ htmlInput: { maxLength: LIMITS.roleDescription } }}
          />
        </Box>
      </Box>
      {hint && (
        <Box sx={{ px: 3, pt: '13px', flexShrink: 0 }}>
          <Alert severity="info" sx={{ py: '3px' }}>
            {hint}
          </Alert>
        </Box>
      )}
      <PermissionList
        key={role.id}
        catalog={catalog}
        enabled={draft.permissionKeys}
        disabled={!canEdit}
        onChange={(permissionKeys) => onChange({ permissionKeys })}
        onReset={onResetPermissions}
        topPadding={hint ? undefined : '8px'}
      />
    </EditorCard>
  );
}
