import Box from '@mui/material/Box';
import { useState } from 'react';
import {
  addSectionMember,
  ApiError,
  createRole,
  deleteRole,
  getErrorMessage,
  listSectionMemberCandidates,
  listSectionRoleMembers,
  removeSectionMember,
  updateRole,
} from '../../../api';
import { ConfirmDialog, SaveBar } from '../../../components/common';
import type { Permission, Section, RoleDetail } from '../../../types';
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
import type { PatchSettingsData } from '../types';

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

function roleSubtitle(role: RoleDetail, catalogSize: number): string {
  const members = `${role.memberCount} ${role.memberCount === 1 ? 'member' : 'members'}`;
  const count = role.permissionKeys.length;
  return `${members} · ${count === 0 ? 'View only' : `${count}/${catalogSize} permissions`}`;
}

interface MembersRolesTabProps {
  workspaceId: string;
  section: Section;
  roles: RoleDetail[];
  catalog: Permission[];
  canEdit: boolean;
  patchData: PatchSettingsData;
  onNotice: (message: string) => void;
  /** Member counts changed: the page loads the roles again. */
  onMembersChanged: () => void;
}

/** Roles of the section: list on the left, editor with permission toggles on the right. */
export function MembersRolesTab({ workspaceId, section, roles, catalog, canEdit, patchData, onNotice, onMembersChanged }: MembersRolesTabProps) {
  const editor = useEditorDraft({ items: roles, toDraft, isEqual: isSame });
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const { selected, draft, saved } = editor;

  const membersSource: RoleMembersSource | null = selected
    ? {
        load: () => listSectionRoleMembers(workspaceId, section.id, selected.id),
        loadCandidates: (search) => listSectionMemberCandidates(workspaceId, section.id, search),
        add: (user) => addSectionMember(workspaceId, section.id, selected.id, user.id),
        remove: (user) => removeSectionMember(workspaceId, section.id, user.id),
      }
    : null;

  const replaceRole = (role: RoleDetail) =>
    patchData((data) => ({ ...data, roles: data.roles.map((r) => (r.id === role.id ? role : r)) }));

  const save = () => {
    if (!selected || !draft || saving) return;
    if (draft.name.trim() === '') {
      setNameError('Role name is required.');
      return;
    }
    setSaving(true);
    updateRole(workspaceId, section.id, selected.id, draft)
      .then((role) => {
        replaceRole(role);
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
    createRole(workspaceId, section.id, {
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
    deleteRole(workspaceId, section.id, selected.id)
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

  return (
    <>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 3, pt: 3, pb: 3 }}>
        <ListPanel title={`Roles in ${section.name}`} addLabel="Add role" onAdd={canEdit ? add : undefined}>
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
              subtitle={roleSubtitle(role, catalog.length)}
            />
          ))}
        </ListPanel>
        {selected && draft && saved ? (
          <RoleEditor
            role={selected}
            draft={draft}
            catalog={catalog}
            subtitle={`${section.name} · ${selected.memberCount} ${selected.memberCount === 1 ? 'member' : 'members'}`}
            hint="Everyone with a role in this section can view it and its issues. The permissions below add what they can do."
            deleteBlockedReason={selected.isSystem ? 'Built-in roles cannot be deleted' : undefined}
            canEdit={canEdit}
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

      {canEdit && editor.dirty && selected && (
        <SaveBar
          message={`Changes apply immediately to everyone with this role (${selected.memberCount} in this section) and are saved to the workspace audit log.`}
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
          subtitle={`${section.name} · ${selected.memberCount} ${selected.memberCount === 1 ? 'member' : 'members'}`}
          dateLabel="Added"
          source={membersSource}
          canManage={canEdit}
          removeTitle="Remove from section?"
          removeMessage={(user) => `${user.displayName} will lose their role and access in ${section.name}.`}
          removeLabel="Remove"
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
