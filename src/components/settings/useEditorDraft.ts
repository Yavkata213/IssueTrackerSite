import { useState } from 'react';

interface UseEditorDraftOptions<T extends { id: string }, D extends object> {
  items: T[];
  /** The editable copy of an item (what the form shows). */
  toDraft: (item: T) => D;
  isEqual: (a: D, b: D) => boolean;
}

/**
 * Selection plus an unsaved draft for a list + editor layout (roles, categories).
 * The draft is kept per selected item and is derived, not copied in an effect: with no edit
 * the form shows the saved item. Selecting another item while the draft is dirty is held back
 * (`pendingId`) until the page confirms.
 */
export function useEditorDraft<T extends { id: string }, D extends object>({
  items,
  toDraft,
  isEqual,
}: UseEditorDraftOptions<T, D>) {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);
  const [edit, setEdit] = useState<{ id: string; value: D } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const saved = selected ? toDraft(selected) : undefined;
  const hasEdit = edit !== null && selected !== undefined && edit.id === selected.id;
  const draft = hasEdit ? edit.value : saved;
  const dirty = hasEdit && saved !== undefined && !isEqual(edit.value, saved);

  const select = (id: string) => {
    setSelectedId(id);
    setEdit(null);
    setPendingId(null);
  };

  return {
    selected,
    saved,
    draft,
    dirty,
    update: (patch: Partial<D>) => {
      if (selected && draft) setEdit({ id: selected.id, value: { ...draft, ...patch } });
    },
    /** Back to the saved values. */
    discard: () => setEdit(null),
    select,
    /** Selects at once, or asks first when the draft has unsaved changes. */
    requestSelect: (id: string) => {
      if (id === selected?.id) return;
      if (dirty) setPendingId(id);
      else select(id);
    },
    pendingId,
    cancelPending: () => setPendingId(null),
  };
}
