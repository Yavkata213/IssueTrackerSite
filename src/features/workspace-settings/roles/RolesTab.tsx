import LockIcon from '@mui/icons-material/Lock';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { useState } from 'react';
import {
  ApiError,
  assignWorkspaceRole,
  createWorkspaceRole,
  deleteWorkspaceRole,
  getErrorMessage,
  listWorkspaceRoleCandidates,
  listWorkspaceRoleMembers,
  resetWorkspaceMemberRole,
  updateWorkspaceRole,
} from '../../../api';
import { ConfirmDialog, SaveBar } from '../../../components/common';
import {
  EditorCard,
  ListPanel,
  ListPanelItem,
  RoleAvatar,
  RoleEditor,
  RoleMembersPanel,
  useEditorDraft,
} from '../../../components/settings';
import type { RoleDraft, RoleMembersSource } from '../../../components/settings';
import type { Permission, RoleDetail, Workspace } from '../../../types';
import type { PatchWorkspaceData } from '../types';

function toDraft(role: RoleDetail): RoleDraft {
  return {
    name: role.name,
    description: role.description ?? '',
    permissionKeys: [...role.permissionKeys].sort(),
  };
}

function isSame(a: RoleDraft, b: RoleDraft): boolean {
  return (
    a.name === b.name &&
    a.description === b.description &&
    [...a.permissionKeys].sort().join('|') === [...b.permissionKeys].sort().join('|')
  );
}

function uniqueName(base: string, taken: string[]): string {
  const lower = new Set(taken.map((name) => name.toLowerCase()));
  if (!lower.has(base.toLowerCase())) return base;
  let n = 2;
  while (lower.has(`${base} ${n}`.toLowerCase())) n += 1;
  return `${base} ${n}`;
}

function membersLabel(count: number): string {
  return `${count} ${count === 1 ? 'member' : 'members'}`;
}

/** The Owner role is built in and locked: it always has every permission. */
function isLocked(role: RoleDetail): boolean {
  return role.isSystem;
}

interface RolesTabProps {
  workspace: Workspace;
  roles: RoleDetail[];
  catalog: Permission[];
  canEdit: boolean;
  /** May give people a role and take it away (`workspace.members.roles.assign`). */
  canAssign: boolean;
  patchData: PatchWorkspaceData;
  onNotice: (message: string) => void;
  /** Member counts changed: the page loads the roles again. */
  onMembersChanged: () => void;
}

