import AddIcon from '@mui/icons-material/Add';
import {
  closestCenter,
  DndContext,
  DragOverlay,
  getFirstCollision,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { useCallback, useMemo, useRef, useState } from 'react';
import { thinScrollbar } from '../../../theme';
import type { Category, IssueListItem, Status, User } from '../../../types';
import { formatIssueId } from '../filters';
import { IssueCard } from './IssueCard';
import { statusDndId } from './dndIds';
import { SortableIssueCard, SortableStatusColumn } from './sortables';
import { COLUMN_WIDTH } from './StatusColumn';

const POSITION_STEP = 1000;

type ItemsByStatus = Record<string, string[]>;

interface DragState {
  activeType: 'issue' | 'status';
  activeId: string;
  items: ItemsByStatus;
}

interface BoardViewProps {
  sectionKey: string;
  /** Columns in display order. */
  statuses: Status[];
  /** Issues to show (already filtered). */
  issues: IssueListItem[];
  categoriesById: Map<string, Category>;
  usersById: Map<string, User>;
  /** Permission `issue.move`. Without it cards cannot be dragged. */
  canMoveIssues: boolean;
  /** Permission `status.reorder`. Without it columns cannot be dragged or moved. */
  canReorderStatuses: boolean;
  onMoveIssue: (issueId: string, statusId: string, boardPosition: number) => void;
  /** A click on a card opens the issue. */
  onOpenIssue: (issueId: string) => void;
  /** Called with the full new column order. */
  onReorderStatuses: (orderedStatusIds: string[]) => void;
}

function buildItems(statuses: Status[], issues: IssueListItem[]): ItemsByStatus {
  const items: ItemsByStatus = {};
  for (const status of statuses) items[status.id] = [];
  const sorted = [...issues].sort((a, b) => a.boardPosition - b.boardPosition);
  for (const issue of sorted) items[issue.statusId]?.push(issue.id);
  return items;
}

function findContainer(id: UniqueIdentifier, items: ItemsByStatus): string | undefined {
  const raw = String(id);
  if (raw in items) return raw;
  if (raw.startsWith('status:') && raw.slice(7) in items) return raw.slice(7);
  return Object.keys(items).find((statusId) => items[statusId].includes(raw));
}

/** Board position that places an issue between its new neighbours. */
function positionBetween(prev: number | undefined, next: number | undefined): number {
  if (prev !== undefined && next !== undefined) return (prev + next) / 2;
  if (prev !== undefined) return prev + POSITION_STEP;
  if (next !== undefined) return next - POSITION_STEP;
  return POSITION_STEP;
}

export function BoardView({
  sectionKey,
  statuses,
  issues,
  categoriesById,
  usersById,
  canMoveIssues,
  canReorderStatuses,
  onMoveIssue,
  onOpenIssue,
  onReorderStatuses,
}: BoardViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const baseItems = useMemo(() => buildItems(statuses, issues), [statuses, issues]);
  const issuesById = useMemo(() => new Map(issues.map((issue) => [issue.id, issue])), [issues]);
  const order = useMemo(() => statuses.map((status) => status.id), [statuses]);

  // While dragging, the moving card is tracked in local state; otherwise everything comes from props.
  const [drag, setDrag] = useState<DragState | null>(null);
  const items = drag?.items ?? baseItems;
  const lastOverId = useRef<UniqueIdentifier | null>(null);

  const collisionDetection = useCallback<CollisionDetection>((args) => {
    if (args.active.data.current?.type === 'status') {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((c) => c.data.current?.type === 'status'),
      });
    }

    const pointerCollisions = pointerWithin(args);
    const collisions = pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
    let overId = getFirstCollision(collisions, 'id');

    if (overId !== null && overId !== undefined) {
      const overContainer = args.droppableContainers.find((c) => c.id === overId);
      if (overContainer?.data.current?.type === 'status') {
        const columnId = String(overContainer.data.current.statusId);
        const cardsInColumn = args.droppableContainers.filter(
          (c) => c.data.current?.type === 'issue' && c.data.current.statusId === columnId,
        );
        if (cardsInColumn.length > 0) {
          overId =
            closestCenter({ ...args, droppableContainers: cardsInColumn })[0]?.id ?? overId;
        }
      }
      lastOverId.current = overId;
      return [{ id: overId }];
    }
    return lastOverId.current !== null ? [{ id: lastOverId.current }] : [];
  }, []);

  const handleDragStart = ({ active }: DragStartEvent) => {
    const type = active.data.current?.type === 'status' ? 'status' : 'issue';
    const activeId = type === 'status' ? String(active.id).slice(7) : String(active.id);
    setDrag({ activeType: type, activeId, items: baseItems });
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!drag || drag.activeType !== 'issue' || !over) return;
    const activeContainer = findContainer(active.id, drag.items);
    const overContainer = findContainer(over.id, drag.items);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    const activeId = String(active.id);
    const overItems = drag.items[overContainer];
    const overIsColumn = String(over.id).startsWith('status:');
    let newIndex = overItems.length;
    if (!overIsColumn) {
      const overIndex = overItems.indexOf(String(over.id));
      const translated = active.rect.current.translated;
      const isBelow = translated !== null && translated.top > over.rect.top + over.rect.height;
      newIndex = overIndex >= 0 ? overIndex + (isBelow ? 1 : 0) : overItems.length;
    }

    setDrag({
      ...drag,
      items: {
        ...drag.items,
        [activeContainer]: drag.items[activeContainer].filter((id) => id !== activeId),
        [overContainer]: [...overItems.slice(0, newIndex), activeId, ...overItems.slice(newIndex)],
      },
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const state = drag;
    setDrag(null);
    lastOverId.current = null;
    if (!state || !over) return;

    if (state.activeType === 'status') {
      if (!canReorderStatuses) return;
      const from = order.indexOf(state.activeId);
      const to = order.indexOf(String(over.id).replace(/^status:/, ''));
      if (from >= 0 && to >= 0 && from !== to) onReorderStatuses(arrayMove(order, from, to));
      return;
    }

    if (!canMoveIssues) return;
    const activeId = String(active.id);
    const container = findContainer(activeId, state.items);
    const overContainer = findContainer(over.id, state.items);
    if (!container || container !== overContainer) return;

    let finalIds = state.items[container];
    if (!String(over.id).startsWith('status:')) {
      const from = finalIds.indexOf(activeId);
      const to = finalIds.indexOf(String(over.id));
      if (from >= 0 && to >= 0 && from !== to) finalIds = arrayMove(finalIds, from, to);
    }

    const index = finalIds.indexOf(activeId);
    const original = issuesById.get(activeId);
    const unchanged =
      original?.statusId === container && baseItems[container]?.[index] === activeId;
    if (unchanged) return;

    const prev = issuesById.get(finalIds[index - 1])?.boardPosition;
    const next = issuesById.get(finalIds[index + 1])?.boardPosition;
    onMoveIssue(activeId, container, positionBetween(prev, next));
  };

  const activeIssue = drag?.activeType === 'issue' ? issuesById.get(drag.activeId) : undefined;

  const renderCard = (issue: IssueListItem) => (
    <IssueCard
      issue={issue}
      issueKey={formatIssueId(sectionKey, issue.number)}
      // Categories switched off with "Show on board cards" (section settings) stay off the cards.
      categories={issue.categoryIds.flatMap((id) => {
        const category = categoriesById.get(id);
        return category?.showOnCards ? [category] : [];
      })}
      assignees={issue.assigneeIds.flatMap((id) => usersById.get(id) ?? [])}
    />
  );

  const moveStatus = (statusId: string, delta: -1 | 1) => {
    if (!canReorderStatuses) return;
    const from = order.indexOf(statusId);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= order.length) return;
    onReorderStatuses(arrayMove(order, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDrag(null);
        lastOverId.current = null;
      }}
    >
      <Box
        sx={[
          {
            flex: 1,
            minHeight: 0,
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            overflowY: 'hidden',
            pb: '7px',
          },
          thinScrollbar,
        ]}
      >
        <SortableContext items={order.map(statusDndId)} strategy={horizontalListSortingStrategy}>
          {statuses.map((status, index) => {
            const ids = items[status.id] ?? [];
            return (
              <SortableStatusColumn
                key={status.id}
                status={status}
                count={ids.length}
                canDrag={canReorderStatuses}
                canMoveLeft={canReorderStatuses && index > 0}
                canMoveRight={canReorderStatuses && index < statuses.length - 1}
                onMoveLeft={() => moveStatus(status.id, -1)}
                onMoveRight={() => moveStatus(status.id, 1)}
              >
                <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                  {ids.map((id) => {
                    const issue = issuesById.get(id);
                    return issue ? (
                      <SortableIssueCard key={id} issue={issue} statusId={status.id} canDrag={canMoveIssues} onOpen={() => onOpenIssue(id)}>
                        {renderCard(issue)}
                      </SortableIssueCard>
                    ) : null;
                  })}
                </SortableContext>
              </SortableStatusColumn>
            );
          })}
        </SortableContext>
        <ButtonBase
          sx={{
            width: COLUMN_WIDTH,
            height: 'calc(100% - 0px)',
            flexShrink: 0,
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            p: '12px 16px',
            gap: 1,
            color: 'primary.main',
            fontSize: 14,
            border: '1px dashed',
            borderColor: 'text.disabled',
            borderRadius: 2,
          }}
        >
          <AddIcon />
          Add status
        </ButtonBase>
      </Box>
      <DragOverlay>
        {activeIssue ? (
          <Box sx={{ width: COLUMN_WIDTH - 32, cursor: 'grabbing', boxShadow: 4, borderRadius: 2 }}>
            {renderCard(activeIssue)}
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
