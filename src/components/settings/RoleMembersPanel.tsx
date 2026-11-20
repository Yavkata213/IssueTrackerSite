import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { getErrorMessage } from '../../api/errors';
import type { RoleMember, User } from '../../types';
import { formatShortDate } from '../../utils/dates';
import { LIMITS } from '../../utils/limits';
import { ConfirmDialog, ErrorToast, LoadError, SidePanel, SidePanelBody, SidePanelHeader, UserAvatar } from '../common';

/** What the panel needs from the page: the four calls behind the list, so one panel serves section and workspace roles. */
export interface RoleMembersSource {
  load: () => Promise<RoleMember[]>;
  loadCandidates: (search: string) => Promise<User[]>;
  add: (user: User) => Promise<RoleMember>;
  remove: (user: User) => Promise<void>;
}

interface RoleMembersPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  /** Label before the date: "Added" for a section, "Joined" for a workspace role. */
  dateLabel: string;
  source: RoleMembersSource;
  /** Without it the list is read-only: no Add member and no remove buttons. */
  canManage: boolean;
  removeTitle: string;
  removeMessage: (user: User) => string;
  removeLabel: string;
  /** Called after a member was added or removed, so the page can refresh its counts. */
  onChanged: () => void;
}

/** "View members" of a role: search, add and remove, in a side panel. */
export function RoleMembersPanel(props: RoleMembersPanelProps) {
  return (
    <SidePanel open={props.open} onClose={props.onClose} width={480} label={props.title}>
      <PanelContent {...props} />
    </SidePanel>
  );
}

function PanelContent({
  onClose,
  title,
  subtitle,
  dateLabel,
  source,
  canManage,
  removeTitle,
  removeMessage,
  removeLabel,
  onChanged,
}: RoleMembersPanelProps) {
  // The panel is mounted when it opens and the role cannot change while it is open.
  const [pinned] = useState(source);
  const [rows, setRows] = useState<RoleMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [search, setSearch] = useState('');
  const [toRemove, setToRemove] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    pinned
      .load()
      .then((result) => {
        if (!cancelled) setRows(result);
      })
      .catch((failure: unknown) => {
        if (!cancelled) setError(getErrorMessage(failure));
      });
    return () => {
      cancelled = true;
    };
  }, [pinned, attempt]);

  const query = search.trim().toLowerCase();
  const visible = (rows ?? []).filter((row) => query === '' || `${row.user.displayName} ${row.user.email}`.toLowerCase().includes(query));
  const count = rows?.length ?? 0;

  const add = (user: User) => {
    setAnchor(null);
    pinned
      .add(user)
      .then((row) => {
        setRows((current) => [...(current ?? []), row]);
        onChanged();
      })
      .catch((failure: unknown) => setNotice(getErrorMessage(failure)));
  };

  const remove = () => {
    if (!toRemove) return;
    setBusy(true);
    pinned
      .remove(toRemove)
      .then(() => {
        const removedId = toRemove.id;
        setRows((current) => (current ?? []).filter((row) => row.user.id !== removedId));
        onChanged();
      })
      .catch((failure: unknown) => setNotice(getErrorMessage(failure)))
      .finally(() => {
        setBusy(false);
        setToRemove(null);
      });
  };

  return (
    <>
      <SidePanelHeader title={title} subtitle={subtitle} onClose={onClose} />
      <SidePanelBody>
        {error ? (
          <LoadError
            message={error}
            onRetry={() => {
              setError(null);
              setAttempt((value) => value + 1);
            }}
          />
        ) : (
          <>
            <Box sx={{ pt: '15px', display: 'flex', gap: 1.5 }}>
              <TextField
                size="small"
                placeholder="Search by name or email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                slotProps={{
                  htmlInput: { 'aria-label': 'Search members', maxLength: LIMITS.memberSearch },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ flex: 1, minWidth: 0, '& .MuiOutlinedInput-root': { height: 40 } }}
              />
              {canManage && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={(event) => setAnchor(event.currentTarget)}
                  sx={{ height: 40, px: '12px', fontWeight: 500, flexShrink: 0 }}
                >
                  Add member
                </Button>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: '23px', mb: '8px' }} aria-live="polite">
              {rows === null ? 'Loading…' : `${count} ${count === 1 ? 'member' : 'members'}`}
            </Typography>
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
              {visible.map((row) => (
                <Box
                  component="li"
                  key={row.user.id}
                  sx={{ height: 68, display: 'flex', alignItems: 'center', gap: 2, borderBottom: 1, borderColor: 'divider' }}
                >
                  <UserAvatar user={row.user} size={40} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" noWrap>
                      {row.user.displayName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {row.user.email}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, mr: '-6px' }}>
                    {dateLabel} {formatShortDate(row.addedAt)}
                  </Typography>
                  {canManage && (
                    <IconButton aria-label={`Remove ${row.user.displayName}`} size="small" onClick={() => setToRemove(row.user)} sx={{ mr: '10px' }}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>
            {rows !== null && visible.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 3 }}>
                {query === '' ? 'Nobody has this role yet.' : 'No members match your search.'}
              </Typography>
            )}
          </>
        )}
      </SidePanelBody>

      <CandidatePicker anchor={anchor} onClose={() => setAnchor(null)} loadCandidates={pinned.loadCandidates} onPick={add} />
      <ConfirmDialog
        open={toRemove !== null}
        title={removeTitle}
        message={toRemove ? removeMessage(toRemove) : ''}
        confirmLabel={removeLabel}
        destructive
        busy={busy}
        onConfirm={remove}
        onClose={() => setToRemove(null)}
      />
      <ErrorToast message={notice} onClose={() => setNotice(null)} />
    </>
  );
}