/** Workspace roles: list on the left, editor with permission toggles on the right. */
export function RolesTab({ workspace, roles, catalog, canEdit, canAssign, patchData, onNotice, onMembersChanged }: RolesTabProps) {
  const editor = useEditorDraft({ items: roles, toDraft, isEqual: isSame });
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const { selected, draft, saved } = editor;
  const editable = canEdit && selected !== undefined && !isLocked(selected);

  const save = () => {
    if (!selected || !draft || saving) return;
    if (draft.name.trim() === '') {
      setNameError('Role name is required.');
      return;
    }
    setSaving(true);
    updateWorkspaceRole(workspace.id, selected.id, draft)
      .then((role) => {
        patchData((data) => ({ ...data, roles: data.roles.map((r) => (r.id === role.id ? role : r)) }));
        editor.discard();
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.field === 'name') setNameError(error.message);
        else onNotice(getErrorMessage(error));
      })
      .finally(() => setSaving(false));
  };

  const add = () => {
    if (editor.dirty) {
      onNotice('Save or discard your changes before adding a role.');
      return;
    }
    createWorkspaceRole(workspace.id, {
      name: uniqueName('New role', roles.map((r) => r.name)),
      description: '',
      permissionKeys: [],
    })
      .then((role) => {
        patchData((data) => ({ ...data, roles: [...data.roles, role] }));
        editor.select(role.id);
      })
      .catch((error: unknown) => onNotice(getErrorMessage(error)));
  };

  const remove = () => {
    if (!selected) return;
    setBusy(true);
    deleteWorkspaceRole(workspace.id, selected.id)
      .then(() => {
        patchData((data) => ({ ...data, roles: data.roles.filter((r) => r.id !== selected.id) }));
        editor.discard();
      })
      .catch((error: unknown) => onNotice(getErrorMessage(error)))
      .finally(() => {
        setBusy(false);
        setConfirmDelete(false);
      });
  };

  const membersSource: RoleMembersSource | null = selected
    ? {
        load: () => listWorkspaceRoleMembers(workspace.id, selected.id),
        loadCandidates: (search) => listWorkspaceRoleCandidates(workspace.id, selected.id, search),
        add: (user) => assignWorkspaceRole(workspace.id, selected.id, user.id),
        remove: (user) => resetWorkspaceMemberRole(workspace.id, selected.id, user.id),
      }
    : null;

  const deleteBlockedReason = selected?.isSystem
    ? 'Built-in roles cannot be deleted'
    : selected?.id === workspace.defaultRoleId
      ? 'This is the default role for new members'
      : undefined;

  return (
    <>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 3, pt: '23px', pb: 3 }}>
        <ListPanel
          title="Workspace roles"
          addLabel="Add role"
          onAdd={canEdit ? add : undefined}
          footer={
            <Alert severity="info" sx={{ py: '3px' }}>
              Workspace roles cover organisation-wide actions. Access to a section’s issues is set under Section roles.
            </Alert>
          }
        >
          {roles.map((role) => (
            <ListPanelItem
              key={role.id}
              selected={role.id === selected?.id}
              onSelect={() => {
                setNameError(undefined);
                editor.requestSelect(role.id);
              }}
              leading={<RoleAvatar size={40} selected={role.id === selected?.id} />}
              title={role.name}
              titleAdornment={
                role.isSystem ? (
                  <Chip size="small" label="System role" sx={{ height: 20, fontSize: 11, bgcolor: 'action.selected' }} />
                ) : undefined
              }
              trailing={isLocked(role) ? <LockIcon aria-label="Locked" sx={{ fontSize: 18, color: 'action.active' }} /> : undefined}
              subtitle={`${membersLabel(role.memberCount)} · ${role.permissionKeys.length}/${catalog.length} permissions`}
            />
          ))}
        </ListPanel>
        {selected && draft && saved ? (
          <RoleEditor
            role={selected}
            draft={draft}
            catalog={catalog}
            subtitle={`Workspace · ${membersLabel(selected.memberCount)}`}
            canEdit={editable}
            deleteBlockedReason={deleteBlockedReason}
            nameError={nameError}
            onChange={(patch) => {
              setNameError(undefined);
              editor.update(patch);
            }}
            onResetPermissions={() => editor.update({ permissionKeys: saved.permissionKeys })}
            onDelete={() => setConfirmDelete(true)}
            onViewMembers={() => setMembersOpen(true)}
          />
        ) : (
          <EditorCard>{null}</EditorCard>
        )}
      </Box>

      {editable && editor.dirty && selected && (
        <SaveBar
          message={`Changes apply immediately to ${membersLabel(selected.memberCount)} and are saved to the workspace audit log.`}
          onDiscard={() => {
            setNameError(undefined);
            editor.discard();
          }}
          onSave={save}
          saving={saving}
        />
      )}

      {selected && membersSource && (
        <RoleMembersPanel
          open={membersOpen}
          onClose={() => setMembersOpen(false)}
          title={`${selected.name} members`}
          subtitle={`Workspace · ${membersLabel(selected.memberCount)}`}
          dateLabel="Joined"
          source={membersSource}
          canManage={canAssign && !isLocked(selected)}
          removeTitle="Change role?"
          removeMessage={(user) => `${user.displayName} will get the default role for new members instead of ${selected.name}.`}
          removeLabel="Change role"
          onChanged={onMembersChanged}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete role?"
        message={`The role “${selected?.name ?? ''}” will be deleted. This cannot be undone.`}
        confirmLabel="Delete role"
        destructive
        busy={busy}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={editor.pendingId !== null}
        title="Discard unsaved changes?"
        message="Your changes to this role will be lost."
        confirmLabel="Discard"
        onConfirm={() => {
          if (editor.pendingId) editor.select(editor.pendingId);
        }}
        onClose={editor.cancelPending}
      />
    </>
  );
}
