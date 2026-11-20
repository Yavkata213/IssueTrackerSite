import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import type { ComponentProps, ReactNode } from 'react';
import type { IssueListItem } from '../../../types';
import { statusDndId } from './dndIds';
import { DragHandleIcon, StatusColumn } from './StatusColumn';

interface SortableIssueCardProps {
  issue: IssueListItem;
  statusId: string;
  /** False when the user lacks the `issue.move` permission. */
  canDrag: boolean;
  /** A click (not a drag) on the card opens the issue. */
  onOpen?: () => void;
  children: ReactNode;
}

/** Makes a card draggable. The whole card is the drag target. */
export function SortableIssueCard({ issue, statusId, canDrag, onOpen, children }: SortableIssueCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: issue.id,
    data: { type: 'issue', statusId },
    disabled: { draggable: !canDrag },
  });

  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{
        flexShrink: 0,
        cursor: canDrag ? 'grab' : onOpen ? 'pointer' : 'default',
        touchAction: canDrag ? 'none' : 'auto',
        opacity: isDragging ? 0.35 : 1,
        outline: 'none',
        '&:focus-visible > div': { outline: '2px solid', outlineColor: 'primary.main' },
      }}
    >
      {children}
    </Box>
  );
}

type SortableStatusColumnProps = Omit<ComponentProps<typeof StatusColumn>, 'dragHandle'> & {
  /** False when the user lacks the `status.reorder` permission. */
  canDrag: boolean;
};

/** Makes a column draggable by its grip, and a drop target for cards. */
export function SortableStatusColumn({ canDrag, ...props }: SortableStatusColumnProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: statusDndId(props.status.id),
      data: { type: 'status', statusId: props.status.id },
      disabled: { draggable: !canDrag },
    });

  return (
    <Box
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      sx={{ height: '100%', flexShrink: 0, opacity: isDragging ? 0.6 : 1 }}
    >
      <StatusColumn
        {...props}
        dragHandle={
          canDrag ? (
            <IconButton
              ref={setActivatorNodeRef}
              size="small"
              aria-label={`Drag ${props.status.name} column`}
              {...attributes}
              {...listeners}
              sx={{ p: 0, borderRadius: 0.5, cursor: 'grab', touchAction: 'none' }}
            >
              <DragHandleIcon />
            </IconButton>
          ) : (
            // Keeps the header aligned when the user may not reorder columns.
            <Box sx={{ width: 16, height: 16, flexShrink: 0 }} />
          )
        }
      />
    </Box>
  );
}