interface CandidatePickerProps {
  anchor: HTMLElement | null;
  onClose: () => void;
  loadCandidates: (search: string) => Promise<User[]>;
  onPick: (user: User) => void;
}

/** Popover under "Add member": a search field and the people who can be added. */
function CandidatePicker({ anchor, onClose, loadCandidates, onPick }: CandidatePickerProps) {
  return (
    <Popover
      open={anchor !== null}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { width: 360, mt: 0.5 } } }}
    >
      {/* Mounted only while open, so every opening starts with an empty search. */}
      <CandidateList loadCandidates={loadCandidates} onPick={onPick} />
    </Popover>
  );
}

function CandidateList({ loadCandidates, onPick }: Pick<CandidatePickerProps, 'loadCandidates' | 'onPick'>) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [result, setResult] = useState<{ for: string; users: User[] } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 200);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    loadCandidates(debounced)
      .then((users) => {
        if (!cancelled) setResult({ for: debounced, users });
      })
      .catch((error: unknown) => {
        if (!cancelled) setFailure(getErrorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [loadCandidates, debounced]);

  const loading = result === null || result.for !== debounced;
  return (
    <Box sx={{ p: 1.5 }}>
      <TextField
        autoFocus
        fullWidth
        size="small"
        placeholder="Search by name or email"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        slotProps={{ htmlInput: { 'aria-label': 'Find a person to add', maxLength: LIMITS.memberSearch } }}
      />
      <Box component="ul" sx={{ listStyle: 'none', m: 0, mt: 1, p: 0, maxHeight: 320, overflowY: 'auto' }}>
        {(result?.users ?? []).map((user) => (
          <li key={user.id}>
            <ButtonBase onClick={() => onPick(user)} sx={{ width: '100%', p: 1, gap: 1.5, justifyContent: 'flex-start', textAlign: 'left', borderRadius: 1 }}>
              <UserAvatar user={user} size={32} />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                  {user.displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap component="div">
                  {user.email}
                </Typography>
              </Box>
            </ButtonBase>
          </li>
        ))}
      </Box>
      {failure && (
        <Typography variant="caption" color="error" role="alert" component="div" sx={{ p: 1 }}>
          {failure}
        </Typography>
      )}
      {!failure && loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
          <CircularProgress size={20} />
        </Box>
      )}
      {!failure && !loading && result?.users.length === 0 && (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ p: 1 }}>
          No one to add.
        </Typography>
      )}
    </Box>
  );
}
