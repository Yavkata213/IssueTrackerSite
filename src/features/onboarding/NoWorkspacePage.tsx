import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { acceptMyInvitation, getErrorMessage, listMyInvitations } from '../../api';
import { useAuth } from '../../app/authContext';
import { AuthLayout, ErrorToast, WorkspaceLogo } from '../../components/common';
import type { MyInvitation } from '../../types';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';

interface NoWorkspacePageProps {
  /** Called with the id of the workspace the person joined or created. */
  onEntered: (workspaceId: string) => void;
}

/**
 * Shown to a signed-in person who belongs to no workspace: join one they were invited to, or
 * create their own.
 */
export function NoWorkspacePage({ onEntered }: NoWorkspacePageProps) {
  const { user, signOut } = useAuth();
  const [invitations, setInvitations] = useState<MyInvitation[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyInvitations()
      .then((result) => {
        if (!cancelled) setInvitations(result);
      })
      .catch(() => {
        if (!cancelled) setInvitations([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const join = (invitation: MyInvitation) => {
    if (joiningId) return;
    setJoiningId(invitation.id);
    acceptMyInvitation(invitation.id)
      .then((result) => onEntered(result.workspaceId))
      .catch((error: unknown) => {
        setNotice(getErrorMessage(error));
        setJoiningId(null);
      });
  };

  return (
    <AuthLayout
      title={`Welcome${user ? `, ${user.displayName.split(' ')[0]}` : ''}`}
      subtitle="You are not in a workspace yet. Join one you were invited to, or start your own."
      footer={
        <Button onClick={() => void signOut()} sx={{ fontWeight: 400 }}>
          Sign out
        </Button>
      }
    >
      {invitations !== null && invitations.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 500, mb: 1.5 }}>
            Invitations for you
          </Typography>
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {invitations.map((invitation) => (
              <Box
                component="li"
                key={invitation.id}
                sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}
              >
                <WorkspaceLogo workspace={{ name: invitation.workspaceName, logoUrl: invitation.workspaceLogoUrl }} size={40} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                    {invitation.workspaceName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="div">
                    {invitation.roleName}
                    {invitation.invitedByName ? ` · invited by ${invitation.invitedByName}` : ''}
                  </Typography>
                </Box>
                <Button variant="contained" size="small" disabled={joiningId !== null} onClick={() => join(invitation)}>
                  {joiningId === invitation.id ? 'Joining…' : 'Join'}
                </Button>
              </Box>
            ))}
          </Box>
          <Divider sx={{ mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              or
            </Typography>
          </Divider>
        </Box>
      )}
      <Button variant={invitations && invitations.length > 0 ? 'outlined' : 'contained'} size="large" fullWidth onClick={() => setCreating(true)} sx={{ height: 44, fontWeight: 500 }}>
        Create a workspace
      </Button>
      <CreateWorkspaceDialog open={creating} onClose={() => setCreating(false)} onCreated={onEntered} />
      <ErrorToast message={notice} onClose={() => setNotice(null)} />
    </AuthLayout>
  );
}
