import type { IssueListItem } from '../../types';
import { isOverdue } from '../../utils/dates';

export interface IssueFilterState {
  search: string;
  onlyMine: boolean;
  overdueOnly: boolean;
}

export const EMPTY_FILTERS: IssueFilterState = { search: '', onlyMine: false, overdueOnly: false };

/** Display id of an issue: section key + number, e.g. `IT-152`. */
export function formatIssueId(sectionKey: string, number: number): string {
  return `${sectionKey}-${number}`;
}

export function filterIssues(
  issues: IssueListItem[],
  filters: IssueFilterState,
  sectionKey: string,
  currentUserId: string,
): IssueListItem[] {
  const query = filters.search.trim().toLowerCase();
  return issues.filter((issue) => {
    if (filters.onlyMine && !issue.assigneeIds.includes(currentUserId)) return false;
    if (filters.overdueOnly && !isOverdue(issue)) return false;
    if (query) {
      const id = formatIssueId(sectionKey, issue.number).toLowerCase();
      if (!issue.title.toLowerCase().includes(query) && !id.includes(query)) return false;
    }
    return true;
  });
}
