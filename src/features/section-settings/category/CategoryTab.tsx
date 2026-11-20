import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { ApiError, createCategory, deleteCategory, getErrorMessage, updateCategory } from '../../../api';
import { ConfirmDialog, SaveBar } from '../../../components/common';
import type { CategoryDetail, Section } from '../../../types';
import { isHexColor, safeColor } from '../../../utils/colors';
import { EditorCard, ListPanel, ListPanelItem, useEditorDraft } from '../../../components/settings';
import type { PatchSettingsData } from '../types';
import { CategoryEditor } from './CategoryEditor';
import type { CategoryDraft } from './CategoryEditor';

function toDraft(category: CategoryDetail): CategoryDraft {
  return {
    name: category.name,
    description: category.description ?? '',
    color: category.color ?? '',
    showOnCards: category.showOnCards,
    isArchived: category.isArchived,
  };
}

function isSame(a: CategoryDraft, b: CategoryDraft): boolean {
  return (
    a.name === b.name &&
    a.description === b.description &&
    a.color.toLowerCase() === b.color.toLowerCase() &&
    a.showOnCards === b.showOnCards &&
    a.isArchived === b.isArchived
  );
}

function uniqueName(base: string, taken: string[]): string {
  const lower = new Set(taken.map((name) => name.toLowerCase()));
  if (!lower.has(base.toLowerCase())) return base;
  let n = 2;
  while (lower.has(`${base} ${n}`.toLowerCase())) n += 1;
  return `${base} ${n}`;
}

function issuesLabel(count: number): string {
  return `${count} ${count === 1 ? 'issue' : 'issues'}`;
}

interface CategoryTabProps {
  workspaceId: string;
  section: Section;
  categories: CategoryDetail[];
  canEdit: boolean;
  patchData: PatchSettingsData;
  onNotice: (message: string) => void;
}

/** Categories of the section: list on the left, editor on the right. */
export function CategoryTab({ workspaceId, section, categories, canEdit, patchData, onNotice }: CategoryTabProps) {
  const { palette } = useTheme();
  const editor = useEditorDraft({ items: categories, toDraft, isEqual: isSame });
  const [nameError, setNameError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const { selected, draft } = editor;

  const save = () => {
    if (!selected || !draft || saving) return;
    if (draft.name.trim() === '') {
      setNameError('Name is required.');
      return;
    }
    if (!isHexColor(draft.color)) return;
    setSaving(true);
    updateCategory(workspaceId, section.id, selected.id, draft)
      .then((category) => {
        patchData((data) => ({ ...data, categories: data.categories.map((c) => (c.id === category.id ? category : c)) }));
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
      onNotice('Save or discard your changes before adding a category.');
      return;
    }
    createCategory(workspaceId, section.id, {
      name: uniqueName('New category', categories.map((c) => c.name)),
      description: '',
      color: palette.categoryColors[0] ?? '#0277BD',
      showOnCards: true,
      isArchived: false,
    })
      .then((category) => {
        patchData((data) => ({ ...data, categories: [...data.categories, category] }));
        editor.select(category.id);
      })
      .catch((error: unknown) => onNotice(getErrorMessage(error)));
  };

  const remove = () => {
    if (!selected) return;
    setBusy(true);
    deleteCategory(workspaceId, section.id, selected.id)
      .then(() => {
        patchData((data) => ({ ...data, categories: data.categories.filter((c) => c.id !== selected.id) }));
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
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 2, pt: 3, pb: 3 }}>
        <ListPanel
          title={`Categories in ${section.name}`}
          addLabel="Add category"
          addStyle="plain"
          onAdd={canEdit ? add : undefined}
          footer="Categories are shared by all members of this section. Archived categories stay on existing issues."
        >
          {categories.map((category) => (
            <ListPanelItem
              key={category.id}
              selected={category.id === selected?.id}
              onSelect={() => {
                setNameError(undefined);
                editor.requestSelect(category.id);
              }}
              leading={
                <Box
                  aria-hidden
                  sx={{ width: 12, height: 12, ml: 0.5, flexShrink: 0, borderRadius: '50%', bgcolor: safeColor(category.color, palette.grey[700]) }}
                />
              }
              title={category.name}
              subtitle={`${issuesLabel(category.issueCount)}${category.isArchived ? ' · Archived' : ''}`}
            />
          ))}
        </ListPanel>
        {selected && draft ? (
          <CategoryEditor
            category={selected}
            draft={draft}
            sectionName={section.name}
            canEdit={canEdit}
            nameError={nameError}
            onChange={(patch) => {
              setNameError(undefined);
              editor.update(patch);
            }}
            onDelete={() => setConfirmDelete(true)}
          />
        ) : (
          <EditorCard>{null}</EditorCard>
        )}
      </Box>

      {canEdit && editor.dirty && selected && (
        <SaveBar
          message={`Changes apply to ${issuesLabel(selected.issueCount)} and are saved to the workspace audit log.`}
          onDiscard={() => {
            setNameError(undefined);
            editor.discard();
          }}
          onSave={save}
          saving={saving}
          saveDisabled={draft !== undefined && !isHexColor(draft.color)}
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete category?"
        message={`The category “${selected?.name ?? ''}” will be removed from ${selected ? issuesLabel(selected.issueCount) : 'its issues'}. To keep it on existing issues, archive it instead. This cannot be undone.`}
        confirmLabel="Delete category"
        destructive
        busy={busy}
        onConfirm={remove}
        onClose={() => setConfirmDelete(false)}
      />
      <ConfirmDialog
        open={editor.pendingId !== null}
        title="Discard unsaved changes?"
        message="Your changes to this category will be lost."
        confirmLabel="Discard"
        onConfirm={() => {
          if (editor.pendingId) editor.select(editor.pendingId);
        }}
        onClose={editor.cancelPending}
      />
    </>
  );
}
